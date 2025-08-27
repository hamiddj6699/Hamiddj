const crypto = require('crypto');
const RealHSMClient = require('./realHSMClient');

/**
 * سرویس مدیریت کلیدهای DUKPT و Zone برای بانک‌ها
 * DUKPT and Zone Key Management Service for Banks
 */
class DUKPTKeyManagement {
  constructor(hsmClient, config) {
    this.hsm = hsmClient;
    this.config = config;
    
    // کلیدهای Zone
    this.zoneMasterKey = null;
    this.zonePinKey = null;
    this.zoneDataKey = null;
    
    // کلیدهای DUKPT
    this.bdk = null; // Base Derivation Key
    this.ipek = null; // Initial PIN Encryption Key
    this.ksn = null; // Key Serial Number
    
    this.initialized = false;
  }

  async initialize() {
    try {
      // بارگذاری کلیدهای Zone از HSM
      await this.loadZoneKeys();
      
      // بارگذاری کلیدهای DUKPT از HSM
      await this.loadDUKPTKeys();
      
      this.initialized = true;
      console.log('سرویس مدیریت کلیدهای DUKPT با موفقیت راه‌اندازی شد');
      return true;
    } catch (error) {
      console.error('خطا در راه‌اندازی سرویس DUKPT:', error);
      throw error;
    }
  }

  async loadZoneKeys() {
    try {
      // بارگذاری Zone Master Key (ZMK)
      const zmkResponse = await this.hsm.loadKey({
        operation: 'LOAD_KEY',
        keyLabel: this.config.zmkLabel || 'ZMK_MASTER',
        keyType: 'ZMK',
        usage: 'KEY_WRAP'
      });

      if (zmkResponse.status === 'SUCCESS') {
        this.zoneMasterKey = {
          handle: zmkResponse.keyHandle,
          label: zmkResponse.keyLabel,
          type: 'ZMK',
          loadedAt: new Date()
        };
      }

      // بارگذاری Zone PIN Key (ZPK)
      const zpkResponse = await this.hsm.loadKey({
        operation: 'LOAD_KEY',
        keyLabel: this.config.zpkLabel || 'ZPK_DEFAULT',
        keyType: 'ZPK',
        usage: 'PIN_ENCRYPTION'
      });

      if (zpkResponse.status === 'SUCCESS') {
        this.zonePinKey = {
          handle: zpkResponse.keyHandle,
          label: zpkResponse.keyLabel,
          type: 'ZPK',
          loadedAt: new Date()
        };
      }

      // بارگذاری Zone Data Key (ZDK)
      const zdkResponse = await this.hsm.loadKey({
        operation: 'LOAD_KEY',
        keyLabel: this.config.zdkLabel || 'ZDK_DEFAULT',
        keyType: 'ZDK',
        usage: 'DATA_ENCRYPTION'
      });

      if (zdkResponse.status === 'SUCCESS') {
        this.zoneDataKey = {
          handle: zdkResponse.keyHandle,
          label: zdkResponse.keyLabel,
          type: 'ZDK',
          loadedAt: new Date()
        };
      }

      console.log('کلیدهای Zone با موفقیت بارگذاری شدند');
    } catch (error) {
      console.error('خطا در بارگذاری کلیدهای Zone:', error);
      throw error;
    }
  }

