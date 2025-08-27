const https = require('https');
const fs = require('fs');
const crypto = require('crypto');
const xml2js = require('xml2js');

/**
 * سرویس HSM واقعی برای بانک‌ها
 * Real HSM Service for Banks
 */
class RealHSMClient {
  constructor(config) {
    this.config = {
      endpoint: config.endpoint || 'https://hsm.bank.ir:8443',
      certPath: config.certPath || process.env.HSM_CERT_PATH,
      keyPath: config.keyPath || process.env.HSM_KEY_PATH,
      caPath: config.caPath || process.env.HSM_CA_PATH,
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3
    };
    
    this.agent = this.createMtlsAgent();
    this.sessionId = null;
    this.sequenceNumber = 0;
  }

  createMtlsAgent() {
    if (!this.config.certPath || !this.config.keyPath) {
      throw new Error('گواهی و کلید HSM الزامی است');
    }

    const options = {
      cert: fs.readFileSync(this.config.certPath),
      key: fs.readFileSync(this.config.keyPath),
      rejectUnauthorized: true
    };

    if (this.config.caPath) {
      options.ca = fs.readFileSync(this.config.caPath);
    }

    return new https.Agent(options);
  }

  async initializeSession() {
    try {
      const request = {
        operation: 'INITIALIZE_SESSION',
        timestamp: new Date().toISOString(),
        clientId: process.env.HSM_CLIENT_ID || 'BANK_CARD_SYSTEM',
        version: '1.0'
      };

      const response = await this.sendHSMRequest(request);
      
      if (response.status === 'SUCCESS') {
        this.sessionId = response.sessionId;
        this.sequenceNumber = 0;
        console.log('جلسه HSM با موفقیت آغاز شد');
        return true;
      } else {
        throw new Error(`خطا در آغاز جلسه HSM: ${response.errorMessage}`);
      }
    } catch (error) {
      console.error('خطا در آغاز جلسه HSM:', error);
      throw error;
    }
  }

  async generateCardKeys(params) {
    try {
      const request = {
        operation: 'GENERATE_CARD_KEYS',
        sessionId: this.sessionId,
        sequenceNumber: ++this.sequenceNumber,
        timestamp: new Date().toISOString(),
        cardType: params.cardType,
        binProfile: params.binProfile,
        emvProfile: params.emvProfile,
        keySpecs: {
          iccKey: {
            algorithm: 'RSA_2048',
            usage: 'SIGN_VERIFY',
            exportable: false,
            extractable: false
          },
          issuerPublicKey: {
            algorithm: 'RSA_2048',
            usage: 'VERIFY',
            exportable: true,
            extractable: false
          },
          icvvKey: {
            algorithm: 'AES_256',
            usage: 'ENCRYPT_DECRYPT',
            exportable: false,
            extractable: false
          }
        }
      };

      const response = await this.sendHSMRequest(request);
      
      if (response.status === 'SUCCESS') {
        return {
          iccKeyRef: response.keys.iccKey.handle,
          issuerPublicKeyRef: response.keys.issuerPublicKey.handle,
          icvvKeyRef: response.keys.icvvKey.handle,
          publicKeyData: response.keys.issuerPublicKey.data,
          keyAlgorithm: response.keys.iccKey.algorithm,
          keySize: response.keys.iccKey.size,
          referenceIds: {
            iccKey: response.keys.iccKey.handle,
            issuerPublicKey: response.keys.issuerPublicKey.handle,
            icvvKey: response.keys.icvvKey.handle
          }
        };
      } else {
        throw new Error(`خطا در تولید کلیدهای کارت: ${response.errorMessage}`);
      }
    } catch (error) {
      console.error('خطا در تولید کلیدهای کارت:', error);
      throw error;
    }
  }

