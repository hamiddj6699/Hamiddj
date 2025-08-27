/**
 * سرویس صدور کارت کامل
 * Complete Card Issuance Service
 */

const CardNumberGenerator = require('../utils/cardNumberGenerator');
const SecurePINGenerator = require('../utils/securePINGenerator');
const MockHSMClient = require('./mockHSMClient');
const crypto = require('crypto');

class CompleteCardIssuance {
  constructor(config = {}) {
    this.config = config;
    this.cardGenerator = new CardNumberGenerator();
    this.pinGenerator = new SecurePINGenerator();
    this.hsmClient = new MockHSMClient(config.hsm);
    
    this.issuedCards = new Map();
    this.operationLog = [];
  }

  async initialize() {
    try {
      console.log('🚀 راه‌اندازی سرویس صدور کارت...');
      
      // راه‌اندازی HSM
      await this.hsmClient.initializeSession();
      
      console.log('✅ سرویس صدور کارت راه‌اندازی شد');
      return true;
    } catch (error) {
      console.error('❌ خطا در راه‌اندازی سرویس صدور کارت:', error);
      throw error;
    }
  }

  async issueCompleteCard(customerData, accountData, cardType = 'DEBIT', options = {}) {
    try {
      console.log('📋 شروع صدور کارت کامل...');
      
      // مرحله 1: تولید شماره کارت
      const cardNumber = await this.generateCardNumber(customerData, accountData, cardType);
      
      // مرحله 2: تولید PIN
      const pin = await this.generateCardPIN(cardNumber, cardType, options);
      
      // مرحله 3: تولید CVV2
      const cvv2 = await this.generateCVV2(cardNumber, options);
      
      // مرحله 4: تولید تراشه EMV
      const emvChip = await this.generateEMVChip(cardNumber, options);
      
      // مرحله 5: تولید کلیدهای امنیتی
      const securityKeys = await this.generateSecurityKeys(cardNumber, options);
      
      // مرحله 6: تولید امضای دیجیتال
      const digitalSignature = await this.generateDigitalSignature(cardNumber, options);
      
      // مرحله 7: تولید Track Data
      const trackData = this.generateTrackData(cardNumber, customerData, options);
      
      // مرحله 8: ایجاد کارت کامل
      const completeCard = this.createCompleteCard({
        cardNumber,
        pin,
        cvv2,
        emvChip,
        securityKeys,
        digitalSignature,
        trackData,
        customerData,
        accountData,
        cardType,
        options
      });
      
      // مرحله 9: ثبت کارت
      await this.registerCard(completeCard);
      
      // مرحله 10: لاگ عملیات
      this.logOperation('CARD_ISSUED', completeCard);
      
      console.log('✅ کارت کامل با موفقیت صادر شد');
      return completeCard;
      
    } catch (error) {
      console.error('❌ خطا در صدور کارت:', error);
      this.logOperation('CARD_ISSUANCE_FAILED', { error: error.message });
      throw error;
    }
  }

  async generateCardNumber(customerData, accountData, cardType) {
    try {
      // انتخاب BIN بر اساس نوع کارت و بانک
      const binProfile = this.selectBINProfile(cardType, accountData.bankCode);
      
      // تولید شماره کارت
      const cardResult = this.cardGenerator.generateCardNumber(binProfile, {
        accountNumber: accountData.accountNumber
      });
      
      return cardResult;
    } catch (error) {
      throw new Error(`خطا در تولید شماره کارت: ${error.message}`);
    }
  }

  async generateCardPIN(cardNumber, cardType, options) {
    try {
      // تنظیم سیاست PIN بر اساس نوع کارت
      const pinPolicy = this.getPINPolicy(cardType);
      
      // تولید PIN
      const pinResult = this.pinGenerator.generateCardPIN(cardNumber.cardNumber, cardType, {
        ...pinPolicy,
        ...options.pin
      });
      
      return pinResult;
    } catch (error) {
      throw new Error(`خطا در تولید PIN: ${error.message}`);
    }
  }