  async loadDUKPTKeys() {
    try {
      // بارگذاری Base Derivation Key (BDK)
      const bdkResponse = await this.hsm.loadKey({
        operation: 'LOAD_KEY',
        keyLabel: this.config.bdkLabel || 'BDK_MASTER',
        keyType: 'BDK',
        usage: 'KEY_DERIVATION'
      });

      if (bdkResponse.status === 'SUCCESS') {
        this.bdk = {
          handle: bdkResponse.keyHandle,
          label: bdkResponse.keyLabel,
          type: 'BDK',
          loadedAt: new Date()
        };
      }

      // بارگذاری Initial PIN Encryption Key (IPEK)
      const ipekResponse = await this.hsm.loadKey({
        operation: 'LOAD_KEY',
        keyLabel: this.config.ipekLabel || 'IPEK_DEFAULT',
        keyType: 'IPEK',
        usage: 'PIN_ENCRYPTION'
      });

      if (ipekResponse.status === 'SUCCESS') {
        this.ipek = {
          handle: ipekResponse.keyHandle,
          label: ipekResponse.keyLabel,
          type: 'IPEK',
          loadedAt: new Date()
        };
      }

      // تولید Key Serial Number (KSN)
      this.ksn = this.generateKSN();

      console.log('کلیدهای DUKPT با موفقیت بارگذاری شدند');
    } catch (error) {
      console.error('خطا در بارگذاری کلیدهای DUKPT:', error);
      throw error;
    }
  }

  generateKSN() {
    // تولید KSN منحصر به فرد
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    const ksn = `${timestamp.toString(16)}${random.toString(16).padStart(6, '0')}`;
    return ksn.padEnd(20, '0');
  }

  async deriveSessionKey(ksn, keyType = 'PIN') {
    try {
      if (!this.initialized) {
        throw new Error('سرویس DUKPT راه‌اندازی نشده است');
      }

      const request = {
        operation: 'DERIVE_SESSION_KEY',
        bdkHandle: this.bdk.handle,
        ipekHandle: this.ipek.handle,
        ksn: ksn,
        keyType: keyType,
        derivationMethod: 'DUKPT'
      };

      const response = await this.hsm.sendHSMRequest(request);
      
      if (response.status === 'SUCCESS') {
        return {
          sessionKey: response.sessionKey,
          ksn: ksn,
          keyType: keyType,
          derivedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 ساعت
        };
      } else {
        throw new Error(`خطا در تولید کلید جلسه: ${response.errorMessage}`);
      }
    } catch (error) {
      console.error('خطا در تولید کلید جلسه DUKPT:', error);
      throw error;
    }
  }

  async translatePin(pinBlock, sourceFormat, targetFormat, sourceKeyLabel, targetKeyLabel) {
    try {
      if (!this.initialized) {
        throw new Error('سرویس DUKPT راه‌اندازی نشده است');
      }

      // استفاده از HSM برای ترجمه PIN
      const translationResult = await this.hsm.translatePin({
        sourcePinBlock: pinBlock,
        sourceFormat: sourceFormat,
        targetFormat: targetFormat,
        sourceKeyLabel: sourceKeyLabel,
        targetKeyLabel: targetKeyLabel
      });

      return {
        success: true,
        translatedPinBlock: translationResult.translatedPinBlock,
        targetFormat: translationResult.targetFormat,
        referenceId: translationResult.referenceId,
        translatedAt: new Date()
      };

    } catch (error) {
      console.error('خطا در ترجمه PIN:', error);
      throw error;
    }
  }

  async generatePinUnderZPK(pin, cardNumber, customerId) {
    try {
      if (!this.initialized || !this.zonePinKey) {
        throw new Error('کلید ZPK در دسترس نیست');
      }

      // تولید PIN تحت ZPK
      const pinResult = await this.hsm.generatePin({
        cardNumber: cardNumber,
        customerId: customerId,
        pinPolicy: {
          length: 4,
          allowRepeatedDigits: false,
          allowSequentialDigits: false,
          maxAttempts: 3
        },
        keyLabel: this.zonePinKey.label,
        pinBlockFormat: 'ISO_0'
      });

      return {
        success: true,
        pinReference: pinResult.pinReference,
        maskedPin: pinResult.maskedPin,
        pinBlock: pinResult.pinBlock,
        pinBlockFormat: pinResult.pinBlockFormat,
        referenceId: pinResult.referenceId,
        generatedUnderZPK: true,
        zpkLabel: this.zonePinKey.label
      };

    } catch (error) {
      console.error('خطا در تولید PIN تحت ZPK:', error);
      throw error;
    }
  }

