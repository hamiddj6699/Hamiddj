const RealHSMClient = require('./realHSMClient');
const DUKPTKeyManagement = require('./dukptKeyManagement');
const RealCardIssuance = require('./realCardIssuance');
const RealBankConnection = require('./realBankConnection');
const RealAccountManagement = require('./realAccountManagement');
const RealIdentityVerification = require('./realIdentityVerification');
const RealShetabIntegration = require('./realShetabIntegration');
const RealCardManagement = require('./realCardManagement');
const TokenProvider = require('./TokenProvider');
const { createMtlsAgent } = require('../utils/mtlsAgent');
const yaml = require('js-yaml');
const fs = require('fs');

/**
 * سیستم بانکی واقعی - سرویس اصلی
 * Real Banking System - Main Service
 */
class RealBankingSystem {
  constructor(config) {
    this.config = config;
    
    // سرویس‌های اصلی
    this.hsm = null;
    this.dukpt = null;
    this.cardIssuance = null;
    this.bankConnection = null;
    this.accountManagement = null;
    this.identityVerification = null;
    this.shetabIntegration = null;
    this.cardManagement = null;
    this.tokenProvider = null;
    
    // وضعیت سیستم
    this.initialized = false;
    this.healthStatus = {
      hsm: false,
      dukpt: false,
      banking: false,
      shetab: false,
      centralBank: false,
      nationalBank: false
    };
    
    // لاگ‌های عملیات
    this.operationLogs = [];
  }

  async initialize() {
    try {
      console.log('شروع راه‌اندازی سیستم بانکی واقعی...');
      
      // 1. بارگذاری فایل‌های کانفیگ
      await this.loadConfigurationFiles();
      
      // 2. راه‌اندازی HSM
      await this.initializeHSM();
      
      // 3. راه‌اندازی DUKPT
      await this.initializeDUKPT();
      
      // 4. راه‌اندازی اتصالات بانکی
      await this.initializeBankingConnections();
      
      // 5. راه‌اندازی سرویس صدور کارت
      await this.initializeCardIssuance();
      
      // 6. راه‌اندازی مدیریت کارت
      await this.initializeCardManagement();
      
      // 7. راه‌اندازی Token Provider
      await this.initializeTokenProvider();
      
      // 8. تست سلامت سیستم
      await this.performHealthCheck();
      
      this.initialized = true;
      console.log('سیستم بانکی واقعی با موفقیت راه‌اندازی شد');
      
      return true;
    } catch (error) {
      console.error('خطا در راه‌اندازی سیستم بانکی:', error);
      throw error;
    }
  }

  async loadConfigurationFiles() {
    try {
      // بارگذاری پروفایل‌های BIN
      if (this.config.binProfilesPath && fs.existsSync(this.config.binProfilesPath)) {
        const binProfilesContent = fs.readFileSync(this.config.binProfilesPath, 'utf8');
        this.binProfiles = yaml.load(binProfilesContent);
        console.log('پروفایل‌های BIN بارگذاری شدند');
      }
      
      // بارگذاری پروفایل‌های EMV
      if (this.config.emvProfilesPath && fs.existsSync(this.config.emvProfilesPath)) {
        const emvProfilesContent = fs.readFileSync(this.config.emvProfilesPath, 'utf8');
        this.emvProfiles = yaml.load(emvProfilesContent);
        console.log('پروفایل‌های EMV بارگذاری شدند');
      }
      
      // بارگذاری مشخصات سوئیچ
      if (this.config.switchSpecsPath && fs.existsSync(this.config.switchSpecsPath)) {
        const switchSpecsContent = fs.readFileSync(this.config.switchSpecsPath, 'utf8');
        this.switchSpecs = yaml.load(switchSpecsContent);
        console.log('مشخصات سوئیچ بارگذاری شدند');
      }
      
    } catch (error) {
      console.error('خطا در بارگذاری فایل‌های کانفیگ:', error);
      throw error;
    }
  }