  async generateCVV2(cardNumber, options) {
    try {
      const expiryDate = options.expiryDate || this.generateExpiryDate();
      const serviceCode = options.serviceCode || '000';
      
      const cvv2Result = await this.hsmClient.generateCvv2({
        cardNumber: cardNumber.cardNumber,
        expiryDate: expiryDate,
        serviceCode: serviceCode
      });
      
      return {
        ...cvv2Result,
        expiryDate,
        serviceCode
      };
    } catch (error) {
      throw new Error(`خطا در تولید CVV2: ${error.message}`);
    }
  }

  async generateEMVChip(cardNumber, options) {
    try {
      const aid = options.aid || 'A0000002480200';
      
      const emvResult = await this.hsmClient.generateEmvChip({
        cardNumber: cardNumber.cardNumber,
        aid: aid
      });
      
      return emvResult;
    } catch (error) {
      throw new Error(`خطا در تولید تراشه EMV: ${error.message}`);
    }
  }

  async generateSecurityKeys(cardNumber, options) {
    try {
      const keyType = options.keyType || 'EMV';
      
      const keysResult = await this.hsmClient.generateCardKeys({
        cardNumber: cardNumber.cardNumber,
        keyType: keyType
      });
      
      return keysResult;
    } catch (error) {
      throw new Error(`خطا در تولید کلیدهای امنیتی: ${error.message}`);
    }
  }

  async generateDigitalSignature(cardNumber, options) {
    try {
      const data = cardNumber.cardNumber + new Date().toISOString();
      const keyLabel = options.signatureKey || 'ZMK_MASTER';
      
      const signatureResult = await this.hsmClient.generateDigitalSignature(data, keyLabel);
      
      return signatureResult;
    } catch (error) {
      throw new Error(`خطا در تولید امضای دیجیتال: ${error.message}`);
    }
  }

  generateTrackData(cardNumber, customerData, options) {
    try {
      const expiryDate = options.expiryDate || this.generateExpiryDate();
      const serviceCode = options.serviceCode || '000';
      
      // Track 1 (ISO 7813)
      const track1 = this.generateTrack1(cardNumber, customerData, expiryDate, serviceCode);
      
      // Track 2 (ISO 7813)
      const track2 = this.generateTrack2(cardNumber, expiryDate, serviceCode);
      
      return {
        track1,
        track2,
        expiryDate,
        serviceCode
      };
    } catch (error) {
      throw new Error(`خطا در تولید Track Data: ${error.message}`);
    }
  }

  generateTrack1(cardNumber, customerData, expiryDate, serviceCode) {
    const format = 'B';
    const cardNumberStr = cardNumber.cardNumber;
    const name = customerData.fullName || 'CUSTOMER/NAME';
    const expiry = expiryDate.replace('/', '');
    
    // Track 1: B + Card Number + ^ + Name + ^ + Expiry + Service Code + Discretionary Data
    const track1 = `${format}${cardNumberStr}^${name}^${expiry}${serviceCode}`;
    
    return track1;
  }

  generateTrack2(cardNumber, expiryDate, serviceCode) {
    const cardNumberStr = cardNumber.cardNumber;
    const expiry = expiryDate.replace('/', '');
    
    // Track 2: Card Number + = + Expiry + Service Code + Discretionary Data
    const track2 = `${cardNumberStr}=${expiry}${serviceCode}`;
    
    return track2;
  }