  async rotateZoneKeys() {
    try {
      if (!this.initialized) {
        throw new Error('سرویس DUKPT راه‌اندازی نشده است');
      }

      console.log('شروع فرآیند چرخش کلیدهای Zone...');

      // 1. تولید کلیدهای جدید
      const newZMK = await this.generateNewZoneKey('ZMK');
      const newZPK = await this.generateNewZoneKey('ZPK');
      const newZDK = await this.generateNewZoneKey('ZDK');

      // 2. انتقال کلیدهای قدیمی تحت کلیدهای جدید
      await this.transferKeysUnderNewZMK(newZMK, [this.zoneMasterKey, this.zonePinKey, this.zoneDataKey]);

      // 3. به‌روزرسانی کلیدهای فعال
      this.zoneMasterKey = newZMK;
      this.zonePinKey = newZPK;
      this.zoneDataKey = newZDK;

      // 4. ثبت فرآیند چرخش
      await this.logKeyRotation('ZONE_KEYS', {
        oldKeys: [this.zoneMasterKey, this.zonePinKey, this.zoneDataKey],
        newKeys: [newZMK, newZPK, newZDK],
        rotatedAt: new Date()
      });

      console.log('کلیدهای Zone با موفقیت چرخش یافتند');
      return true;

    } catch (error) {
      console.error('خطا در چرخش کلیدهای Zone:', error);
      throw error;
    }
  }

  async generateNewZoneKey(keyType) {
    try {
      const request = {
        operation: 'GENERATE_ZONE_KEY',
        keyType: keyType,
        algorithm: 'AES_256',
        usage: this.getKeyUsage(keyType),
        exportable: false,
        extractable: false
      };

      const response = await this.hsm.sendHSMRequest(request);
      
      if (response.status === 'SUCCESS') {
        return {
          handle: response.keyHandle,
          label: response.keyLabel,
          type: keyType,
          generatedAt: new Date(),
          algorithm: response.algorithm,
          size: response.keySize
        };
      } else {
        throw new Error(`خطا در تولید کلید Zone جدید: ${response.errorMessage}`);
      }
    } catch (error) {
      console.error(`خطا در تولید کلید Zone جدید ${keyType}:`, error);
      throw error;
    }
  }

  getKeyUsage(keyType) {
    switch (keyType) {
      case 'ZMK':
        return 'KEY_WRAP';
      case 'ZPK':
        return 'PIN_ENCRYPTION';
      case 'ZDK':
        return 'DATA_ENCRYPTION';
      default:
        return 'GENERAL';
    }
  }

  async transferKeysUnderNewZMK(newZMK, oldKeys) {
    try {
      for (const oldKey of oldKeys) {
        if (oldKey && oldKey.handle) {
          const request = {
            operation: 'TRANSFER_KEY',
            sourceKeyHandle: oldKey.handle,
            targetKeyHandle: newZMK.handle,
            transferMethod: 'KEY_WRAP'
          };

          const response = await this.hsm.sendHSMRequest(request);
          
          if (response.status !== 'SUCCESS') {
            throw new Error(`خطا در انتقال کلید ${oldKey.type}: ${response.errorMessage}`);
          }
        }
      }

      console.log('تمام کلیدها تحت ZMK جدید منتقل شدند');
    } catch (error) {
      console.error('خطا در انتقال کلیدها:', error);
      throw error;
    }
  }

  async logKeyRotation(rotationType, details) {
    try {
      // ثبت در لاگ عملیات
      const logEntry = {
        operationType: 'KEY_ROTATION',
        data: {
          rotationType: rotationType,
          details: details
        },
        priority: 'CRITICAL',
        tags: ['key_rotation', 'security', 'dukpt'],
        result: {
          success: true,
          rotatedAt: new Date()
        }
      };

      // اینجا می‌توانید لاگ را در پایگاه داده ذخیره کنید
      console.log('فرآیند چرخش کلید ثبت شد:', logEntry);
    } catch (error) {
      console.error('خطا در ثبت فرآیند چرخش کلید:', error);
    }
  }