  async initializeHSM() {
    try {
      console.log('راه‌اندازی HSM...');
      
      this.hsm = new RealHSMClient({
        endpoint: process.env.HSM_ENDPOINT,
        certPath: process.env.HSM_CERT_PATH,
        keyPath: process.env.HSM_KEY_PATH,
        caPath: process.env.HSM_CA_PATH,
        timeout: parseInt(process.env.HSM_TIMEOUT) || 30000,
        retryAttempts: parseInt(process.env.HSM_RETRY_ATTEMPTS) || 3
      });
      
      // آغاز جلسه HSM
      await this.hsm.initializeSession();
      
      // تست سلامت HSM
      const hsmHealth = await this.hsm.healthCheck();
      this.healthStatus.hsm = hsmHealth;
      
      if (hsmHealth) {
        console.log('HSM با موفقیت راه‌اندازی شد');
      } else {
        throw new Error('HSM سالم نیست');
      }
      
    } catch (error) {
      console.error('خطا در راه‌اندازی HSM:', error);
      throw error;
    }
  }

  async initializeDUKPT() {
    try {
      console.log('راه‌اندازی سرویس DUKPT...');
      
      this.dukpt = new DUKPTKeyManagement(this.hsm, {
        zmkLabel: process.env.ZMK_LABEL || 'ZMK_MASTER',
        zpkLabel: process.env.ZPK_LABEL || 'ZPK_DEFAULT',
        zdkLabel: process.env.ZDK_LABEL || 'ZDK_DEFAULT',
        bdkLabel: process.env.BDK_LABEL || 'BDK_MASTER',
        ipekLabel: process.env.IPEK_LABEL || 'IPEK_DEFAULT'
      });
      
      await this.dukpt.initialize();
      this.healthStatus.dukpt = true;
      
      console.log('سرویس DUKPT با موفقیت راه‌اندازی شد');
      
    } catch (error) {
      console.error('خطا در راه‌اندازی DUKPT:', error);
      throw error;
    }
  }

  async initializeBankingConnections() {
    try {
      console.log('راه‌اندازی اتصالات بانکی...');
      
      // ایجاد mTLS agents
      const shetabAgent = createMtlsAgent('SHETAB');
      const centralBankAgent = createMtlsAgent('CENTRAL_BANK');
      const nationalBankAgent = createMtlsAgent('NATIONAL_BANK');
      
      // راه‌اندازی اتصال بانکی
      this.bankConnection = new RealBankConnection({
        shetab: {
          host: process.env.SHETAB_SWITCH_HOST,
          port: parseInt(process.env.SHETAB_SWITCH_PORT),
          agent: shetabAgent,
          timeout: parseInt(process.env.SHETAB_SWITCH_TIMEOUT)
        },
        centralBank: {
          host: process.env.CENTRAL_BANK_HOST,
          port: parseInt(process.env.CENTRAL_BANK_PORT),
          agent: centralBankAgent,
          timeout: parseInt(process.env.CENTRAL_BANK_TIMEOUT)
        },
        nationalBank: {
          host: process.env.NATIONAL_BANK_HOST,
          port: parseInt(process.env.NATIONAL_BANK_PORT),
          agent: nationalBankAgent,
          timeout: parseInt(process.env.NATIONAL_BANK_TIMEOUT)
        }
      });
      
      // تست اتصالات
      const connections = await this.bankConnection.testRealConnections();
      this.healthStatus.shetab = connections.shetab;
      this.healthStatus.centralBank = connections.central;
      this.healthStatus.nationalBank = connections.national;
      this.healthStatus.banking = connections.shetab && connections.central && connections.national;
      
      if (this.healthStatus.banking) {
        console.log('اتصالات بانکی با موفقیت برقرار شدند');
      } else {
        throw new Error('برخی اتصالات بانکی برقرار نشدند');
      }
      
    } catch (error) {
      console.error('خطا در راه‌اندازی اتصالات بانکی:', error);
      throw error;
    }
  }

  async initializeCardIssuance() {
    try {
      console.log('راه‌اندازی سرویس صدور کارت...');
      
      this.cardIssuance = new RealCardIssuance({
        hsm: this.hsm,
        banking: this.bankConnection,
        binProfiles: this.binProfiles,
        emvProfiles: this.emvProfiles
      });
      
      await this.cardIssuance.initialize();
      
      console.log('سرویس صدور کارت با موفقیت راه‌اندازی شد');
      
    } catch (error) {
      console.error('خطا در راه‌اندازی سرویس صدور کارت:', error);
      throw error;
    }
  }