  async generatePin(params) {
    try {
      const request = {
        operation: 'GENERATE_PIN',
        sessionId: this.sessionId,
        sequenceNumber: ++this.sequenceNumber,
        timestamp: new Date().toISOString(),
        cardNumber: params.cardNumber,
        customerId: params.customerId,
        pinPolicy: params.pinPolicy || {
          length: 4,
          allowRepeatedDigits: false,
          allowSequentialDigits: false,
          maxAttempts: 3
        },
        keyLabel: params.keyLabel || 'ZPK_DEFAULT',
        pinBlockFormat: params.pinBlockFormat || 'ISO_0'
      };

      const response = await this.sendHSMRequest(request);
      
      if (response.status === 'SUCCESS') {
        return {
          pinReference: response.pin.handle,
          maskedPin: response.pin.maskedValue,
          pinBlock: response.pin.pinBlock,
          pinBlockFormat: response.pin.format,
          referenceId: response.pin.handle,
          maxAttempts: response.pin.maxAttempts,
          expiryDate: response.pin.expiryDate
        };
      } else {
        throw new Error(`خطا در تولید PIN: ${response.errorMessage}`);
      }
    } catch (error) {
      console.error('خطا در تولید PIN:', error);
      throw error;
    }
  }

  async generateCvv2(params) {
    try {
      const request = {
        operation: 'GENERATE_CVV2',
        sessionId: this.sessionId,
        sequenceNumber: ++this.sequenceNumber,
        timestamp: new Date().toISOString(),
        cardNumber: params.cardNumber,
        expiryDate: params.expiryDate,
        serviceCode: params.serviceCode || '000',
        keyLabel: params.keyLabel || 'CVV2_KEY',
        algorithm: params.algorithm || 'VISA_PVV'
      };

      const response = await this.sendHSMRequest(request);
      
      if (response.status === 'SUCCESS') {
        return {
          cvv2Reference: response.cvv2.handle,
          maskedCvv2: response.cvv2.maskedValue,
          algorithm: response.cvv2.algorithm,
          referenceId: response.cvv2.handle,
          generatedAt: response.cvv2.generatedAt
        };
      } else {
        throw new Error(`خطا در تولید CVV2: ${response.errorMessage}`);
      }
    } catch (error) {
      console.error('خطا در تولید CVV2:', error);
      throw error;
    }
  }

  async generateEmvChip(params) {
    try {
      const request = {
        operation: 'GENERATE_EMV_CHIP',
        sessionId: this.sessionId,
        sequenceNumber: ++this.sequenceNumber,
        timestamp: new Date().toISOString(),
        cardNumber: params.cardNumber,
        cardKeys: params.cardKeys,
        emvProfile: params.emvProfile,
        customerData: params.customerData,
        chipSpecs: {
          aid: params.emvProfile.aid,
          applicationLabel: params.emvProfile.applicationLabel,
          terminalCapabilities: params.emvProfile.terminalCapabilities,
          cvmList: params.emvProfile.cvmList,
          issuerActionCodes: params.emvProfile.issuerActionCodes
        }
      };

      const response = await this.sendHSMRequest(request);
      
      if (response.status === 'SUCCESS') {
        return {
          chipReference: response.chip.handle,
          emvData: response.chip.data,
          aid: response.chip.aid,
          applicationLabel: response.chip.applicationLabel,
          referenceId: response.chip.handle,
          generatedAt: response.chip.generatedAt
        };
      } else {
        throw new Error(`خطا در تولید تراشه EMV: ${response.errorMessage}`);
      }
    } catch (error) {
      console.error('خطا در تولید تراشه EMV:', error);
      throw error;
    }
  }