  async performKeyCeremony(participants, ceremonyType) {
    try {
      if (!this.initialized) {
        throw new Error('سرویس DUKPT راه‌اندازی نشده است');
      }

      console.log(`شروع تشریفات کلید ${ceremonyType}...`);

      // 1. تأیید حضور تمام شرکت‌کنندگان
      const allPresent = await this.verifyParticipants(participants);
      if (!allPresent) {
        throw new Error('تمام شرکت‌کنندگان باید حضور داشته باشند');
      }

      // 2. تولید کلیدهای جدید
      const newKeys = await this.generateCeremonyKeys(ceremonyType);

      // 3. توزیع کلیدها بین شرکت‌کنندگان
      const distributedKeys = await this.distributeKeysToParticipants(newKeys, participants);

      // 4. تأیید نهایی
      const finalConfirmation = await this.getFinalConfirmation(participants, distributedKeys);

      if (finalConfirmation.confirmed) {
        // 5. فعال‌سازی کلیدهای جدید
        await this.activateNewKeys(newKeys);

        console.log(`تشریفات کلید ${ceremonyType} با موفقیت انجام شد`);
        return {
          success: true,
          ceremonyType: ceremonyType,
          newKeys: newKeys,
          participants: participants,
          completedAt: new Date()
        };
      } else {
        throw new Error('تشریفات کلید تأیید نشد');
      }

    } catch (error) {
      console.error(`خطا در تشریفات کلید ${ceremonyType}:`, error);
      throw error;
    }
  }

  async verifyParticipants(participants) {
    // تأیید حضور شرکت‌کنندگان (می‌تواند شامل تأیید هویت باشد)
    return participants.every(participant => 
      participant.id && participant.name && participant.role
    );
  }

  async generateCeremonyKeys(ceremonyType) {
    try {
      const keys = {};
      
      switch (ceremonyType) {
        case 'ZMK_ROTATION':
          keys.zmk = await this.generateNewZoneKey('ZMK');
          break;
        case 'ZPK_ROTATION':
          keys.zpk = await this.generateNewZoneKey('ZPK');
          break;
        case 'FULL_ROTATION':
          keys.zmk = await this.generateNewZoneKey('ZMK');
          keys.zpk = await this.generateNewZoneKey('ZPK');
          keys.zdk = await this.generateNewZoneKey('ZDK');
          break;
        default:
          throw new Error(`نوع تشریفات کلید نامعتبر: ${ceremonyType}`);
      }

      return keys;
    } catch (error) {
      console.error('خطا در تولید کلیدهای تشریفات:', error);
      throw error;
    }
  }

  async distributeKeysToParticipants(keys, participants) {
    try {
      const distributed = {};
      
      for (const [keyType, key] of Object.entries(keys)) {
        distributed[keyType] = {};
        
        for (const participant of participants) {
          if (participant.role === 'KEY_HOLDER' || participant.role === 'ADMIN') {
            // توزیع کلید به شرکت‌کننده
            const keyShare = await this.createKeyShare(key, participant);
            distributed[keyType][participant.id] = keyShare;
          }
        }
      }

      return distributed;
    } catch (error) {
      console.error('خطا در توزیع کلیدها:', error);
      throw error;
    }
  }

  async createKeyShare(key, participant) {
    try {
      const request = {
        operation: 'CREATE_KEY_SHARE',
        keyHandle: key.handle,
        participantId: participant.id,
        participantRole: participant.role,
        shareMethod: 'KEY_SPLITTING'
      };

      const response = await this.hsm.sendHSMRequest(request);
      
      if (response.status === 'SUCCESS') {
        return {
          shareId: response.shareId,
          participantId: participant.id,
          role: participant.role,
          createdAt: new Date()
        };
      } else {
        throw new Error(`خطا در ایجاد سهم کلید: ${response.errorMessage}`);
      }
    } catch (error) {
      console.error('خطا در ایجاد سهم کلید:', error);
      throw error;
    }
  }

