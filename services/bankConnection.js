const crypto = require('crypto');
const axios = require('axios');

/**
 * سرویس اتصال به شبکه‌های بانکی
 * Banking Network Connection Service
 */
class BankConnection {
  constructor() {
    this.config = {
      shetab: {
        baseURL: process.env.SHETAB_API_URL || 'https://api.shetab.ir',
        apiKey: process.env.SHETAB_API_KEY,
        secretKey: process.env.SHETAB_SECRET_KEY,
        timeout: 30000
      },
      national: {
        baseURL: process.env.NATIONAL_BANK_API_URL || 'https://api.bmi.ir',
        apiKey: process.env.NATIONAL_BANK_API_KEY,
        secretKey: process.env.NATIONAL_BANK_SECRET_KEY,
        timeout: 30000
      },
      central: {
        baseURL: process.env.CENTRAL_BANK_API_URL || 'https://api.cbi.ir',
        apiKey: process.env.CENTRAL_BANK_API_KEY,
        secretKey: process.env.CENTRAL_BANK_SECRET_KEY,
        timeout: 30000
      }
    };
    
    this.initializeConnections();
  }

  /**
   * راه‌اندازی اتصالات بانکی
   */
  initializeConnections() {
    this.shetabAPI = axios.create({
      baseURL: this.config.shetab.baseURL,
      timeout: this.config.shetab.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.shetab.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    this.nationalBankAPI = axios.create({
      baseURL: this.config.national.baseURL,
      timeout: this.config.national.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.national.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    this.centralBankAPI = axios.create({
      baseURL: this.config.central.baseURL,
      timeout: this.config.central.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.central.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * تولید امضای دیجیتال برای درخواست‌ها
   */
  generateSignature(data, secretKey) {
    const message = JSON.stringify(data) + new Date().toISOString();
    return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
  }

  /**
   * مسدود کردن کارت در شبکه شتاب
   */
  async blockCardInShetab(cardNumber, reason, operatorId) {
    try {
      const requestData = {
        cardNumber,
        reason,
        operatorId,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };

      const signature = this.generateSignature(requestData, this.config.shetab.secretKey);
      
      const response = await this.shetabAPI.post('/cards/block', {
        ...requestData,
        signature
      });

      return {
        success: true,
        shetabResponse: response.data,
        requestId: requestData.requestId
      };

    } catch (error) {
      console.error('خطا در مسدود کردن کارت در شبکه شتاب:', error);
      throw new Error(`خطا در مسدود کردن کارت در شبکه شتاب: ${error.message}`);
    }
  }

  /**
   * صدور کارت جدید در شبکه شتاب
   */
  async issueCardInShetab(accountNumber, cardType, operatorId) {
    try {
      const requestData = {
        accountNumber,
        cardType,
        operatorId,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };

      const signature = this.generateSignature(requestData, this.config.shetab.secretKey);
      
      const response = await this.shetabAPI.post('/cards/issue', {
        ...requestData,
        signature
      });

      return {
        success: true,
        cardData: response.data,
        requestId: requestData.requestId
      };

    } catch (error) {
      console.error('خطا در صدور کارت در شبکه شتاب:', error);
      throw new Error(`خطا در صدور کارت در شبکه شتاب: ${error.message}`);
    }
  }

  /**
   * فعال‌سازی کارت در شبکه شتاب
   */
  async activateCardInShetab(cardNumber, operatorId) {
    try {
      const requestData = {
        cardNumber,
        operatorId,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };

      const signature = this.generateSignature(requestData, this.config.shetab.secretKey);
      
      const response = await this.shetabAPI.post('/cards/activate', {
        ...requestData,
        signature
      });

      return {
        success: true,
        shetabResponse: response.data,
        requestId: requestData.requestId
      };

    } catch (error) {
      console.error('خطا در فعال‌سازی کارت در شبکه شتاب:', error);
      throw new Error(`خطا در فعال‌سازی کارت در شبکه شتاب: ${error.message}`);
    }
  }

  /**
   * تغییر رمز کارت در شبکه شتاب
   */
  async changePinInShetab(cardNumber, newPin, operatorId) {
    try {
      const requestData = {
        cardNumber,
        newPin: this.encryptPin(newPin),
        operatorId,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };

      const signature = this.generateSignature(requestData, this.config.shetab.secretKey);
      
      const response = await this.shetabAPI.post('/cards/change-pin', {
        ...requestData,
        signature
      });

      return {
        success: true,
        shetabResponse: response.data,
        requestId: requestData.requestId
      };

    } catch (error) {
      console.error('خطا در تغییر رمز کارت در شبکه شتاب:', error);
      throw new Error(`خطا در تغییر رمز کارت در شبکه شتاب: ${error.message}`);
    }
  }

  /**
   * بررسی وضعیت کارت در شبکه شتاب
   */
  async getCardStatusInShetab(cardNumber) {
    try {
      const requestData = {
        cardNumber,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };

      const signature = this.generateSignature(requestData, this.config.shetab.secretKey);
      
      const response = await this.shetabAPI.get(`/cards/${cardNumber}/status`, {
        headers: { 'X-Signature': signature }
      });

      return {
        success: true,
        cardStatus: response.data,
        requestId: requestData.requestId
      };

    } catch (error) {
      console.error('خطا در بررسی وضعیت کارت در شبکه شتاب:', error);
      throw new Error(`خطا در بررسی وضعیت کارت در شبکه شتاب: ${error.message}`);
    }
  }

  /**
   * تایید حساب از طریق بانک ملی
   */
  async verifyAccountInNationalBank(accountNumber, nationalId) {
    try {
      const requestData = {
        accountNumber,
        nationalId,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };

      const signature = this.generateSignature(requestData, this.config.national.secretKey);
      
      const response = await this.nationalBankAPI.post('/accounts/verify', {
        ...requestData,
        signature
      });

      return {
        success: true,
        accountInfo: response.data,
        requestId: requestData.requestId
      };

    } catch (error) {
      console.error('خطا در تایید حساب از بانک ملی:', error);
      throw new Error(`خطا در تایید حساب از بانک ملی: ${error.message}`);
    }
  }

  /**
   * بررسی موجودی حساب از طریق بانک ملی
   */
  async getAccountBalanceInNationalBank(accountNumber) {
    try {
      const requestData = {
        accountNumber,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };

      const signature = this.generateSignature(requestData, this.config.national.secretKey);
      
      const response = await this.nationalBankAPI.get(`/accounts/${accountNumber}/balance`, {
        headers: { 'X-Signature': signature }
      });

      return {
        success: true,
        balance: response.data.balance,
        currency: response.data.currency,
        requestId: requestData.requestId
      };

    } catch (error) {
      console.error('خطا در بررسی موجودی حساب از بانک ملی:', error);
      throw new Error(`خطا در بررسی موجودی حساب از بانک ملی: ${error.message}`);
    }
  }

  /**
   * تایید هویت از طریق بانک مرکزی
   */
  async verifyIdentityInCentralBank(nationalId, phone) {
    try {
      const requestData = {
        nationalId,
        phone,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };

      const signature = this.generateSignature(requestData, this.config.central.secretKey);
      
      const response = await this.centralBankAPI.post('/identity/verify', {
        ...requestData,
        signature
      });

      return {
        success: true,
        verificationResult: response.data,
        requestId: requestData.requestId
      };

    } catch (error) {
      console.error('خطا در تایید هویت از بانک مرکزی:', error);
      throw new Error(`خطا در تایید هویت از بانک مرکزی: ${error.message}`);
    }
  }

  /**
   * رمزنگاری PIN
   */
  encryptPin(pin) {
    return crypto.createHash('sha256').update(pin).digest('hex');
  }

  /**
   * تولید شناسه درخواست منحصر به فرد
   */
  generateRequestId() {
    return `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * تست اتصال به شبکه‌های بانکی
   */
  async testConnections() {
    const results = {};
    
    try {
      // تست اتصال به شبکه شتاب
      const shetabTest = await this.shetabAPI.get('/health');
      results.shetab = { status: 'success', response: shetabTest.data };
    } catch (error) {
      results.shetab = { status: 'error', message: error.message };
    }

    try {
      // تست اتصال به بانک ملی
      const nationalTest = await this.nationalBankAPI.get('/health');
      results.national = { status: 'success', response: nationalTest.data };
    } catch (error) {
      results.national = { status: 'error', message: error.message };
    }

    try {
      // تست اتصال به بانک مرکزی
      const centralTest = await this.centralBankAPI.get('/health');
      results.central = { status: 'success', response: centralTest.data };
    } catch (error) {
      results.central = { status: 'error', message: error.message };
    }

    return results;
  }
}

module.exports = BankConnection;