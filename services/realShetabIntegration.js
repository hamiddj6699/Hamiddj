const RealBankConnection = require('./realBankConnection');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');

/**
 * سرویس یکپارچه‌سازی واقعی با شبکه شتاب
 * Real Shetab Network Integration Service
 */
class RealShetabIntegration {
  constructor() {
    this.bankConnection = new RealBankConnection();
    this.config = {
      // تنظیمات شبکه شتاب
      shetab: {
        production: {
          baseURL: 'https://api.shetab.ir',
          wsdlURL: 'https://api.shetab.ir/wsdl/CardService.wsdl',
          certificatePath: process.env.SHETAB_CERT_PATH,
          privateKeyPath: process.env.SHETAB_PRIVATE_KEY_PATH,
          merchantId: process.env.SHETAB_MERCHANT_ID,
          terminalId: process.env.SHETAB_TERMINAL_ID,
          acquirerId: process.env.SHETAB_ACQUIRER_ID,
          branchCode: process.env.SHETAB_BRANCH_CODE,
          tellerId: process.env.SHETAB_TELLER_ID
        },
        test: {
          baseURL: 'https://test.shetab.ir',
          wsdlURL: 'https://test.shetab.ir/wsdl/CardService.wsdl',
          certificatePath: process.env.SHETAB_TEST_CERT_PATH,
          privateKeyPath: process.env.SHETAB_TEST_PRIVATE_KEY_PATH,
          merchantId: process.env.SHETAB_TEST_MERCHANT_ID,
          terminalId: process.env.SHETAB_TEST_TERMINAL_ID,
          acquirerId: process.env.SHETAB_TEST_ACQUIRER_ID,
          branchCode: process.env.SHETAB_TEST_BRANCH_CODE,
          tellerId: process.env.SHETAB_TEST_TELLER_ID
        }
      }
    };
    
    this.environment = process.env.BANKING_ENV || 'test';
    this.currentConfig = this.config.shetab[this.environment];
  }