  async getFinalConfirmation(participants, distributedKeys) {
    try {
      // درخواست تأیید نهایی از تمام شرکت‌کنندگان
      const confirmations = [];
      
      for (const participant of participants) {
        if (participant.role === 'KEY_HOLDER' || participant.role === 'ADMIN') {
          const confirmation = await this.requestParticipantConfirmation(participant, distributedKeys);
          confirmations.push(confirmation);
        }
      }

      // بررسی تأیید همه
      const allConfirmed = confirmations.every(conf => conf.confirmed);
      
      return {
        confirmed: allConfirmed,
        confirmations: confirmations,
        confirmedAt: allConfirmed ? new Date() : null
      };

    } catch (error) {
      console.error('خطا در دریافت تأیید نهایی:', error);
      throw error;
    }
  }

  async requestParticipantConfirmation(participant, distributedKeys) {
    try {
      // درخواست تأیید از شرکت‌کننده
      const request = {
        operation: 'REQUEST_CONFIRMATION',
        participantId: participant.id,
        distributedKeys: distributedKeys,
        timestamp: new Date().toISOString()
      };

      const response = await this.hsm.sendHSMRequest(request);
      
      return {
        participantId: participant.id,
        confirmed: response.confirmed,
        confirmationTime: response.confirmed ? new Date() : null,
        notes: response.notes || ''
      };

    } catch (error) {
      console.error('خطا در درخواست تأیید:', error);
      return {
        participantId: participant.id,
        confirmed: false,
        error: error.message
      };
    }
  }

  async activateNewKeys(keys) {
    try {
      for (const [keyType, key] of Object.entries(keys)) {
        const request = {
          operation: 'ACTIVATE_KEY',
          keyHandle: key.handle,
          keyType: keyType,
          activationTime: new Date().toISOString()
        };

        const response = await this.hsm.sendHSMRequest(request);
        
        if (response.status !== 'SUCCESS') {
          throw new Error(`خطا در فعال‌سازی کلید ${keyType}: ${response.errorMessage}`);
        }
      }

      console.log('تمام کلیدهای جدید فعال شدند');
    } catch (error) {
      console.error('خطا در فعال‌سازی کلیدهای جدید:', error);
      throw error;
    }
  }

  async getKeyStatus() {
    try {
      return {
        zoneKeys: {
          zmk: this.zoneMasterKey ? { ...this.zoneMasterKey, status: 'LOADED' } : { status: 'NOT_LOADED' },
          zpk: this.zonePinKey ? { ...this.zonePinKey, status: 'LOADED' } : { status: 'NOT_LOADED' },
          zdk: this.zoneDataKey ? { ...this.zoneDataKey, status: 'LOADED' } : { status: 'NOT_LOADED' }
        },
        dukptKeys: {
          bdk: this.bdk ? { ...this.bdk, status: 'LOADED' } : { status: 'NOT_LOADED' },
          ipek: this.ipek ? { ...this.ipek, status: 'LOADED' } : { status: 'NOT_LOADED' },
          ksn: this.ksn
        },
        serviceStatus: {
          initialized: this.initialized,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error('خطا در دریافت وضعیت کلیدها:', error);
      throw error;
    }
  }

  async closeService() {
    try {
      // بستن جلسه HSM
      if (this.hsm && this.hsm.sessionId) {
        await this.hsm.closeSession();
      }

      // پاک کردن کلیدهای Zone
      this.zoneMasterKey = null;
      this.zonePinKey = null;
      this.zoneDataKey = null;

      // پاک کردن کلیدهای DUKPT
      this.bdk = null;
      this.ipek = null;
      this.ksn = null;

      this.initialized = false;
      console.log('سرویس مدیریت کلیدهای DUKPT با موفقیت بسته شد');
    } catch (error) {
      console.error('خطا در بستن سرویس DUKPT:', error);
    }
  }
}

module.exports = DUKPTKeyManagement;