  createCompleteCard(data) {
    const card = {
      // اطلاعات اصلی
      cardNumber: data.cardNumber.cardNumber,
      formattedCardNumber: data.cardNumber.formatted,
      bin: data.cardNumber.bin,
      accountNumber: data.cardNumber.accountNumber,
      
      // اطلاعات امنیتی
      pin: data.pin.pin,
      maskedPin: data.pin.maskedPin,
      cvv2: data.cvv2.cvv2,
      
      // اطلاعات EMV
      emvChip: data.emvChip.emvData,
      
      // اطلاعات امنیتی
      securityKeys: data.securityKeys.keys,
      digitalSignature: data.digitalSignature.signature,
      
      // Track Data
      track1: data.trackData.track1,
      track2: data.trackData.track2,
      
      // اطلاعات کارت
      cardType: data.cardType,
      network: this.getNetworkInfo(data.cardType),
      internationalScheme: this.getInternationalScheme(data.cardType),
      
      // تاریخ‌ها
      issuedAt: new Date(),
      validFrom: new Date(),
      validTo: new Date(data.trackData.expiryDate),
      expiryDate: data.trackData.expiryDate,
      
      // وضعیت
      status: 'ACTIVE',
      isActive: true,
      
      // اطلاعات مشتری
      customerData: data.customerData,
      accountData: data.accountData,
      
      // متادیتا
      metadata: {
        generatedBy: 'CompleteCardIssuance',
        version: '1.0.0',
        timestamp: new Date()
      }
    };
    
    return card;
  }

  async registerCard(card) {
    try {
      // ثبت کارت در حافظه (در نسخه واقعی در پایگاه داده)
      this.issuedCards.set(card.cardNumber, card);
      
      return {
        success: true,
        cardNumber: card.cardNumber,
        registeredAt: new Date()
      };
    } catch (error) {
      throw new Error(`خطا در ثبت کارت: ${error.message}`);
    }
  }

  selectBINProfile(cardType, bankCode) {
    // انتخاب BIN بر اساس نوع کارت و بانک
    const binProfiles = {
      'DEBIT': {
        '010': { bin_range: '603799-603799', bank_code: '010' }, // بانک ملی
        '020': { bin_range: '603769-603769', bank_code: '020' }, // بانک صادرات
        '054': { bin_range: '622106-622106', bank_code: '054' }  // بانک پارسیان
      },
      'CREDIT': {
        '010': { bin_range: '603799-603799', bank_code: '010' },
        '020': { bin_range: '603769-603769', bank_code: '020' },
        '054': { bin_range: '622106-622106', bank_code: '054' }
      }
    };
    
    return binProfiles[cardType]?.[bankCode] || binProfiles['DEBIT']['010'];
  }

  getPINPolicy(cardType) {
    const policies = {
      'DEBIT': {
        length: 4,
        maxAttempts: 3,
        lockoutDuration: 24
      },
      'CREDIT': {
        length: 4,
        maxAttempts: 3,
        lockoutDuration: 48
      },
      'BUSINESS': {
        length: 6,
        maxAttempts: 3,
        lockoutDuration: 24
      }
    };
    
    return policies[cardType] || policies['DEBIT'];
  }

  getNetworkInfo(cardType) {
    return 'SHETAB'; // شبکه پرداخت ایران
  }

  getInternationalScheme(cardType) {
    const schemes = {
      'DEBIT': 'VISA',
      'CREDIT': 'MASTERCARD',
      'BUSINESS': 'VISA'
    };
    
    return schemes[cardType] || 'VISA';
  }

  generateExpiryDate() {
    const now = new Date();
    const expiryYear = now.getFullYear() + 4;
    const expiryMonth = now.getMonth() + 1;
    return `${expiryMonth.toString().padStart(2, '0')}/${expiryYear}`;
  }

  logOperation(operationType, data) {
    const logEntry = {
      operationType,
      data,
      timestamp: new Date(),
      operatorId: 'SYSTEM',
      result: 'SUCCESS'
    };
    
    this.operationLog.push(logEntry);
    
    if (this.operationLog.length > 1000) {
      this.operationLog = this.operationLog.slice(-1000);
    }
  }

  async getCard(cardNumber) {
    return this.issuedCards.get(cardNumber);
  }

  async getAllCards() {
    return Array.from(this.issuedCards.values());
  }

  async getOperationLog() {
    return this.operationLog;
  }

  async closeService() {
    try {
      await this.hsmClient.closeSession();
      console.log('✅ سرویس صدور کارت بسته شد');
    } catch (error) {
      console.error('❌ خطا در بستن سرویس:', error);
    }
  }
}

module.exports = CompleteCardIssuance;