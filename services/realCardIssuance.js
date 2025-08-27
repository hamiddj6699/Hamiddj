const RealHSMClient = require('./realHSMClient');
const RealBankConnection = require('./realBankConnection');
const RealAccountManagement = require('./realAccountManagement');
const RealIdentityVerification = require('./realIdentityVerification');
const RealShetabIntegration = require('./realShetabIntegration');
const Card = require('../models/Card');
const OperationLog = require('../models/OperationLog');

/**
 * سرویس صدور کارت واقعی برای بانک‌ها
 * Real Card Issuance Service for Banks
 */
class RealCardIssuance {
  constructor(config) {
    this.hsm = new RealHSMClient(config.hsm);
    this.bankConnection = new RealBankConnection(config.banking);
    this.accountManagement = new RealAccountManagement(config.banking);
    this.identityVerification = new RealIdentityVerification(config.banking);
    this.shetabIntegration = new RealShetabIntegration(config.banking);
    
    this.config = config;
    this.initialized = false;
  }

  async initialize() {
    try {
      // آغاز جلسه HSM
      await this.hsm.initializeSession();
      
      // تست اتصال به شبکه‌های بانکی
      const connections = await this.bankConnection.testRealConnections();
      
      if (!connections.shetab || !connections.national || !connections.central) {
        throw new Error('اتصال به شبکه‌های بانکی برقرار نشد');
      }

      this.initialized = true;
      console.log('سرویس صدور کارت با موفقیت راه‌اندازی شد');
      return true;
    } catch (error) {
      console.error('خطا در راه‌اندازی سرویس صدور کارت:', error);
      throw error;
    }
  }