  async translatePin(params) {
    try {
      const request = {
        operation: 'TRANSLATE_PIN',
        sessionId: this.sessionId,
        sequenceNumber: ++this.sequenceNumber,
        timestamp: new Date().toISOString(),
        sourcePinBlock: params.sourcePinBlock,
        sourceFormat: params.sourceFormat,
        targetFormat: params.targetFormat,
        sourceKeyLabel: params.sourceKeyLabel,
        targetKeyLabel: params.targetKeyLabel,
        cardNumber: params.cardNumber
      };

      const response = await this.sendHSMRequest(request);
      
      if (response.status === 'SUCCESS') {
        return {
          translatedPinBlock: response.translatedPinBlock,
          targetFormat: response.targetFormat,
          referenceId: response.referenceId
        };
      } else {
        throw new Error(`خطا در ترجمه PIN: ${response.errorMessage}`);
      }
    } catch (error) {
      console.error('خطا در ترجمه PIN:', error);
      throw error;
    }
  }

  async verifyPin(params) {
    try {
      const request = {
        operation: 'VERIFY_PIN',
        sessionId: this.sessionId,
        sequenceNumber: ++this.sequenceNumber,
        timestamp: new Date().toISOString(),
        cardNumber: params.cardNumber,
        pinBlock: params.pinBlock,
        pinBlockFormat: params.pinBlockFormat,
        keyLabel: params.keyLabel,
        maxAttempts: params.maxAttempts || 3
      };

      const response = await this.sendHSMRequest(request);
      
      if (response.status === 'SUCCESS') {
        return {
          verified: response.verified,
          attemptsRemaining: response.attemptsRemaining,
          locked: response.locked,
          referenceId: response.referenceId
        };
      } else {
        throw new Error(`خطا در تأیید PIN: ${response.errorMessage}`);
      }
    } catch (error) {
      console.error('خطا در تأیید PIN:', error);
      throw error;
    }
  }

  async generateDigitalSignature(data, keyLabel) {
    try {
      const request = {
        operation: 'GENERATE_SIGNATURE',
        sessionId: this.sessionId,
        sequenceNumber: ++this.sequenceNumber,
        timestamp: new Date().toISOString(),
        data: data,
        keyLabel: keyLabel,
        algorithm: 'RSA_SHA256',
        encoding: 'BASE64'
      };

      const response = await this.sendHSMRequest(request);
      
      if (response.status === 'SUCCESS') {
        return {
          signature: response.signature,
          algorithm: response.algorithm,
          keyLabel: response.keyLabel,
          referenceId: response.referenceId
        };
      } else {
        throw new Error(`خطا در تولید امضای دیجیتال: ${response.errorMessage}`);
      }
    } catch (error) {
      console.error('خطا در تولید امضای دیجیتال:', error);
      throw error;
    }
  }

  async sendHSMRequest(request) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.config.endpoint);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        agent: this.agent,
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'X-HSM-Client-ID': process.env.HSM_CLIENT_ID || 'BANK_CARD_SYSTEM',
          'X-HSM-Version': '1.0',
          'X-HSM-Timestamp': new Date().toISOString()
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const response = JSON.parse(data);
              resolve(response);
            } else {
              reject(new Error(`خطای HTTP: ${res.statusCode} - ${data}`));
            }
          } catch (error) {
            reject(new Error(`خطا در پردازش پاسخ HSM: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`خطا در ارتباط با HSM: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('زمان انتظار برای HSM به پایان رسید'));
      });

      req.write(JSON.stringify(request));
      req.end();
    });
  }

  async closeSession() {
    if (this.sessionId) {
      try {
        const request = {
          operation: 'CLOSE_SESSION',
          sessionId: this.sessionId,
          timestamp: new Date().toISOString()
        };

        await this.sendHSMRequest(request);
        this.sessionId = null;
        this.sequenceNumber = 0;
        console.log('جلسه HSM با موفقیت بسته شد');
      } catch (error) {
        console.error('خطا در بستن جلسه HSM:', error);
      }
    }
  }

  async healthCheck() {
    try {
      const request = {
        operation: 'HEALTH_CHECK',
        timestamp: new Date().toISOString()
      };

      const response = await this.sendHSMRequest(request);
      return response.status === 'SUCCESS';
    } catch (error) {
      console.error('خطا در بررسی سلامت HSM:', error);
      return false;
    }
  }
}

module.exports = RealHSMClient;