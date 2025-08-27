/**
 * شبیه‌ساز HSM برای تست
 * Mock HSM Client for Testing
 */

const crypto = require('crypto');

class MockHSMClient {
  constructor(config = {}) {
    this.config = {
      endpoint: config.endpoint || 'mock://hsm.local:8443',
      clientId: config.clientId || 'MOCK_HSM_CLIENT',
      timeout: config.timeout || 5000,
      ...config
    };
    
    this.sessionId = null;
    this.sequenceNumber = 0;
    this.keys = new Map();
    this.sessions = new Map();
    
    // کلیدهای پیش‌فرض برای تست
    this.initializeDefaultKeys();
  }

  initializeDefaultKeys() {
    // کلیدهای Zone
    this.keys.set('ZMK_MASTER', this.generateKey('AES-256'));
    this.keys.set('ZPK_DEFAULT', this.generateKey('AES-256'));
    this.keys.set('ZDK_DEFAULT', this.generateKey('AES-256'));
    
    // کلیدهای DUKPT
    this.keys.set('BDK_MASTER', this.generateKey('AES-256'));
    this.keys.set('IPEK_DEFAULT', this.generateKey('AES-256'));
  }

  generateKey(algorithm) {
    return crypto.randomBytes(32).toString('hex');
  }

  async initializeSession() {
    try {
      this.sessionId = crypto.randomBytes(16).toString('hex');
      this.sequenceNumber = 0;
      
      this.sessions.set(this.sessionId, {
        createdAt: new Date(),
        sequenceNumber: 0,
        active: true
      });
      
      return {
        success: true,
        sessionId: this.sessionId,
        timestamp: new Date(),
        status: 'ACTIVE'
      };
    } catch (error) {
      throw new Error(`خطا در راه‌اندازی نشست HSM: ${error.message}`);
    }
  }

  async generateCardKeys(params = {}) {
    try {
      const cardNumber = params.cardNumber || crypto.randomBytes(8).toString('hex');
      const keyType = params.keyType || 'EMV';
      
      const keys = {
        cardNumber: cardNumber,
        keyType: keyType,
        encKey: this.generateKey('AES-256'),
        macKey: this.generateKey('AES-256'),
        kek: this.generateKey('AES-256'),
        generatedAt: new Date()
      };
      
      return {
        success: true,
        keys: keys,
        sessionId: this.sessionId
      };
    } catch (error) {
      throw new Error(`خطا در تولید کلیدهای کارت: ${error.message}`);
    }
  }

  async generatePin(params = {}) {
    try {
      const cardNumber = params.cardNumber;
      const pinLength = params.length || 4;
      const algorithm = params.algorithm || 'RANDOM';
      
      let pin;
      switch (algorithm) {
        case 'RANDOM':
          pin = this.generateRandomPIN(pinLength);
          break;
        case 'HASH_BASED':
          pin = this.generateHashBasedPIN(cardNumber, pinLength);
          break;
        default:
          pin = this.generateRandomPIN(pinLength);
      }
      
      return {
        success: true,
        pin: pin,
        maskedPin: this.maskPIN(pin),
        algorithm: algorithm,
        generatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`خطا در تولید PIN: ${error.message}`);
    }
  }

  generateRandomPIN(length) {
    let pin = '';
    for (let i = 0; i < length; i++) {
      pin += Math.floor(Math.random() * 10);
    }
    return pin;
  }

  generateHashBasedPIN(cardNumber, length) {
    const hash = crypto.createHash('sha256').update(cardNumber).digest('hex');
    const numbers = hash.replace(/[^0-9]/g, '');
    return numbers.substring(0, length);
  }

  maskPIN(pin) {
    if (pin.length <= 2) return '*'.repeat(pin.length);
    return pin[0] + '*'.repeat(pin.length - 2) + pin[pin.length - 1];
  }

  async generateCvv2(params = {}) {
    try {
      const cardNumber = params.cardNumber;
      const expiryDate = params.expiryDate;
      const serviceCode = params.serviceCode || '000';
      
      const data = cardNumber + expiryDate + serviceCode;
      const hash = crypto.createHash('md5').update(data).digest('hex');
      const cvv2 = hash.replace(/[^0-9]/g, '').substring(0, 3);
      
      return {
        success: true,
        cvv2: cvv2,
        algorithm: 'MD5_HASH',
        generatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`خطا در تولید CVV2: ${error.message}`);
    }
  }

  async generateEmvChip(params = {}) {
    try {
      const cardNumber = params.cardNumber;
      const aid = params.aid || 'A0000002480200';
      
      const emvData = {
        aid: aid,
        applicationLabel: 'IRAN DEBIT',
        cardNumber: cardNumber,
        chipData: crypto.randomBytes(64).toString('hex'),
        generatedAt: new Date()
      };
      
      return {
        success: true,
        emvData: emvData
      };
    } catch (error) {
      throw new Error(`خطا در تولید تراشه EMV: ${error.message}`);
    }
  }

  async translatePin(params = {}) {
    try {
      const pinBlock = params.pinBlock;
      const sourceFormat = params.sourceFormat || 'ISO0';
      const targetFormat = params.targetFormat || 'ISO0';
      const sourceKey = params.sourceKey || 'ZPK_DEFAULT';
      const targetKey = params.targetKey || 'ZPK_DEFAULT';
      
      // شبیه‌سازی ترجمه PIN
      const translatedPin = this.generateRandomPIN(4);
      
      return {
        success: true,
        originalPinBlock: pinBlock,
        translatedPinBlock: crypto.randomBytes(8).toString('hex'),
        sourceFormat: sourceFormat,
        targetFormat: targetFormat,
        sourceKey: sourceKey,
        targetKey: targetKey,
        translatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`خطا در ترجمه PIN: ${error.message}`);
    }
  }

  async verifyPin(params = {}) {
    try {
      const pin = params.pin;
      const cardNumber = params.cardNumber;
      const storedPinHash = params.storedPinHash;
      
      // شبیه‌سازی تایید PIN
      const isValid = Math.random() > 0.1; // 90% موفقیت
      
      return {
        success: true,
        isValid: isValid,
        verifiedAt: new Date(),
        attempts: Math.floor(Math.random() * 3) + 1
      };
    } catch (error) {
      throw new Error(`خطا در تایید PIN: ${error.message}`);
    }
  }

  async generateDigitalSignature(data, keyLabel = 'ZMK_MASTER') {
    try {
      const key = this.keys.get(keyLabel) || this.generateKey('AES-256');
      const signature = crypto.createHmac('sha256', key).update(data).digest('hex');
      
      return {
        success: true,
        signature: signature,
        algorithm: 'HMAC-SHA256',
        keyLabel: keyLabel,
        generatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`خطا در تولید امضای دیجیتال: ${error.message}`);
    }
  }

  async healthCheck() {
    try {
      return {
        success: true,
        status: 'HEALTHY',
        timestamp: new Date(),
        uptime: process.uptime(),
        activeSessions: this.sessions.size,
        totalKeys: this.keys.size
      };
    } catch (error) {
      throw new Error(`خطا در بررسی سلامت HSM: ${error.message}`);
    }
  }

  async closeSession() {
    try {
      if (this.sessionId) {
        this.sessions.delete(this.sessionId);
        this.sessionId = null;
        this.sequenceNumber = 0;
      }
      
      return {
        success: true,
        message: 'نشست HSM بسته شد',
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`خطا در بستن نشست HSM: ${error.message}`);
    }
  }
}

module.exports = MockHSMClient;