  async initializeCardManagement() {
    try {
      console.log('راه‌اندازی مدیریت کارت...');
      
      this.cardManagement = new RealCardManagement({
        hsm: this.hsm,
        dukpt: this.dukpt,
        shetabIntegration: this.shetabIntegration,
        accountManagement: this.accountManagement,
        identityVerification: this.identityVerification
      });
      
      console.log('مدیریت کارت با موفقیت راه‌اندازی شد');
      
    } catch (error) {
      console.error('خطا در راه‌اندازی مدیریت کارت:', error);
      throw error;
    }
  }

  async initializeTokenProvider() {
    try {
      console.log('راه‌اندازی Token Provider...');
      
      this.tokenProvider = new TokenProvider();
      
      console.log('Token Provider با موفقیت راه‌اندازی شد');
      
    } catch (error) {
      console.error('خطا در راه‌اندازی Token Provider:', error);
      throw error;
    }
  }

  async performHealthCheck() {
    try {
      console.log('انجام بررسی سلامت سیستم...');
      
      const healthResults = {
        timestamp: new Date(),
        hsm: this.healthStatus.hsm,
        dukpt: this.healthStatus.dukpt,
        banking: this.healthStatus.banking,
        shetab: this.healthStatus.shetab,
        centralBank: this.healthStatus.centralBank,
        nationalBank: this.healthStatus.nationalBank
      };
      
      // بررسی سلامت HSM
      if (this.hsm) {
        healthResults.hsm = await this.hsm.healthCheck();
      }
      
      // بررسی سلامت DUKPT
      if (this.dukpt) {
        const dukptStatus = await this.dukpt.getKeyStatus();
        healthResults.dukpt = dukptStatus.serviceStatus.initialized;
      }
      
      // بررسی سلامت اتصالات بانکی
      if (this.bankConnection) {
        const connections = await this.bankConnection.testRealConnections();
        healthResults.shetab = connections.shetab;
        healthResults.centralBank = connections.central;
        healthResults.nationalBank = connections.national;
        healthResults.banking = connections.shetab && connections.central && connections.national;
      }
      
      // به‌روزرسانی وضعیت کلی
      this.healthStatus = healthResults;
      
      console.log('بررسی سلامت سیستم تکمیل شد:', healthResults);
      
      return healthResults;
      
    } catch (error) {
      console.error('خطا در بررسی سلامت سیستم:', error);
      throw error;
    }
  }

  // ========================================
  // عملیات صدور کارت
  // ========================================
  
  async issueCard(customerData, accountData, cardType, operatorInfo) {
    try {
      if (!this.initialized) {
        throw new Error('سیستم بانکی راه‌اندازی نشده است');
      }
      
      console.log(`صدور کارت ${cardType} برای مشتری ${customerData.customerId}`);
      
      const result = await this.cardIssuance.issueCard(
        customerData,
        accountData,
        cardType,
        operatorInfo
      );
      
      // ثبت لاگ عملیات
      this.logOperation('CARD_ISSUANCE', {
        customerId: customerData.customerId,
        cardType: cardType,
        result: result.success ? 'SUCCESS' : 'FAILED',
        operatorId: operatorInfo.operatorId
      });
      
      return result;
      
    } catch (error) {
      console.error('خطا در صدور کارت:', error);
      
      // ثبت لاگ خطا
      this.logOperation('CARD_ISSUANCE_ERROR', {
        customerId: customerData.customerId,
        cardType: cardType,
        error: error.message,
        operatorId: operatorInfo.operatorId
      });
      
      throw error;
    }
  }

  async issueReplacementCard(originalCardNumber, reason, operatorInfo) {
    try {
      if (!this.initialized) {
        throw new Error('سیستم بانکی راه‌اندازی نشده است');
      }
      
      console.log(`صدور کارت جایگزین برای کارت ${originalCardNumber}`);
      
      const result = await this.cardIssuance.issueReplacementCard(
        originalCardNumber,
        reason,
        operatorInfo
      );
      
      // ثبت لاگ عملیات
      this.logOperation('REPLACEMENT_CARD_ISSUANCE', {
        originalCard: originalCardNumber,
        reason: reason,
        result: result.success ? 'SUCCESS' : 'FAILED',
        operatorId: operatorInfo.operatorId
      });
      
      return result;
      
    } catch (error) {
      console.error('خطا در صدور کارت جایگزین:', error);
      throw error;
    }
  }