  /**
   * مسدود کردن کارت در شبکه شتاب
   */
  async blockCardInShetab(cardNumber, reason, operatorId, branchCode) {
    try {
      // 1. اعتبارسنجی شماره کارت
      if (!this.validateCardNumber(cardNumber)) {
        throw new Error('شماره کارت نامعتبر است');
      }

      // 2. ساخت درخواست مسدود کردن
      const blockData = {
        cardNumber: cardNumber,
        reason: reason,
        operatorId: operatorId,
        branchCode: branchCode || this.currentConfig.branchCode,
        tellerId: this.currentConfig.tellerId,
        merchantId: this.currentConfig.merchantId,
        terminalId: this.currentConfig.terminalId,
        acquirerId: this.currentConfig.acquirerId,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 3. ارسال درخواست SOAP به شبکه شتاب
      const response = await this.bankConnection.sendShetabSOAPRequest(
        'BlockCard',
        blockData
      );

      // 4. پردازش پاسخ
      if (response.success && response.data.blockResult === 'SUCCESS') {
        return {
          success: true,
          blockInfo: {
            cardNumber: cardNumber,
            blockStatus: 'BLOCKED',
            blockReason: reason,
            blockedBy: operatorId,
            blockedAt: new Date(),
            shetabReference: response.data.shetabReference,
            requestId: response.data.requestId
          }
        };
      } else {
        throw new Error(response.data.errorMessage || 'خطا در مسدود کردن کارت در شبکه شتاب');
      }

    } catch (error) {
      console.error('❌ خطا در مسدود کردن کارت در شبکه شتاب:', error);
      throw new Error(`خطا در مسدود کردن کارت در شبکه شتاب: ${error.message}`);
    }
  }

  /**
   * فعال‌سازی کارت در شبکه شتاب
   */
  async activateCardInShetab(cardNumber, operatorId, branchCode) {
    try {
      // 1. اعتبارسنجی شماره کارت
      if (!this.validateCardNumber(cardNumber)) {
        throw new Error('شماره کارت نامعتبر است');
      }

      // 2. ساخت درخواست فعال‌سازی
      const activateData = {
        cardNumber: cardNumber,
        operatorId: operatorId,
        branchCode: branchCode || this.currentConfig.branchCode,
        tellerId: this.currentConfig.tellerId,
        merchantId: this.currentConfig.merchantId,
        terminalId: this.currentConfig.terminalId,
        acquirerId: this.currentConfig.acquirerId,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 3. ارسال درخواست SOAP به شبکه شتاب
      const response = await this.bankConnection.sendShetabSOAPRequest(
        'ActivateCard',
        activateData
      );

      // 4. پردازش پاسخ
      if (response.success && response.data.activationResult === 'SUCCESS') {
        return {
          success: true,
          activationInfo: {
            cardNumber: cardNumber,
            activationStatus: 'ACTIVATED',
            activatedBy: operatorId,
            activatedAt: new Date(),
            shetabReference: response.data.shetabReference,
            requestId: response.data.requestId
          }
        };
      } else {
        throw new Error(response.data.errorMessage || 'خطا در فعال‌سازی کارت در شبکه شتاب');
      }

    } catch (error) {
      console.error('❌ خطا در فعال‌سازی کارت در شبکه شتاب:', error);
      throw new Error(`خطا در فعال‌سازی کارت در شبکه شتاب: ${error.message}`);
    }
  }

  /**
   * صدور کارت جدید در شبکه شتاب
   */
  async issueCardInShetab(accountNumber, cardType, operatorId, customerInfo, branchCode) {
    try {
      // 1. اعتبارسنجی شماره حساب
      if (!this.validateAccountNumber(accountNumber)) {
        throw new Error('شماره حساب نامعتبر است');
      }

      // 2. اعتبارسنجی نوع کارت
      if (!this.validateCardType(cardType)) {
        throw new Error('نوع کارت نامعتبر است');
      }

      // 3. ساخت درخواست صدور کارت
      const issueData = {
        accountNumber: accountNumber,
        cardType: cardType,
        operatorId: operatorId,
        customerInfo: customerInfo,
        branchCode: branchCode || this.currentConfig.branchCode,
        tellerId: this.currentConfig.tellerId,
        merchantId: this.currentConfig.merchantId,
        terminalId: this.currentConfig.terminalId,
        acquirerId: this.currentConfig.acquirerId,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 4. ارسال درخواست SOAP به شبکه شتاب
      const response = await this.bankConnection.sendShetabSOAPRequest(
        'IssueCard',
        issueData
      );

      // 5. پردازش پاسخ
      if (response.success && response.data.issueResult === 'SUCCESS') {
        return {
          success: true,
          cardInfo: {
            cardNumber: response.data.cardNumber,
            cardType: cardType,
            accountNumber: accountNumber,
            issuedBy: operatorId,
            issuedAt: new Date(),
            shetabReference: response.data.shetabReference,
            requestId: response.data.requestId,
            cardData: {
              track1: response.data.track1,
              track2: response.data.track2,
              pin: response.data.pin,
              cvv2: response.data.cvv2,
              expiryDate: response.data.expiryDate
            }
          }
        };
      } else {
        throw new Error(response.data.errorMessage || 'خطا در صدور کارت در شبکه شتاب');
      }

    } catch (error) {
      console.error('❌ خطا در صدور کارت در شبکه شتاب:', error);
      throw new Error(`خطا در صدور کارت در شبکه شتاب: ${error.message}`);
    }
  }

  /**
   * تغییر رمز کارت در شبکه شتاب
   */
  async changePinInShetab(cardNumber, newPin, operatorId, branchCode) {
    try {
      // 1. اعتبارسنجی شماره کارت
      if (!this.validateCardNumber(cardNumber)) {
        throw new Error('شماره کارت نامعتبر است');
      }

      // 2. اعتبارسنجی رمز جدید
      if (!this.validatePin(newPin)) {
        throw new Error('رمز جدید نامعتبر است');
      }

      // 3. ساخت درخواست تغییر رمز
      const changePinData = {
        cardNumber: cardNumber,
        newPin: this.encryptPin(newPin),
        operatorId: operatorId,
        branchCode: branchCode || this.currentConfig.branchCode,
        tellerId: this.currentConfig.tellerId,
        merchantId: this.currentConfig.merchantId,
        terminalId: this.currentConfig.terminalId,
        acquirerId: this.currentConfig.acquirerId,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 4. ارسال درخواست SOAP به شبکه شتاب
      const response = await this.bankConnection.sendShetabSOAPRequest(
        'ChangePin',
        changePinData
      );

      // 5. پردازش پاسخ
      if (response.success && response.data.changePinResult === 'SUCCESS') {
        return {
          success: true,
          changePinInfo: {
            cardNumber: cardNumber,
            pinChangedBy: operatorId,
            pinChangedAt: new Date(),
            shetabReference: response.data.shetabReference,
            requestId: response.data.requestId
          }
        };
      } else {
        throw new Error(response.data.errorMessage || 'خطا در تغییر رمز کارت در شبکه شتاب');
      }

    } catch (error) {
      console.error('❌ خطا در تغییر رمز کارت در شبکه شتاب:', error);
      throw new Error(`خطا در تغییر رمز کارت در شبکه شتاب: ${error.message}`);
    }
  }

  /**
   * بررسی وضعیت کارت در شبکه شتاب
   */
  async getCardStatusInShetab(cardNumber, operatorId, branchCode) {
    try {
      // 1. اعتبارسنجی شماره کارت
      if (!this.validateCardNumber(cardNumber)) {
        throw new Error('شماره کارت نامعتبر است');
      }

      // 2. ساخت درخواست بررسی وضعیت
      const statusData = {
        cardNumber: cardNumber,
        operatorId: operatorId,
        branchCode: branchCode || this.currentConfig.branchCode,
        tellerId: this.currentConfig.tellerId,
        merchantId: this.currentConfig.merchantId,
        terminalId: this.currentConfig.terminalId,
        acquirerId: this.currentConfig.acquirerId,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 3. ارسال درخواست SOAP به شبکه شتاب
      const response = await this.bankConnection.sendShetabSOAPRequest(
        'GetCardStatus',
        statusData
      );

      // 4. پردازش پاسخ
      if (response.success) {
        return {
          success: true,
          cardStatus: {
            cardNumber: cardNumber,
            status: response.data.status,
            isActive: response.data.isActive,
            isBlocked: response.data.isBlocked,
            blockReason: response.data.blockReason,
            lastActivity: response.data.lastActivity,
            cardType: response.data.cardType,
            accountNumber: response.data.accountNumber,
            shetabReference: response.data.shetabReference,
            requestId: response.data.requestId,
            statusDate: new Date()
          }
        };
      } else {
        throw new Error(response.data.errorMessage || 'خطا در دریافت وضعیت کارت از شبکه شتاب');
      }

    } catch (error) {
      console.error('❌ خطا در بررسی وضعیت کارت در شبکه شتاب:', error);
      throw new Error(`خطا در بررسی وضعیت کارت در شبکه شتاب: ${error.message}`);
    }
  }

  /**
   * همگام‌سازی وضعیت کارت با شبکه شتاب
   */
  async syncCardStatusWithShetab(cardNumber, operatorId, branchCode) {
    try {
      // 1. دریافت وضعیت از شبکه شتاب
      const shetabStatus = await this.getCardStatusInShetab(cardNumber, operatorId, branchCode);

      // 2. بازگرداندن نتیجه همگام‌سازی
      return {
        success: true,
        syncInfo: {
          cardNumber: cardNumber,
          syncedAt: new Date(),
          shetabStatus: shetabStatus.cardStatus,
          operatorId: operatorId,
          requestId: shetabStatus.cardStatus.requestId
        }
      };

    } catch (error) {
      console.error('❌ خطا در همگام‌سازی وضعیت کارت با شبکه شتاب:', error);
      throw new Error(`خطا در همگام‌سازی وضعیت کارت: ${error.message}`);
    }
  }

  /**
   * دریافت گزارش تراکنش‌های کارت
   */
  async getCardTransactions(cardNumber, fromDate, toDate, operatorId, branchCode) {
    try {
      // 1. اعتبارسنجی شماره کارت
      if (!this.validateCardNumber(cardNumber)) {
        throw new Error('شماره کارت نامعتبر است');
      }

      // 2. ساخت درخواست گزارش تراکنش‌ها
      const transactionData = {
        cardNumber: cardNumber,
        fromDate: fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 روز پیش
        toDate: toDate || new Date().toISOString(),
        operatorId: operatorId,
        branchCode: branchCode || this.currentConfig.branchCode,
        tellerId: this.currentConfig.tellerId,
        merchantId: this.currentConfig.merchantId,
        terminalId: this.currentConfig.terminalId,
        acquirerId: this.currentConfig.acquirerId,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 3. ارسال درخواست SOAP به شبکه شتاب
      const response = await this.bankConnection.sendShetabSOAPRequest(
        'GetCardTransactions',
        transactionData
      );

      // 4. پردازش پاسخ
      if (response.success) {
        return {
          success: true,
          transactions: response.data.transactions.map(tx => ({
            transactionId: tx.transactionId,
            cardNumber: cardNumber,
            transactionType: tx.transactionType,
            amount: tx.amount,
            currency: tx.currency,
            merchantName: tx.merchantName,
            merchantId: tx.merchantId,
            terminalId: tx.terminalId,
            transactionDate: tx.transactionDate,
            authorizationCode: tx.authorizationCode,
            referenceNumber: tx.referenceNumber
          })),
          summary: {
            totalTransactions: response.data.totalTransactions,
            totalAmount: response.data.totalAmount,
            fromDate: fromDate,
            toDate: toDate,
            requestId: response.data.requestId
          }
        };
      } else {
        throw new Error(response.data.errorMessage || 'خطا در دریافت گزارش تراکنش‌ها');
      }

    } catch (error) {
      console.error('❌ خطا در دریافت گزارش تراکنش‌های کارت:', error);
      throw new Error(`خطا در دریافت گزارش تراکنش‌ها: ${error.message}`);
    }
  }

  /**
   * اعتبارسنجی شماره کارت
   */
  validateCardNumber(cardNumber) {
    // فرمت شماره کارت: 16 رقم
    const cardRegex = /^\d{16}$/;
    if (!cardRegex.test(cardNumber)) {
      return false;
    }

    // بررسی الگوریتم Luhn
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  /**
   * اعتبارسنجی شماره حساب
   */
  validateAccountNumber(accountNumber) {
    // فرمت شماره حساب: 13 رقم
    const accountRegex = /^\d{13}$/;
    return accountRegex.test(accountNumber);
  }

  /**
   * اعتبارسنجی نوع کارت
   */
  validateCardType(cardType) {
    const validTypes = ['عادی', 'طلایی', 'پلاتینیوم', 'سیاه'];
    return validTypes.includes(cardType);
  }

  /**
   * اعتبارسنجی رمز
   */
  validatePin(pin) {
    // فرمت رمز: 4 رقم
    const pinRegex = /^\d{4}$/;
    return pinRegex.test(pin);
  }

  /**
   * رمزنگاری PIN
   */
  encryptPin(pin) {
    try {
      // استفاده از کلید عمومی شبکه شتاب برای رمزنگاری
      const publicKey = fs.readFileSync(this.currentConfig.certificatePath);
      const encrypted = crypto.publicEncrypt(
        publicKey,
        Buffer.from(pin, 'utf8')
      );
      return encrypted.toString('base64');
    } catch (error) {
      console.error('❌ خطا در رمزنگاری PIN:', error);
      throw new Error('خطا در رمزنگاری PIN');
    }
  }

  /**
   * تولید شناسه درخواست منحصر به فرد
   */
  generateRequestId() {
    return `SHETAB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * تست اتصال به شبکه شتاب
   */
  async testShetabConnection() {
    try {
      // تست اتصال با ارسال درخواست تست
      const testData = {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
        operatorId: 'TEST_OPERATOR',
        branchCode: this.currentConfig.branchCode,
        tellerId: this.currentConfig.tellerId,
        merchantId: this.currentConfig.merchantId,
        terminalId: this.currentConfig.terminalId,
        acquirerId: this.currentConfig.acquirerId
      };

      const response = await this.bankConnection.sendShetabSOAPRequest(
        'TestConnection',
        testData
      );

      return {
        success: true,
        message: 'اتصال به شبکه شتاب برقرار است',
        environment: this.environment,
        config: {
          baseURL: this.currentConfig.baseURL,
          merchantId: this.currentConfig.merchantId,
          terminalId: this.currentConfig.terminalId,
          branchCode: this.currentConfig.branchCode
        },
        testResponse: response.data
      };

    } catch (error) {
      console.error('❌ خطا در تست اتصال به شبکه شتاب:', error);
      return {
        success: false,
        message: `خطا در اتصال به شبکه شتاب: ${error.message}`,
        environment: this.environment,
        error: error.message
      };
    }
  }

  /**
   * دریافت اطلاعات پیکربندی شبکه شتاب
   */
  getShetabConfiguration() {
    return {
      environment: this.environment,
      baseURL: this.currentConfig.baseURL,
      wsdlURL: this.currentConfig.wsdlURL,
      merchantId: this.currentConfig.merchantId,
      terminalId: this.currentConfig.terminalId,
      acquirerId: this.currentConfig.acquirerId,
      branchCode: this.currentConfig.branchCode,
      tellerId: this.currentConfig.tellerId,
      certificatePath: this.currentConfig.certificatePath,
      privateKeyPath: this.currentConfig.privateKeyPath
    };
  }
}

module.exports = RealShetabIntegration;