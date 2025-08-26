const RealBankConnection = require('./realBankConnection');
const crypto = require('crypto');
const https = require('https');

/**
 * سرویس تایید هویت واقعی مشتری
 * Real Customer Identity Verification Service
 */
class RealIdentityVerification {
  constructor() {
    this.bankConnection = new RealBankConnection();
  }

  /**
   * تایید هویت از بانک مرکزی
   */
  async verifyIdentityFromCentralBank(nationalId, phone, operatorId) {
    try {
      // 1. اعتبارسنجی کد ملی
      if (!this.validateNationalId(nationalId)) {
        throw new Error('کد ملی نامعتبر است');
      }

      // 2. اعتبارسنجی شماره تلفن
      if (!this.validatePhoneNumber(phone)) {
        throw new Error('شماره تلفن نامعتبر است');
      }

      // 3. ارسال درخواست به بانک مرکزی
      const identityData = {
        nationalId: nationalId,
        phone: phone,
        operatorId: operatorId,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 4. ارسال درخواست SOAP به بانک مرکزی
      const response = await this.bankConnection.sendCentralBankSOAPRequest(
        'VerifyIdentity',
        identityData
      );

      // 5. پردازش پاسخ
      if (response.success && response.data.verificationResult === 'SUCCESS') {
        return {
          success: true,
          identityInfo: {
            nationalId: nationalId,
            firstName: response.data.firstName,
            lastName: response.data.lastName,
            fullName: `${response.data.firstName} ${response.data.lastName}`,
            birthDate: response.data.birthDate,
            gender: response.data.gender,
            phone: phone,
            isVerified: true,
            verificationDate: new Date(),
            verificationId: response.data.verificationId,
            operatorId: operatorId
          }
        };
      } else {
        throw new Error(response.data.errorMessage || 'هویت تایید نشد');
      }

    } catch (error) {
      console.error('❌ خطا در تایید هویت از بانک مرکزی:', error);
      throw new Error(`خطا در تایید هویت: ${error.message}`);
    }
  }

  /**
   * تایید هویت از سازمان ثبت احوال
   */
  async verifyIdentityFromCivilRegistry(nationalId, operatorId) {
    try {
      // 1. اعتبارسنجی کد ملی
      if (!this.validateNationalId(nationalId)) {
        throw new Error('کد ملی نامعتبر است');
      }

      // 2. ارسال درخواست به سازمان ثبت احوال
      const civilData = {
        nationalId: nationalId,
        operatorId: operatorId,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 3. ارسال درخواست HTTPS به سازمان ثبت احوال
      const response = await this.sendCivilRegistryRequest(civilData);

      // 4. پردازش پاسخ
      if (response.success) {
        return {
          success: true,
          civilInfo: {
            nationalId: nationalId,
            firstName: response.data.firstName,
            lastName: response.data.lastName,
            fullName: `${response.data.firstName} ${response.data.lastName}`,
            birthDate: response.data.birthDate,
            birthPlace: response.data.birthPlace,
            gender: response.data.gender,
            fatherName: response.data.fatherName,
            motherName: response.data.motherName,
            isAlive: response.data.isAlive,
            isVerified: true,
            verificationDate: new Date(),
            verificationId: response.data.verificationId
          }
        };
      } else {
        throw new Error(response.data.errorMessage || 'اطلاعات ثبت احوال تایید نشد');
      }

    } catch (error) {
      console.error('❌ خطا در تایید هویت از ثبت احوال:', error);
      throw new Error(`خطا در تایید ثبت احوال: ${error.message}`);
    }
  }

  /**
   * تایید هویت از سازمان امور مالیاتی
   */
  async verifyIdentityFromTaxOrganization(nationalId, operatorId) {
    try {
      // 1. اعتبارسنجی کد ملی
      if (!this.validateNationalId(nationalId)) {
        throw new Error('کد ملی نامعتبر است');
      }

      // 2. ارسال درخواست به سازمان امور مالیاتی
      const taxData = {
        nationalId: nationalId,
        operatorId: operatorId,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 3. ارسال درخواست HTTPS به سازمان امور مالیاتی
      const response = await this.sendTaxOrganizationRequest(taxData);

      // 4. پردازش پاسخ
      if (response.success) {
        return {
          success: true,
          taxInfo: {
            nationalId: nationalId,
            taxCode: response.data.taxCode,
            taxStatus: response.data.taxStatus,
            hasTaxFile: response.data.hasTaxFile,
            lastTaxPayment: response.data.lastTaxPayment,
            isVerified: true,
            verificationDate: new Date(),
            verificationId: response.data.verificationId
          }
        };
      } else {
        throw new Error(response.data.errorMessage || 'اطلاعات مالیاتی تایید نشد');
      }

    } catch (error) {
      console.error('❌ خطا در تایید هویت از سازمان امور مالیاتی:', error);
      throw new Error(`خطا در تایید اطلاعات مالیاتی: ${error.message}`);
    }
  }

  /**
   * تایید هویت از بانک اطلاعات مشتریان
   */
  async verifyIdentityFromCustomerDatabase(nationalId, phone, operatorId) {
    try {
      // 1. اعتبارسنجی کد ملی
      if (!this.validateNationalId(nationalId)) {
        throw new Error('کد ملی نامعتبر است');
      }

      // 2. ارسال درخواست به بانک اطلاعات مشتریان
      const customerData = {
        nationalId: nationalId,
        phone: phone,
        operatorId: operatorId,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 3. ارسال درخواست HTTPS به بانک اطلاعات مشتریان
      const response = await this.sendCustomerDatabaseRequest(customerData);

      // 4. پردازش پاسخ
      if (response.success) {
        return {
          success: true,
          customerInfo: {
            nationalId: nationalId,
            phone: phone,
            customerId: response.data.customerId,
            customerType: response.data.customerType,
            riskLevel: response.data.riskLevel,
            blacklistStatus: response.data.blacklistStatus,
            lastActivity: response.data.lastActivity,
            isVerified: true,
            verificationDate: new Date(),
            verificationId: response.data.verificationId
          }
        };
      } else {
        throw new Error(response.data.errorMessage || 'اطلاعات مشتری تایید نشد');
      }

    } catch (error) {
      console.error('❌ خطا در تایید هویت از بانک اطلاعات مشتریان:', error);
      throw new Error(`خطا در تایید اطلاعات مشتری: ${error.message}`);
    }
  }

  /**
   * تایید هویت جامع (از تمام منابع)
   */
  async comprehensiveIdentityVerification(nationalId, phone, operatorId) {
    try {
      const results = {};
      const errors = [];

      // 1. تایید از بانک مرکزی
      try {
        const centralBankResult = await this.verifyIdentityFromCentralBank(nationalId, phone, operatorId);
        results.centralBank = centralBankResult;
      } catch (error) {
        errors.push(`بانک مرکزی: ${error.message}`);
        results.centralBank = { success: false, error: error.message };
      }

      // 2. تایید از ثبت احوال
      try {
        const civilResult = await this.verifyIdentityFromCivilRegistry(nationalId, operatorId);
        results.civilRegistry = civilResult;
      } catch (error) {
        errors.push(`ثبت احوال: ${error.message}`);
        results.civilRegistry = { success: false, error: error.message };
      }

      // 3. تایید از سازمان امور مالیاتی
      try {
        const taxResult = await this.verifyIdentityFromTaxOrganization(nationalId, operatorId);
        results.taxOrganization = taxResult;
      } catch (error) {
        errors.push(`سازمان امور مالیاتی: ${error.message}`);
        results.taxOrganization = { success: false, error: error.message };
      }

      // 4. تایید از بانک اطلاعات مشتریان
      try {
        const customerResult = await this.verifyIdentityFromCustomerDatabase(nationalId, phone, operatorId);
        results.customerDatabase = customerResult;
      } catch (error) {
        errors.push(`بانک اطلاعات مشتریان: ${error.message}`);
        results.customerDatabase = { success: false, error: error.message };
      }

      // 5. ارزیابی نتایج
      const successfulVerifications = Object.values(results).filter(r => r.success).length;
      const totalVerifications = Object.keys(results).length;
      const verificationScore = (successfulVerifications / totalVerifications) * 100;

      // 6. تصمیم‌گیری بر اساس امتیاز
      let overallVerification = false;
      let verificationLevel = 'LOW';

      if (verificationScore >= 80) {
        overallVerification = true;
        verificationLevel = 'HIGH';
      } else if (verificationScore >= 60) {
        overallVerification = true;
        verificationLevel = 'MEDIUM';
      }

      return {
        success: overallVerification,
        verificationScore: verificationScore,
        verificationLevel: verificationLevel,
        results: results,
        errors: errors,
        summary: {
          totalVerifications: totalVerifications,
          successfulVerifications: successfulVerifications,
          failedVerifications: totalVerifications - successfulVerifications,
          verificationDate: new Date(),
          operatorId: operatorId
        }
      };

    } catch (error) {
      console.error('❌ خطا در تایید هویت جامع:', error);
      throw new Error(`خطا در تایید هویت جامع: ${error.message}`);
    }
  }

  /**
   * ارسال درخواست به سازمان ثبت احوال
   */
  async sendCivilRegistryRequest(data) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: process.env.CIVIL_REGISTRY_HOST || 'api.sabt.gov.ir',
        port: 443,
        path: '/api/identity/verify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CIVIL_REGISTRY_API_KEY}`,
          'X-Request-ID': data.requestId
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            resolve(result);
          } catch (error) {
            reject(new Error('خطا در پردازش پاسخ ثبت احوال'));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(JSON.stringify(data));
      req.end();
    });
  }

  /**
   * ارسال درخواست به سازمان امور مالیاتی
   */
  async sendTaxOrganizationRequest(data) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: process.env.TAX_ORG_HOST || 'api.intamedia.ir',
        port: 443,
        path: '/api/tax/verify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TAX_ORG_API_KEY}`,
          'X-Request-ID': data.requestId
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            resolve(result);
          } catch (error) {
            reject(new Error('خطا در پردازش پاسخ سازمان امور مالیاتی'));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(JSON.stringify(data));
      req.end();
    });
  }

  /**
   * ارسال درخواست به بانک اطلاعات مشتریان
   */
  async sendCustomerDatabaseRequest(data) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: process.env.CUSTOMER_DB_HOST || 'api.cbi.ir',
        port: 443,
        path: '/api/customer/verify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CUSTOMER_DB_API_KEY}`,
          'X-Request-ID': data.requestId
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            resolve(result);
          } catch (error) {
            reject(new Error('خطا در پردازش پاسخ بانک اطلاعات مشتریان'));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(JSON.stringify(data));
      req.end();
    });
  }

  /**
   * اعتبارسنجی کد ملی
   */
  validateNationalId(nationalId) {
    // فرمت کد ملی: 10 رقم
    const nationalIdRegex = /^\d{10}$/;
    if (!nationalIdRegex.test(nationalId)) {
      return false;
    }

    // بررسی الگوریتم کد ملی
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(nationalId[i]) * (10 - i);
    }
    
    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;
    
    return parseInt(nationalId[9]) === checkDigit;
  }

  /**
   * اعتبارسنجی شماره تلفن
   */
  validatePhoneNumber(phone) {
    // فرمت شماره تلفن ایران: 09xxxxxxxxx
    const phoneRegex = /^09\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * تولید شناسه درخواست منحصر به فرد
   */
  generateRequestId() {
    return `IDV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * تست اتصال به سیستم‌های تایید هویت
   */
  async testIdentityVerificationSystems() {
    try {
      const results = {};
      
      // تست اتصال به بانک مرکزی
      try {
        const centralBankTest = await this.bankConnection.testRealConnections();
        results.centralBank = centralBankTest.central;
      } catch (error) {
        results.centralBank = { status: 'error', message: error.message };
      }

      // تست اتصال به سازمان ثبت احوال
      try {
        const civilTest = await this.sendCivilRegistryRequest({
          nationalId: '1234567890',
          requestId: this.generateRequestId(),
          timestamp: new Date().toISOString()
        });
        results.civilRegistry = { status: 'success', message: 'اتصال به ثبت احوال برقرار است' };
      } catch (error) {
        results.civilRegistry = { status: 'error', message: error.message };
      }

      // تست اتصال به سازمان امور مالیاتی
      try {
        const taxTest = await this.sendTaxOrganizationRequest({
          nationalId: '1234567890',
          requestId: this.generateRequestId(),
          timestamp: new Date().toISOString()
        });
        results.taxOrganization = { status: 'success', message: 'اتصال به سازمان امور مالیاتی برقرار است' };
      } catch (error) {
        results.taxOrganization = { status: 'error', message: error.message };
      }

      return results;
      
    } catch (error) {
      console.error('❌ خطا در تست سیستم‌های تایید هویت:', error);
      throw error;
    }
  }
}

module.exports = RealIdentityVerification;