  async issueCard(customerData, accountData, cardType, operatorInfo) {
    if (!this.initialized) {
      throw new Error('سرویس صدور کارت راه‌اندازی نشده است');
    }

    const operationLog = new OperationLog({
      operationType: 'CARD_ISSUANCE',
      operatorId: operatorInfo.operatorId,
      operatorInfo: operatorInfo,
      data: { customerData, accountData, cardType },
      priority: 'HIGH',
      tags: ['card_issuance', 'real_banking']
    });

    try {
      // 1. تأیید هویت مشتری در بانک مرکزی
      const identityVerified = await this.identityVerification.verifyCustomerIdentity({
        nationalId: customerData.nationalId,
        birthDate: customerData.birthDate,
        fullName: customerData.fullName,
        fatherName: customerData.fatherName
      });

      if (!identityVerified.verified) {
        operationLog.result = {
          success: false,
          error: 'هویت مشتری تأیید نشد',
          details: identityVerified
        };
        await operationLog.save();
        throw new Error(`هویت مشتری تأیید نشد: ${identityVerified.reason}`);
      }

      // 2. تأیید حساب در شبکه شتاب
      const accountVerified = await this.accountManagement.verifyAccount({
        accountNumber: accountData.accountNumber,
        branchCode: accountData.branchCode,
        customerId: customerData.customerId
      });

      if (!accountVerified.verified) {
        operationLog.result = {
          success: false,
          error: 'حساب بانکی تأیید نشد',
          details: accountVerified
        };
        await operationLog.save();
        throw new Error(`حساب بانکی تأیید نشد: ${accountVerified.reason}`);
      }

      // 3. تولید شماره کارت با الگوریتم Luhn
      const cardNumber = this.generateCardNumber(accountData.binProfile);

      // 4. تولید کلیدهای کارت در HSM
      const cardKeys = await this.hsm.generateCardKeys({
        cardType,
        binProfile: accountData.binProfile,
        emvProfile: accountData.emvProfile
      });

      // 5. تولید PIN در HSM
      const pinData = await this.hsm.generatePin({
        cardNumber,
        customerId: customerData.customerId,
        pinPolicy: accountData.pinPolicy,
        keyLabel: accountData.zpkLabel || 'ZPK_DEFAULT'
      });

      // 6. تولید CVV2 در HSM
      const cvv2Data = await this.hsm.generateCvv2({
        cardNumber,
        expiryDate: accountData.expiryDate,
        serviceCode: accountData.serviceCode,
        keyLabel: accountData.cvv2KeyLabel || 'CVV2_KEY'
      });

      // 7. تولید تراشه EMV در HSM
      const chipData = await this.hsm.generateEmvChip({
        cardNumber,
        cardKeys,
        emvProfile: accountData.emvProfile,
        customerData
      });

      // 8. تولید امضای دیجیتال برای تأیید
      const digitalSignature = await this.hsm.generateDigitalSignature(
        JSON.stringify({
          cardNumber,
          customerId: customerData.customerId,
          accountNumber: accountData.accountNumber,
          timestamp: new Date().toISOString()
        }),
        accountData.signingKeyLabel || 'ISSUER_SIGNING_KEY'
      );

      // 9. ثبت در سیستم بانکی مرکزی
      const cardRegistered = await this.bankConnection.registerCardWithCentralBank({
        cardNumber,
        customerData,
        accountData,
        cardKeys: cardKeys.referenceIds,
        pinData: pinData.referenceId,
        cvv2Data: cvv2Data.referenceId,
        chipData: chipData.referenceId,
        digitalSignature: digitalSignature.signature,
        operatorInfo
      });

      if (!cardRegistered.success) {
        operationLog.result = {
          success: false,
          error: 'ثبت کارت در بانک مرکزی ناموفق بود',
          details: cardRegistered
        };
        await operationLog.save();
        throw new Error(`ثبت کارت در بانک مرکزی ناموفق بود: ${cardRegistered.error}`);
      }

      // 10. فعال‌سازی در شبکه شتاب
      const cardActivated = await this.shetabIntegration.activateCard({
        cardNumber,
        accountNumber: accountData.accountNumber,
        branchCode: accountData.branchCode,
        terminalId: accountData.terminalId,
        merchantId: accountData.merchantId,
        cardKeys: cardKeys.referenceIds,
        operatorInfo
      });

      if (!cardActivated.success) {
        operationLog.result = {
          success: false,
          error: 'فعال‌سازی کارت در شبکه شتاب ناموفق بود',
          details: cardActivated
        };
        await operationLog.save();
        throw new Error(`فعال‌سازی کارت در شبکه شتاب ناموفق بود: ${cardActivated.error}`);
      }

      // 11. ذخیره در پایگاه داده محلی
      const card = new Card({
        cardNumber,
        cardholderName: customerData.fullName,
        expiryDate: accountData.expiryDate,
        cardType,
        network: accountData.network || 'SHETAB',
        accountNumber: accountData.accountNumber,
        branchCode: accountData.branchCode,
        customerId: customerData.customerId,
        status: 'ACTIVE',
        pin: pinData.maskedPin,
        cvv2: cvv2Data.maskedCvv2,
        pinAttempts: 0,
        maxPinAttempts: pinData.maxAttempts,
        cardKeys: cardKeys.referenceIds,
        chipData: chipData.referenceId,
        issuedAt: new Date(),
        validFrom: new Date(),
        validTo: accountData.expiryDate,
        operatorInfo,
        shetabStatus: 'ACTIVE',
        centralBankStatus: 'REGISTERED',
        digitalSignature: digitalSignature.signature,
        hsmSessionId: this.hsm.sessionId
      });

      await card.save();

      // 12. ثبت عملیات موفق
      operationLog.result = {
        success: true,
        cardId: card._id,
        cardNumber: card.cardNumber,
        shetabRequestId: cardActivated.shetabRequestId,
        centralBankRequestId: cardRegistered.centralBankRequestId,
        hsmReferences: {
          cardKeys: cardKeys.referenceIds,
          pin: pinData.referenceId,
          cvv2: cvv2Data.referenceId,
          chip: chipData.referenceId,
          signature: digitalSignature.referenceId
        }
      };

      await operationLog.save();

      return {
        success: true,
        card: {
          cardNumber,
          pin: pinData.maskedPin,
          cvv2: cvv2Data.maskedCvv2,
          expiryDate: accountData.expiryDate,
          cardType,
          network: accountData.network || 'SHETAB',
          status: 'ACTIVE',
          issuedAt: new Date(),
          validFrom: new Date(),
          validTo: accountData.expiryDate
        },
        references: {
          cardId: card._id,
          shetabRequestId: cardActivated.shetabRequestId,
          centralBankRequestId: cardRegistered.centralBankRequestId,
          hsmReferences: operationLog.result.hsmReferences
        },
        security: {
          digitalSignature: digitalSignature.signature,
          hsmSessionId: this.hsm.sessionId,
          cardKeys: cardKeys.referenceIds
        }
      };

    } catch (error) {
      operationLog.result = {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
      await operationLog.save();
      throw error;
    }
  }

  generateCardNumber(binProfile) {
    const bin = binProfile.bin_range.split('-')[0];
    const accountLength = 16 - bin.length;
    let accountNumber = '';
    
    // تولید شماره حساب تصادفی
    for (let i = 0; i < accountLength - 1; i++) {
      accountNumber += Math.floor(Math.random() * 10);
    }
    
    // اضافه کردن رقم کنترل Luhn
    const partialNumber = bin + accountNumber;
    const checkDigit = this.calculateLuhnCheckDigit(partialNumber);
    
    return partialNumber + checkDigit;
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

  async issueReplacementCard(originalCardNumber, reason, operatorInfo) {
    if (!this.initialized) {
      throw new Error('سرویس صدور کارت راه‌اندازی نشده است');
    }

    try {
      // 1. بررسی کارت اصلی
      const originalCard = await Card.findOne({ cardNumber: originalCardNumber });
      if (!originalCard) {
        throw new Error('کارت اصلی یافت نشد');
      }

      // 2. مسدود کردن کارت اصلی در شبکه شتاب
      await this.shetabIntegration.blockCard({
        cardNumber: originalCardNumber,
        reason: reason,
        operatorInfo
      });

      // 3. صدور کارت جایگزین
      const replacementCard = await this.issueCard(
        {
          customerId: originalCard.customerId,
          nationalId: originalCard.nationalId,
          fullName: originalCard.cardholderName,
          birthDate: originalCard.birthDate,
          fatherName: originalCard.fatherName
        },
        {
          accountNumber: originalCard.accountNumber,
          branchCode: originalCard.branchCode,
          binProfile: originalCard.binProfile,
          emvProfile: originalCard.emvProfile,
          pinPolicy: originalCard.pinPolicy,
          expiryDate: this.calculateNewExpiryDate(),
          serviceCode: originalCard.serviceCode
        },
        originalCard.cardType,
        operatorInfo
      );

      // 4. به‌روزرسانی وضعیت کارت اصلی
      originalCard.status = 'REPLACED';
      originalCard.replacedBy = replacementCard.references.cardId;
      originalCard.replacementReason = reason;
      originalCard.replacedAt = new Date();
      await originalCard.save();

      return {
        success: true,
        originalCard: {
          cardNumber: originalCardNumber,
          status: 'REPLACED',
          replacedAt: new Date()
        },
        replacementCard: replacementCard
      };

    } catch (error) {
      console.error('خطا در صدور کارت جایگزین:', error);
      throw error;
    }
  }

  calculateNewExpiryDate() {
    const now = new Date();
    const expiryDate = new Date(now.getFullYear() + 4, now.getMonth(), now.getDate());
    return expiryDate;
  }

  async issueEmergencyCard(customerData, accountData, emergencyReason, operatorInfo) {
    if (!this.initialized) {
      throw new Error('سرویس صدور کارت راه‌اندازی نشده است');
    }

    try {
      // 1. تأیید فوری هویت (برای موارد اضطراری)
      const identityVerified = await this.identityVerification.verifyCustomerIdentity({
        nationalId: customerData.nationalId,
        birthDate: customerData.birthDate,
        fullName: customerData.fullName,
        fatherName: customerData.fatherName,
        emergencyMode: true
      });

      if (!identityVerified.verified) {
        throw new Error(`هویت مشتری تأیید نشد: ${identityVerified.reason}`);
      }

      // 2. صدور کارت اضطراری با محدودیت‌های خاص
      const emergencyCard = await this.issueCard(
        customerData,
        {
          ...accountData,
          pinPolicy: {
            ...accountData.pinPolicy,
            maxAttempts: 1, // فقط یک بار تلاش
            temporary: true
          },
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 روز
          emergencyMode: true
        },
        'EMERGENCY',
        operatorInfo
      );

      // 3. ثبت عملیات اضطراری
      const emergencyLog = new OperationLog({
        operationType: 'EMERGENCY_CARD_ISSUANCE',
        operatorId: operatorInfo.operatorId,
        operatorInfo: operatorInfo,
        data: { customerData, accountData, emergencyReason },
        priority: 'CRITICAL',
        tags: ['emergency', 'card_issuance', 'real_banking'],
        result: {
          success: true,
          cardId: emergencyCard.references.cardId,
          emergencyReason: emergencyReason
        }
      });

      await emergencyLog.save();

      return {
        success: true,
        emergencyCard: emergencyCard,
        emergencyLog: emergencyLog._id,
        note: 'کارت اضطراری صادر شد. مشتری باید ظرف 30 روز کارت اصلی را دریافت کند.'
      };

    } catch (error) {
      console.error('خطا در صدور کارت اضطراری:', error);
      throw error;
    }
  }

  async closeService() {
    try {
      if (this.hsm && this.hsm.sessionId) {
        await this.hsm.closeSession();
      }
      console.log('سرویس صدور کارت با موفقیت بسته شد');
    } catch (error) {
      console.error('خطا در بستن سرویس صدور کارت:', error);
    }
  }
}

module.exports = RealCardIssuance;