  async issueEmergencyCard(customerData, accountData, emergencyReason, operatorInfo) {
    try {
      if (!this.initialized) {
        throw new Error('سیستم بانکی راه‌اندازی نشده است');
      }
      
      console.log(`صدور کارت اضطراری برای مشتری ${customerData.customerId}`);
      
      const result = await this.cardIssuance.issueEmergencyCard(
        customerData,
        accountData,
        emergencyReason,
        operatorInfo
      );
      
      // ثبت لاگ عملیات
      this.logOperation('EMERGENCY_CARD_ISSUANCE', {
        customerId: customerData.customerId,
        emergencyReason: emergencyReason,
        result: result.success ? 'SUCCESS' : 'FAILED',
        operatorId: operatorInfo.operatorId
      });
      
      return result;
      
    } catch (error) {
      console.error('خطا در صدور کارت اضطراری:', error);
      throw error;
    }
  }

  // ========================================
  // عملیات مدیریت کلید
  // ========================================
  
  async rotateZoneKeys(participants, ceremonyType) {
    try {
      if (!this.initialized) {
        throw new Error('سیستم بانکی راه‌اندازی نشده است');
      }
      
      console.log(`شروع چرخش کلیدهای Zone: ${ceremonyType}`);
      
      const result = await this.dukpt.performKeyCeremony(participants, ceremonyType);
      
      // ثبت لاگ عملیات
      this.logOperation('ZONE_KEY_ROTATION', {
        ceremonyType: ceremonyType,
        participants: participants.length,
        result: result.success ? 'SUCCESS' : 'FAILED'
      });
      
      return result;
      
    } catch (error) {
      console.error('خطا در چرخش کلیدهای Zone:', error);
      throw error;
    }
  }

  async getKeyStatus() {
    try {
      if (!this.initialized || !this.dukpt) {
        throw new Error('سیستم بانکی یا DUKPT راه‌اندازی نشده است');
      }
      
      return await this.dukpt.getKeyStatus();
      
    } catch (error) {
      console.error('خطا در دریافت وضعیت کلیدها:', error);
      throw error;
    }
  }

  // ========================================
  // عملیات مدیریت کارت
  // ========================================
  
  async blockCard(cardNumber, reason, operatorInfo) {
    try {
      if (!this.initialized) {
        throw new Error('سیستم بانکی راه‌اندازی نشده است');
      }
      
      console.log(`مسدود کردن کارت ${cardNumber}`);
      
      const result = await this.cardManagement.blockCard(cardNumber, reason, operatorInfo);
      
      // ثبت لاگ عملیات
      this.logOperation('CARD_BLOCK', {
        cardNumber: cardNumber,
        reason: reason,
        result: result.success ? 'SUCCESS' : 'FAILED',
        operatorId: operatorInfo.operatorId
      });
      
      return result;
      
    } catch (error) {
      console.error('خطا در مسدود کردن کارت:', error);
      throw error;
    }
  }

  async unblockCard(cardNumber, operatorInfo) {
    try {
      if (!this.initialized) {
        throw new Error('سیستم بانکی راه‌اندازی نشده است');
      }
      
      console.log(`آزادسازی کارت ${cardNumber}`);
      
      const result = await this.cardManagement.unblockCard(cardNumber, operatorInfo);
      
      // ثبت لاگ عملیات
      this.logOperation('CARD_UNBLOCK', {
        cardNumber: cardNumber,
        result: result.success ? 'SUCCESS' : 'FAILED',
        operatorId: operatorInfo.operatorId
      });
      
      return result;
      
    } catch (error) {
      console.error('خطا در آزادسازی کارت:', error);
      throw error;
    }
  }

  async changePin(cardNumber, newPin, operatorInfo) {
    try {
      if (!this.initialized) {
        throw new Error('سیستم بانکی راه‌اندازی نشده است');
      }
      
      console.log(`تغییر PIN کارت ${cardNumber}`);
      
      const result = await this.cardManagement.changePin(cardNumber, newPin, operatorInfo);
      
      // ثبت لاگ عملیات
      this.logOperation('PIN_CHANGE', {
        cardNumber: cardNumber,
        result: result.success ? 'SUCCESS' : 'FAILED',
        operatorId: operatorInfo.operatorId
      });
      
      return result;
      
    } catch (error) {
      console.error('خطا در تغییر PIN:', error);
      throw error;
    }
  }

  // ========================================
  // عملیات تأیید هویت و حساب
  // ========================================
  
