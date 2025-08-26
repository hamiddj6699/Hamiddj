const RealBankConnection = require('./realBankConnection');
const crypto = require('crypto');

/**
 * سرویس مدیریت حساب‌های واقعی
 * Real Account Management Service
 */
class RealAccountManagement {
  constructor() {
    this.bankConnection = new RealBankConnection();
  }

  /**
   * تایید حساب واقعی از بانک ملی
   */
  async verifyRealAccount(accountNumber, nationalId, branchCode) {
    try {
      // 1. تایید فرمت شماره حساب
      if (!this.validateAccountNumber(accountNumber)) {
        throw new Error('فرمت شماره حساب نامعتبر است');
      }

      // 2. تایید کد ملی
      if (!this.validateNationalId(nationalId)) {
        throw new Error('کد ملی نامعتبر است');
      }

      // 3. ارسال درخواست به بانک ملی
      const accountData = {
        accountNumber: accountNumber,
        nationalId: nationalId,
        branchCode: branchCode,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 4. ارسال درخواست SOAP به بانک ملی
      const response = await this.bankConnection.sendNationalBankSOAPRequest(
        'VerifyAccount',
        accountData
      );

      // 5. پردازش پاسخ
      if (response.success && response.data.verificationResult === 'SUCCESS') {
        return {
          success: true,
          accountInfo: {
            accountNumber: accountNumber,
            accountType: response.data.accountType,
            accountStatus: response.data.accountStatus,
            balance: response.data.balance,
            currency: response.data.currency,
            ownerName: response.data.ownerName,
            nationalId: nationalId,
            branchCode: branchCode,
            verifiedAt: new Date(),
            verificationId: response.data.verificationId
          }
        };
      } else {
        throw new Error(response.data.errorMessage || 'حساب تایید نشد');
      }

    } catch (error) {
      console.error('❌ خطا در تایید حساب واقعی:', error);
      throw new Error(`خطا در تایید حساب: ${error.message}`);
    }
  }

  /**
   * بررسی موجودی حساب واقعی
   */
  async getRealAccountBalance(accountNumber, branchCode) {
    try {
      // 1. تایید فرمت شماره حساب
      if (!this.validateAccountNumber(accountNumber)) {
        throw new Error('فرمت شماره حساب نامعتبر است');
      }

      // 2. ارسال درخواست به بانک ملی
      const balanceData = {
        accountNumber: accountNumber,
        branchCode: branchCode,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 3. ارسال درخواست SOAP
      const response = await this.bankConnection.sendNationalBankSOAPRequest(
        'GetAccountBalance',
        balanceData
      );

      // 4. پردازش پاسخ
      if (response.success) {
        return {
          success: true,
          balance: {
            accountNumber: accountNumber,
            availableBalance: response.data.availableBalance,
            ledgerBalance: response.data.ledgerBalance,
            blockedAmount: response.data.blockedAmount,
            currency: response.data.currency,
            lastTransactionDate: response.data.lastTransactionDate,
            balanceDate: new Date()
          }
        };
      } else {
        throw new Error(response.data.errorMessage || 'خطا در دریافت موجودی');
      }

    } catch (error) {
      console.error('❌ خطا در دریافت موجودی حساب:', error);
      throw new Error(`خطا در دریافت موجودی: ${error.message}`);
    }
  }

  /**
   * بررسی وضعیت حساب
   */
  async getRealAccountStatus(accountNumber, branchCode) {
    try {
      // 1. تایید فرمت شماره حساب
      if (!this.validateAccountNumber(accountNumber)) {
        throw new Error('فرمت شماره حساب نامعتبر است');
      }

      // 2. ارسال درخواست به بانک ملی
      const statusData = {
        accountNumber: accountNumber,
        branchCode: branchCode,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 3. ارسال درخواست SOAP
      const response = await this.bankConnection.sendNationalBankSOAPRequest(
        'GetAccountStatus',
        statusData
      );

      // 4. پردازش پاسخ
      if (response.success) {
        return {
          success: true,
          status: {
            accountNumber: accountNumber,
            accountStatus: response.data.accountStatus,
            accountType: response.data.accountType,
            isActive: response.data.isActive,
            isBlocked: response.data.isBlocked,
            blockReason: response.data.blockReason,
            lastActivityDate: response.data.lastActivityDate,
            accountOpenDate: response.data.accountOpenDate,
            statusDate: new Date()
          }
        };
      } else {
        throw new Error(response.data.errorMessage || 'خطا در دریافت وضعیت حساب');
      }

    } catch (error) {
      console.error('❌ خطا در دریافت وضعیت حساب:', error);
      throw new Error(`خطا در دریافت وضعیت حساب: ${error.message}`);
    }
  }

  /**
   * بررسی تراکنش‌های اخیر حساب
   */
  async getRecentTransactions(accountNumber, branchCode, limit = 10) {
    try {
      // 1. تایید فرمت شماره حساب
      if (!this.validateAccountNumber(accountNumber)) {
        throw new Error('فرمت شماره حساب نامعتبر است');
      }

      // 2. ارسال درخواست به بانک ملی
      const transactionData = {
        accountNumber: accountNumber,
        branchCode: branchCode,
        limit: limit,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 3. ارسال درخواست SOAP
      const response = await this.bankConnection.sendNationalBankSOAPRequest(
        'GetRecentTransactions',
        transactionData
      );

      // 4. پردازش پاسخ
      if (response.success) {
        return {
          success: true,
          transactions: response.data.transactions.map(tx => ({
            transactionId: tx.transactionId,
            transactionType: tx.transactionType,
            amount: tx.amount,
            currency: tx.currency,
            description: tx.description,
            transactionDate: tx.transactionDate,
            balanceAfter: tx.balanceAfter,
            referenceNumber: tx.referenceNumber
          })),
          totalCount: response.data.totalCount
        };
      } else {
        throw new Error(response.data.errorMessage || 'خطا در دریافت تراکنش‌ها');
      }

    } catch (error) {
      console.error('❌ خطا در دریافت تراکنش‌های اخیر:', error);
      throw new Error(`خطا در دریافت تراکنش‌ها: ${error.message}`);
    }
  }

  /**
   * مسدود کردن حساب
   */
  async blockRealAccount(accountNumber, branchCode, reason, operatorId) {
    try {
      // 1. تایید فرمت شماره حساب
      if (!this.validateAccountNumber(accountNumber)) {
        throw new Error('فرمت شماره حساب نامعتبر است');
      }

      // 2. ارسال درخواست به بانک ملی
      const blockData = {
        accountNumber: accountNumber,
        branchCode: branchCode,
        reason: reason,
        operatorId: operatorId,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 3. ارسال درخواست SOAP
      const response = await this.bankConnection.sendNationalBankSOAPRequest(
        'BlockAccount',
        blockData
      );

      // 4. پردازش پاسخ
      if (response.success) {
        return {
          success: true,
          blockInfo: {
            accountNumber: accountNumber,
            blockStatus: 'BLOCKED',
            blockReason: reason,
            blockedBy: operatorId,
            blockedAt: new Date(),
            blockReference: response.data.blockReference
          }
        };
      } else {
        throw new Error(response.data.errorMessage || 'خطا در مسدود کردن حساب');
      }

    } catch (error) {
      console.error('❌ خطا در مسدود کردن حساب:', error);
      throw new Error(`خطا در مسدود کردن حساب: ${error.message}`);
    }
  }

  /**
   * باز کردن حساب مسدود
   */
  async unblockRealAccount(accountNumber, branchCode, reason, operatorId) {
    try {
      // 1. تایید فرمت شماره حساب
      if (!this.validateAccountNumber(accountNumber)) {
        throw new Error('فرمت شماره حساب نامعتبر است');
      }

      // 2. ارسال درخواست به بانک ملی
      const unblockData = {
        accountNumber: accountNumber,
        branchCode: branchCode,
        reason: reason,
        operatorId: operatorId,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 3. ارسال درخواست SOAP
      const response = await this.bankConnection.sendNationalBankSOAPRequest(
        'UnblockAccount',
        unblockData
      );

      // 4. پردازش پاسخ
      if (response.success) {
        return {
          success: true,
          unblockInfo: {
            accountNumber: accountNumber,
            blockStatus: 'UNBLOCKED',
            unblockReason: reason,
            unblockedBy: operatorId,
            unblockedAt: new Date(),
            unblockReference: response.data.unblockReference
          }
        };
      } else {
        throw new Error(response.data.errorMessage || 'خطا در باز کردن حساب');
      }

    } catch (error) {
      console.error('❌ خطا در باز کردن حساب:', error);
      throw new Error(`خطا در باز کردن حساب: ${error.message}`);
    }
  }

  /**
   * تغییر نوع حساب
   */
  async changeAccountType(accountNumber, branchCode, newType, operatorId) {
    try {
      // 1. تایید فرمت شماره حساب
      if (!this.validateAccountNumber(accountNumber)) {
        throw new Error('فرمت شماره حساب نامعتبر است');
      }

      // 2. تایید نوع حساب جدید
      if (!this.validateAccountType(newType)) {
        throw new Error('نوع حساب نامعتبر است');
      }

      // 3. ارسال درخواست به بانک ملی
      const changeData = {
        accountNumber: accountNumber,
        branchCode: branchCode,
        newType: newType,
        operatorId: operatorId,
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };

      // 4. ارسال درخواست SOAP
      const response = await this.bankConnection.sendNationalBankSOAPRequest(
        'ChangeAccountType',
        changeData
      );

      // 5. پردازش پاسخ
      if (response.success) {
        return {
          success: true,
          changeInfo: {
            accountNumber: accountNumber,
            oldType: response.data.oldType,
            newType: newType,
            changedBy: operatorId,
            changedAt: new Date(),
            changeReference: response.data.changeReference
          }
        };
      } else {
        throw new Error(response.data.errorMessage || 'خطا در تغییر نوع حساب');
      }

    } catch (error) {
      console.error('❌ خطا در تغییر نوع حساب:', error);
      throw new Error(`خطا در تغییر نوع حساب: ${error.message}`);
    }
  }

  /**
   * اعتبارسنجی شماره حساب
   */
  validateAccountNumber(accountNumber) {
    // فرمت شماره حساب بانک ملی: 13 رقم
    const accountRegex = /^\d{13}$/;
    return accountRegex.test(accountNumber);
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
   * اعتبارسنجی نوع حساب
   */
  validateAccountType(accountType) {
    const validTypes = ['جاری', 'پس‌انداز', 'سرمایه‌گذاری', 'قرض‌الحسنه'];
    return validTypes.includes(accountType);
  }

  /**
   * تولید شناسه درخواست منحصر به فرد
   */
  generateRequestId() {
    return `ACC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * تست اتصال به سیستم‌های بانکی
   */
  async testRealConnections() {
    try {
      const results = {};
      
      // تست اتصال به بانک ملی
      try {
        const testAccount = '1234567890123'; // شماره حساب تست
        const testNationalId = '1234567890'; // کد ملی تست
        const testBranch = '001'; // کد شعبه تست
        
        const accountTest = await this.verifyRealAccount(testAccount, testNationalId, testBranch);
        results.nationalBank = { status: 'success', message: 'اتصال به بانک ملی برقرار است' };
      } catch (error) {
        results.nationalBank = { status: 'error', message: error.message };
      }

      // تست اتصال به شبکه شتاب
      try {
        const shetabTest = await this.bankConnection.testRealConnections();
        results.shetab = shetabTest.shetab;
      } catch (error) {
        results.shetab = { status: 'error', message: error.message };
      }

      return results;
      
    } catch (error) {
      console.error('❌ خطا در تست اتصالات واقعی:', error);
      throw error;
    }
  }
}

module.exports = RealAccountManagement;