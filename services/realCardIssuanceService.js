/**
 * سرویس صدور کارت واقعی
 * Real Card Issuance Service
 */

const RealCard = require('../models/RealCard');
const MockHSMClient = require('./mockHSMClient');
const crypto = require('crypto');
const yaml = require('js-yaml');
const fs = require('fs');

class RealCardIssuanceService {
  constructor(config = {}) {
    this.config = config;
    this.hsmClient = new MockHSMClient(config.hsm);
    this.binProfiles = this.loadBinProfiles();
    this.emvProfiles = this.loadEmvProfiles();
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🚀 راه‌اندازی سرویس صدور کارت واقعی...');
      
      // راه‌اندازی HSM
      await this.hsmClient.initializeSession();
      
      // بارگذاری پروفایل‌ها
      await this.loadProfiles();
      
      this.initialized = true;
      console.log('✅ سرویس صدور کارت واقعی راه‌اندازی شد');
      
      return true;
    } catch (error) {
      console.error('❌ خطا در راه‌اندازی سرویس صدور کارت واقعی:', error);
      throw error;
    }
  }

  async loadProfiles() {
    try {
      // بارگذاری پروفایل‌های BIN
      this.binProfiles = this.loadBinProfiles();
      
      // بارگذاری پروفایل‌های EMV
      this.emvProfiles = this.loadEmvProfiles();
      
      console.log(`✅ ${this.binProfiles.length} پروفایل BIN بارگذاری شد`);
      console.log(`✅ ${this.emvProfiles.length} پروفایل EMV بارگذاری شد`);
      
    } catch (error) {
      console.error('❌ خطا در بارگذاری پروفایل‌ها:', error);
      throw error;
    }
  }

  loadBinProfiles() {
    try {
      const configPath = this.config.configFiles?.binProfilesPath || './config/bin-profiles.yaml';
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(fileContent);
      return config.bin_profiles || [];
    } catch (error) {
      console.warn('⚠️ خطا در بارگذاری پروفایل‌های BIN، استفاده از پروفایل‌های پیش‌فرض');
      return this.getDefaultBinProfiles();
    }
  }

  loadEmvProfiles() {
    try {
      const configPath = this.config.configFiles?.emvProfilesPath || './config/emv-profiles.yaml';
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(fileContent);
      return config.emv_profiles || [];
    } catch (error) {
      console.warn('⚠️ خطا در بارگذاری پروفایل‌های EMV، استفاده از پروفایل‌های پیش‌فرض');
      return this.getDefaultEmvProfiles();
    }
  }

  getDefaultBinProfiles() {
    return [
      {
        issuer_name: "بانک ملی ایران",
        bin_range: "603799-603799",
        bank_code: "010",
        product_type: "DEBIT",
        domestic_network: "SHETAB",
        international_scheme: "VISA",
        card_level: "CLASSIC"
      },
      {
        issuer_name: "بانک صادرات ایران",
        bin_range: "603769-603769",
        bank_code: "020",
        product_type: "DEBIT",
        domestic_network: "SHETAB",
        international_scheme: "MASTERCARD",
        card_level: "CLASSIC"
      },
      {
        issuer_name: "بانک پارسیان",
        bin_range: "622106-622106",
        bank_code: "054",
        product_type: "DEBIT",
        domestic_network: "SHETAB",
        international_scheme: "VISA",
        card_level: "GOLD"
      }
    ];
  }

  getDefaultEmvProfiles() {
    return [
      {
        profile_id: "IRAN_DEBIT_STANDARD_V1",
        aid: "A0000002480200",
        application_label: "IRAN DEBIT",
        currency_code: "364",
        country_code: "IR",
        language_code: "FA"
      },
      {
        profile_id: "IRAN_CREDIT_STANDARD_V1",
        aid: "A0000002480201",
        application_label: "IRAN CREDIT",
        currency_code: "364",
        country_code: "IR",
        language_code: "FA"
      }
    ];
  }

  async issueRealCard(customerData, accountData, cardType, options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('سرویس هنوز راه‌اندازی نشده است');
      }

      console.log('📋 شروع صدور کارت واقعی...');
      
      // مرحله 1: اعتبارسنجی ورودی
      this.validateInput(customerData, accountData, cardType);
      
      // مرحله 2: انتخاب پروفایل BIN
      const binProfile = this.selectBinProfile(cardType, accountData.bankCode);
      
      // مرحله 3: تولید شماره کارت
      const cardNumber = this.generateCardNumber(binProfile);
      
      // مرحله 4: تولید PIN
      const pin = await this.generatePin(cardNumber, cardType, options);
      
      // مرحله 5: تولید CVV2
      const cvv2 = await this.generateCvv2(cardNumber, options);
      
      // مرحله 6: تولید تراشه EMV
      const emvChip = await this.generateEmvChip(cardNumber, cardType, options);
      
      // مرحله 7: تولید کلیدهای امنیتی
      const securityKeys = await this.generateSecurityKeys(cardNumber, options);
      
      // مرحله 8: تولید Track Data
      const trackData = this.generateTrackData(cardNumber, customerData, options);
      
      // مرحله 9: تولید امضای دیجیتال
      const digitalSignature = await this.generateDigitalSignature(cardNumber, options);
      
      // مرحله 10: ایجاد کارت در پایگاه داده
      const realCard = await this.createRealCard({
        cardNumber,
        binProfile,
        pin,
        cvv2,
        emvChip,
        securityKeys,
        trackData,
        digitalSignature,
        customerData,
        accountData,
        cardType,
        options
      });
      
      // مرحله 11: ثبت عملیات
      await this.logOperation(realCard, 'ISSUED', options.operator);
      
      console.log('✅ کارت واقعی با موفقیت صادر شد');
      return realCard;
      
    } catch (error) {
      console.error('❌ خطا در صدور کارت واقعی:', error);
      throw error;
    }
  }

  validateInput(customerData, accountData, cardType) {
    if (!customerData || !accountData || !cardType) {
      throw new Error('اطلاعات مشتری، حساب و نوع کارت الزامی است');
    }
    
    if (!customerData.fullName || !customerData.nationalId || !customerData.phone) {
      throw new Error('نام کامل، کد ملی و شماره تلفن مشتری الزامی است');
    }
    
    if (!accountData.accountNumber || !accountData.bankCode || !accountData.balance) {
      throw new Error('شماره حساب، کد بانک و موجودی حساب الزامی است');
    }
    
    if (!['DEBIT', 'CREDIT', 'PREPAID', 'BUSINESS'].includes(cardType)) {
      throw new Error('نوع کارت نامعتبر است');
    }
  }

  selectBinProfile(cardType, bankCode) {
    const profile = this.binProfiles.find(p => 
      p.bank_code === bankCode && p.product_type === cardType
    );
    
    if (!profile) {
      throw new Error(`پروفایل BIN برای بانک ${bankCode} و نوع ${cardType} یافت نشد`);
    }
    
    return profile;
  }

  generateCardNumber(binProfile) {
    const bin = binProfile.bin_range.split('-')[0];
    const accountNumber = Math.random().toString().slice(2, 11);
    const checkDigit = this.calculateLuhnCheckDigit(bin + accountNumber);
    return bin + accountNumber + checkDigit;
  }

  calculateLuhnCheckDigit(number) {
    let sum = 0;
    let isEven = false;
    
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return (10 - (sum % 10)) % 10;
  }

  async generatePin(cardNumber, cardType, options) {
    const pinLength = options.pin?.length || 4;
    const algorithm = options.pin?.algorithm || 'RANDOM';
    
    const pinResult = await this.hsmClient.generatePin({
      cardNumber: cardNumber,
      length: pinLength,
      algorithm: algorithm
    });
    
    return pinResult.pin;
  }

  async generateCvv2(cardNumber, options) {
    const expiryDate = options.expiryDate || this.generateExpiryDate();
    const serviceCode = options.serviceCode || '000';
    
    const cvv2Result = await this.hsmClient.generateCvv2({
      cardNumber: cardNumber,
      expiryDate: expiryDate,
      serviceCode: serviceCode
    });
    
    return cvv2Result.cvv2;
  }

  async generateEmvChip(cardNumber, cardType, options) {
    const emvProfile = this.emvProfiles.find(p => 
      p.profile_id.includes(cardType.toUpperCase())
    ) || this.emvProfiles[0];
    
    const emvResult = await this.hsmClient.generateEmvChip({
      cardNumber: cardNumber,
      aid: emvProfile.aid
    });
    
    return {
      ...emvResult.emvData,
      profile: emvProfile
    };
  }

  async generateSecurityKeys(cardNumber, options) {
    const keyType = options.keyType || 'EMV';
    
    const keysResult = await this.hsmClient.generateCardKeys({
      cardNumber: cardNumber,
      keyType: keyType
    });
    
    return keysResult.keys;
  }

  generateTrackData(cardNumber, customerData, options) {
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
  }

  generateTrack1(cardNumber, customerData, expiryDate, serviceCode) {
    const format = 'B';
    const name = customerData.fullName || 'CUSTOMER/NAME';
    const expiry = expiryDate.replace('/', '');
    
    return `${format}${cardNumber}^${name}^${expiry}${serviceCode}`;
  }

  generateTrack2(cardNumber, expiryDate, serviceCode) {
    const expiry = expiryDate.replace('/', '');
    return `${cardNumber}=${expiry}${serviceCode}`;
  }

  async generateDigitalSignature(cardNumber, options) {
    const data = cardNumber + new Date().toISOString();
    const keyLabel = options.signatureKey || 'ZMK_MASTER';
    
    const signatureResult = await this.hsmClient.generateDigitalSignature(data, keyLabel);
    
    return signatureResult;
  }

  async createRealCard(data) {
    try {
      // ایجاد کارت جدید
      const realCard = new RealCard({
        cardNumber: data.cardNumber,
        bin: {
          code: data.binProfile.bin_range.split('-')[0],
          bankName: data.binProfile.issuer_name,
          bankCode: data.binProfile.bank_code,
          productType: data.binProfile.product_type,
          network: data.binProfile.domestic_network,
          cardLevel: data.binProfile.card_level
        },
        security: {
          pin: data.pin,
          pinHash: crypto.createHash('sha256').update(data.pin).digest('hex'),
          cvv2: data.cvv2,
          cvv2Hash: crypto.createHash('sha256').update(data.cvv2).digest('hex')
        },
        emv: {
          aid: data.emvChip.aid,
          applicationLabel: data.emvChip.applicationLabel,
          chipData: data.emvChip.chipData,
          publicKey: data.emvChip.publicKey,
          certificate: data.emvChip.certificate
        },
        trackData: {
          track1: data.trackData.track1,
          track2: data.trackData.track2
        },
        customer: {
          fullName: data.customerData.fullName,
          nationalId: data.customerData.nationalId,
          phone: data.customerData.phone,
          email: data.customerData.email,
          address: data.customerData.address,
          dateOfBirth: data.customerData.dateOfBirth,
          gender: data.customerData.gender
        },
        account: {
          accountNumber: data.accountData.accountNumber,
          accountType: data.accountData.accountType,
          balance: data.accountData.balance,
          currency: data.accountData.currency || 'IRR',
          branchCode: data.accountData.branchCode || '001',
          branchName: data.accountData.branchName || 'شعبه مرکزی'
        },
        cardInfo: {
          cardType: data.cardType,
          cardBrand: this.getCardBrand(data.binProfile.international_scheme),
          cardArtwork: `${data.binProfile.issuer_name}_${data.cardType}_V1`,
          cardMaterial: 'PLASTIC',
          contactless: true,
          chipEnabled: true,
          magneticStripe: true
        },
        dates: {
          issuedAt: new Date(),
          validFrom: new Date(),
          validTo: new Date(data.trackData.expiryDate)
        },
        status: {
          current: 'ISSUED',
          previous: []
        },
        limits: {
          dailyATM: 5000000,
          dailyPOS: 10000000,
          monthlyTotal: 100000000,
          singleMax: 1000000,
          contactlessLimit: 500000
        },
        keys: {
          encKey: data.securityKeys.encKey,
          macKey: data.securityKeys.macKey,
          kek: data.securityKeys.kek,
          keyVersion: '1.0',
          keyExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
        digitalSignature: {
          signature: data.digitalSignature.signature,
          algorithm: data.digitalSignature.algorithm,
          keyLabel: data.digitalSignature.keyLabel,
          timestamp: data.digitalSignature.generatedAt
        },
        network: {
          shetabEnabled: true,
          internationalEnabled: true,
          onlineRequired: true,
          offlineLimit: 100000,
          fallbackEnabled: true
        },
        threeDSecure: {
          enabled: true,
          version: '2.1',
          profileId: `${data.binProfile.bank_code}_3DS_V1`
        },
        risk: {
          riskProfile: 'STANDARD',
          riskScore: 50,
          fraudFlags: []
        },
        operations: [],
        metadata: {
          generatedBy: 'RealCardIssuanceService',
          version: '1.0.0',
          source: 'BANKING_SYSTEM',
          tags: [data.cardType, data.binProfile.issuer_name],
          notes: 'کارت صادر شده توسط سیستم واقعی'
        }
      });
      
      // ذخیره در پایگاه داده
      await realCard.save();
      
      return realCard;
      
    } catch (error) {
      console.error('❌ خطا در ایجاد کارت واقعی:', error);
      throw error;
    }
  }

  getCardBrand(internationalScheme) {
    const brands = {
      'VISA': 'VISA',
      'MASTERCARD': 'MASTERCARD',
      'AMEX': 'AMEX',
      'SHETAB': 'LOCAL'
    };
    
    return brands[internationalScheme] || 'LOCAL';
  }

  generateExpiryDate() {
    const now = new Date();
    const expiryYear = now.getFullYear() + 4;
    const expiryMonth = now.getMonth() + 1;
    return `${expiryMonth.toString().padStart(2, '0')}/${expiryYear}`;
  }

  async logOperation(card, operationType, operator) {
    try {
      card.operations.push({
        type: operationType,
        timestamp: new Date(),
        operator: operator || {
          id: 'SYSTEM',
          name: 'سیستم',
          role: 'AUTO'
        },
        details: `عملیات ${operationType} انجام شد`,
        ipAddress: '127.0.0.1',
        userAgent: 'RealCardIssuanceService'
      });
      
      await card.save();
      
    } catch (error) {
      console.error('❌ خطا در ثبت عملیات:', error);
    }
  }

  async getCard(cardNumber) {
    try {
      return await RealCard.findByCardNumber(cardNumber);
    } catch (error) {
      console.error('❌ خطا در دریافت کارت:', error);
      throw error;
    }
  }

  async getAllCards(filters = {}) {
    try {
      let query = RealCard.find();
      
      if (filters.status) {
        query = query.where('status.current', filters.status);
      }
      
      if (filters.bankCode) {
        query = query.where('bin.bankCode', filters.bankCode);
      }
      
      if (filters.cardType) {
        query = query.where('cardInfo.cardType', filters.cardType);
      }
      
      if (filters.customerName) {
        query = query.where('customer.fullName', new RegExp(filters.customerName, 'i'));
      }
      
      return await query.exec();
      
    } catch (error) {
      console.error('❌ خطا در دریافت کارت‌ها:', error);
      throw error;
    }
  }

  async getCardStats() {
    try {
      const totalCards = await RealCard.countDocuments();
      const activeCards = await RealCard.countDocuments({ 'status.current': 'ACTIVE' });
      const blockedCards = await RealCard.countDocuments({ 'status.current': 'BLOCKED' });
      const expiredCards = await RealCard.countDocuments({ 'dates.validTo': { $lt: new Date() } });
      
      const cardTypes = await RealCard.aggregate([
        { $group: { _id: '$cardInfo.cardType', count: { $sum: 1 } } }
      ]);
      
      const bankDistribution = await RealCard.aggregate([
        { $group: { _id: '$bin.bankCode', count: { $sum: 1 } } }
      ]);
      
      return {
        total: totalCards,
        active: activeCards,
        blocked: blockedCards,
        expired: expiredCards,
        byType: cardTypes,
        byBank: bankDistribution
      };
      
    } catch (error) {
      console.error('❌ خطا در دریافت آمار کارت‌ها:', error);
      throw error;
    }
  }

  async closeService() {
    try {
      await this.hsmClient.closeSession();
      console.log('✅ سرویس صدور کارت واقعی بسته شد');
    } catch (error) {
      console.error('❌ خطا در بستن سرویس:', error);
    }
  }
}

module.exports = RealCardIssuanceService;