  async verifyCustomerIdentity(identityData) {
    try {
      if (!this.initialized) {
        throw new Error('سیستم بانکی راه‌اندازی نشده است');
      }
      
      console.log('تأیید هویت مشتری');
      
      const result = await this.identityVerification.verifyCustomerIdentity(identityData);
      
      // ثبت لاگ عملیات
      this.logOperation('IDENTITY_VERIFICATION', {
        nationalId: identityData.nationalId,
        result: result.verified ? 'VERIFIED' : 'REJECTED'
      });
      
      return result;
      
    } catch (error) {
      console.error('خطا در تأیید هویت مشتری:', error);
      throw error;
    }
  }

  async verifyAccount(accountData) {
    try {
      if (!this.initialized) {
        throw new Error('سیستم بانکی راه‌اندازی نشده است');
      }
      
      console.log(`تأیید حساب ${accountData.accountNumber}`);
      
      const result = await this.accountManagement.verifyAccount(accountData);
      
      // ثبت لاگ عملیات
      this.logOperation('ACCOUNT_VERIFICATION', {
        accountNumber: accountData.accountNumber,
        result: result.verified ? 'VERIFIED' : 'REJECTED'
      });
      
      return result;
      
    } catch (error) {
      console.error('خطا در تأیید حساب:', error);
      throw error;
    }
  }

  // ========================================
  // عملیات گزارش‌گیری
  // ========================================
  
  async generateSystemReport() {
    try {
      if (!this.initialized) {
        throw new Error('سیستم بانکی راه‌اندازی نشده است');
      }
      
      console.log('تولید گزارش سیستم');
      
      const report = {
        timestamp: new Date(),
        systemStatus: {
          initialized: this.initialized,
          healthStatus: this.healthStatus
        },
        hsmStatus: this.hsm ? await this.hsm.healthCheck() : false,
        dukptStatus: this.dukpt ? (await this.dukpt.getKeyStatus()).serviceStatus.initialized : false,
        bankingConnections: this.healthStatus.banking,
        operationLogs: this.operationLogs.length,
        recentOperations: this.operationLogs.slice(-10)
      };
      
      return report;
      
    } catch (error) {
      console.error('خطا در تولید گزارش سیستم:', error);
      throw error;
    }
  }

  async getOperationLogs(filters = {}) {
    try {
      let logs = [...this.operationLogs];
      
      // اعمال فیلترها
      if (filters.operationType) {
        logs = logs.filter(log => log.operationType === filters.operationType);
      }
      
      if (filters.operatorId) {
        logs = logs.filter(log => log.operatorId === filters.operatorId);
      }
      
      if (filters.startDate) {
        logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
      }
      
      if (filters.endDate) {
        logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
      }
      
      return logs;
      
    } catch (error) {
      console.error('خطا در دریافت لاگ‌های عملیات:', error);
      throw error;
    }
  }

  // ========================================
  // عملیات کمکی
  // ========================================
  
  logOperation(operationType, data) {
    const logEntry = {
      timestamp: new Date(),
      operationType: operationType,
      data: data
    };
    
    this.operationLogs.push(logEntry);
    
    // نگهداری فقط 1000 لاگ آخر
    if (this.operationLogs.length > 1000) {
      this.operationLogs = this.operationLogs.slice(-1000);
    }
    
    console.log(`عملیات ثبت شد: ${operationType}`, data);
  }

  async closeSystem() {
    try {
      console.log('بستن سیستم بانکی...');
      
      // بستن HSM
      if (this.hsm) {
        await this.hsm.closeSession();
      }
      
      // بستن DUKPT
      if (this.dukpt) {
        await this.dukpt.closeService();
      }
      
      // بستن صدور کارت
      if (this.cardIssuance) {
        await this.cardIssuance.closeService();
      }
      
      this.initialized = false;
      console.log('سیستم بانکی با موفقیت بسته شد');
      
    } catch (error) {
      console.error('خطا در بستن سیستم بانکی:', error);
      throw error;
    }
  }

  // ========================================
  // Getters
  // ========================================
  
  getSystemStatus() {
    return {
      initialized: this.initialized,
      healthStatus: this.healthStatus,
      timestamp: new Date()
    };
  }

  getConfiguration() {
    return {
      binProfiles: this.binProfiles,
      emvProfiles: this.emvProfiles,
      switchSpecs: this.switchSpecs
    };
  }
}

module.exports = RealBankingSystem;