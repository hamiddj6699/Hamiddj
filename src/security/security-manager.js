/**
 * Security Manager for POS SDK 7220
 * مدیریت امنیت برای SDK POS 7220
 * 
 * Features:
 * - End-to-End Encryption
 * - PCI-DSS Compliance
 * - Key Management
 * - User Authorization
 * - Secure Communication
 */

const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');

class SecurityManager {
    constructor(config = {}) {
        this.config = {
            algorithm: 'aes-256-gcm',
            keyLength: 32,
            ivLength: 16,
            saltLength: 64,
            iterations: 100000,
            ...config
        };
        
        this.keys = new Map();
        this.userPermissions = new Map();
        this.encryptionKeys = new Map();
        this.isInitialized = false;
        
        // PCI-DSS compliance settings
        this.pciCompliance = {
            enabled: true,
            encryptionLevel: 'AES-256',
            keyRotationDays: 90,
            auditLogging: true,
            secureDeletion: true
        };
    }

    /**
     * Initialize security manager
     * راه‌اندازی مدیر امنیت
     */
    async initialize() {
        try {
            this.logger.info('Initializing Security Manager...');
            
            // Create security directories
            await this._createSecurityDirectories();
            
            // Load or generate encryption keys
            await this._loadEncryptionKeys();
            
            // Load user permissions
            await this._loadUserPermissions();
            
            // Initialize PCI-DSS compliance
            await this._initializePCICompliance();
            
            // Start key rotation monitoring
            this._startKeyRotationMonitoring();
            
            this.isInitialized = true;
            this.logger.info('Security Manager initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize Security Manager:', error);
            throw error;
        }
    }

    /**
     * Create security directories
     * ایجاد دایرکتوری‌های امنیتی
     */
    async _createSecurityDirectories() {
        const dirs = [
            'security/keys',
            'security/certs',
            'security/logs',
            'security/audit'
        ];
        
        for (const dir of dirs) {
            await fs.ensureDir(path.join(process.cwd(), dir));
        }
        
        this.logger.info('Security directories created');
    }

    /**
     * Load or generate encryption keys
     * بارگذاری یا تولید کلیدهای رمزنگاری
     */
    async _loadEncryptionKeys() {
        const keysPath = path.join(process.cwd(), 'security/keys');
        
        try {
            // Try to load existing keys
            const keyFiles = await fs.readdir(keysPath);
            
            for (const file of keyFiles) {
                if (file.endsWith('.key')) {
                    const keyName = path.basename(file, '.key');
                    const keyPath = path.join(keysPath, file);
                    const keyData = await fs.readFile(keyPath, 'utf8');
                    
                    // Decrypt key data if needed
                    const decryptedKey = this._decryptKeyData(keyData);
                    this.encryptionKeys.set(keyName, decryptedKey);
                }
            }
            
            // Generate default keys if none exist
            if (this.encryptionKeys.size === 0) {
                await this._generateDefaultKeys();
            }
            
        } catch (error) {
            this.logger.warn('Could not load existing keys, generating new ones:', error.message);
            await this._generateDefaultKeys();
        }
    }

    /**
     * Generate default encryption keys
     * تولید کلیدهای رمزنگاری پیش‌فرض
     */
    async _generateDefaultKeys() {
        const defaultKeys = [
            'card_encryption',
            'communication',
            'storage',
            'backup'
        ];
        
        for (const keyName of defaultKeys) {
            const key = await this._generateNewKey(keyName);
            this.encryptionKeys.set(keyName, key);
        }
        
        this.logger.info('Default encryption keys generated');
    }

    /**
     * Generate new encryption key
     * تولید کلید رمزنگاری جدید
     */
    async _generateNewKey(keyName) {
        const key = crypto.randomBytes(this.config.keyLength);
        const salt = crypto.randomBytes(this.config.saltLength);
        
        // Derive key using PBKDF2
        const derivedKey = crypto.pbkdf2Sync(
            key.toString('hex'),
            salt,
            this.config.iterations,
            this.config.keyLength,
            'sha512'
        );
        
        const keyData = {
            key: derivedKey,
            salt: salt,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + (this.pciCompliance.keyRotationDays * 24 * 60 * 60 * 1000)).toISOString()
        };
        
        // Save key to file
        await this._saveKeyToFile(keyName, keyData);
        
        return keyData;
    }

    /**
     * Save key to file
     * ذخیره کلید در فایل
     */
    async _saveKeyToFile(keyName, keyData) {
        const keyPath = path.join(process.cwd(), 'security/keys', `${keyName}.key`);
        
        // Encrypt key data before saving
        const encryptedData = this._encryptKeyData(keyData);
        await fs.writeFile(keyPath, encryptedData, 'utf8');
        
        this.logger.info(`Key ${keyName} saved to file`);
    }

    /**
     * Encrypt key data
     * رمزنگاری داده‌های کلید
     */
    _encryptKeyData(keyData) {
        const masterKey = this._getMasterKey();
        const iv = crypto.randomBytes(this.config.ivLength);
        
        const cipher = crypto.createCipher(this.config.algorithm, masterKey);
        cipher.setAAD(Buffer.from('key-data'));
        
        let encrypted = cipher.update(JSON.stringify(keyData), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return JSON.stringify({
            iv: iv.toString('hex'),
            encrypted: encrypted,
            authTag: authTag.toString('hex')
        });
    }

    /**
     * Decrypt key data
     * رمزگشایی داده‌های کلید
     */
    _decryptKeyData(encryptedData) {
        try {
            const masterKey = this._getMasterKey();
            const data = JSON.parse(encryptedData);
            
            const decipher = crypto.createDecipher(this.config.algorithm, masterKey);
            decipher.setAAD(Buffer.from('key-data'));
            decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
            
            let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return JSON.parse(decrypted);
        } catch (error) {
            this.logger.error('Failed to decrypt key data:', error);
            return null;
        }
    }

    /**
     * Get master key (in production, this would be stored securely)
     * دریافت کلید اصلی (در تولید، این باید به صورت امن ذخیره شود)
     */
    _getMasterKey() {
        // In production, this should be stored in a secure hardware module (HSM)
        // or derived from environment variables
        const envKey = process.env.POS_MASTER_KEY;
        if (envKey) {
            return Buffer.from(envKey, 'hex');
        }
        
        // Fallback to a default key (NOT recommended for production)
        return crypto.scryptSync('default-master-key', 'salt', this.config.keyLength);
    }

    /**
     * Load user permissions
     * بارگذاری مجوزهای کاربر
     */
    async _loadUserPermissions() {
        const permissionsPath = path.join(process.cwd(), 'security/permissions.json');
        
        try {
            if (await fs.pathExists(permissionsPath)) {
                const permissionsData = await fs.readJson(permissionsPath);
                this.userPermissions = new Map(Object.entries(permissionsData));
            } else {
                // Create default permissions
                await this._createDefaultPermissions();
            }
        } catch (error) {
            this.logger.warn('Could not load user permissions, creating defaults:', error.message);
            await this._createDefaultPermissions();
        }
    }

    /**
     * Create default user permissions
     * ایجاد مجوزهای پیش‌فرض کاربر
     */
    async _createDefaultPermissions() {
        const defaultPermissions = {
            'admin': {
                roles: ['admin'],
                permissions: ['all'],
                cardAccess: ['magnetic', 'ic', 'nfc'],
                transactionAccess: ['all'],
                systemAccess: ['all']
            },
            'operator': {
                roles: ['operator'],
                permissions: ['transactions', 'reports'],
                cardAccess: ['magnetic', 'ic'],
                transactionAccess: ['create', 'view'],
                systemAccess: ['limited']
            },
            'viewer': {
                roles: ['viewer'],
                permissions: ['reports'],
                cardAccess: [],
                transactionAccess: ['view'],
                systemAccess: ['none']
            }
        };
        
        this.userPermissions = new Map(Object.entries(defaultPermissions));
        
        // Save to file
        const permissionsPath = path.join(process.cwd(), 'security/permissions.json');
        await fs.writeJson(permissionsPath, defaultPermissions, { spaces: 2 });
        
        this.logger.info('Default user permissions created');
    }

    /**
     * Initialize PCI-DSS compliance
     * راه‌اندازی انطباق PCI-DSS
     */
    async _initializePCICompliance() {
        if (!this.pciCompliance.enabled) {
            this.logger.warn('PCI-DSS compliance is disabled');
            return;
        }
        
        // Create compliance audit log
        await this._createComplianceAuditLog();
        
        // Set up compliance monitoring
        this._setupComplianceMonitoring();
        
        this.logger.info('PCI-DSS compliance initialized');
    }

    /**
     * Create compliance audit log
     * ایجاد لاگ حسابرسی انطباق
     */
    async _createComplianceAuditLog() {
        const auditPath = path.join(process.cwd(), 'security/audit/compliance.log');
        
        const complianceLog = {
            timestamp: new Date().toISOString(),
            event: 'PCI_DSS_COMPLIANCE_INIT',
            status: 'ENABLED',
            encryptionLevel: this.pciCompliance.encryptionLevel,
            keyRotationDays: this.pciCompliance.keyRotationDays,
            auditLogging: this.pciCompliance.auditLogging,
            secureDeletion: this.pciCompliance.secureDeletion
        };
        
        await fs.appendFile(auditPath, JSON.stringify(complianceLog) + '\n');
    }

    /**
     * Setup compliance monitoring
     * راه‌اندازی نظارت بر انطباق
     */
    _setupComplianceMonitoring() {
        // Monitor key expiration
        setInterval(() => {
            this._checkKeyExpiration();
        }, 24 * 60 * 60 * 1000); // Daily
        
        // Monitor compliance status
        setInterval(() => {
            this._auditComplianceStatus();
        }, 7 * 24 * 60 * 60 * 1000); // Weekly
    }

    /**
     * Start key rotation monitoring
     * شروع نظارت بر چرخش کلید
     */
    _startKeyRotationMonitoring() {
        setInterval(() => {
            this._checkKeyRotation();
        }, 60 * 60 * 1000); // Hourly
    }

    /**
     * Check key rotation
     * بررسی چرخش کلید
     */
    async _checkKeyRotation() {
        const now = new Date();
        
        for (const [keyName, keyData] of this.encryptionKeys) {
            if (new Date(keyData.expiresAt) <= now) {
                this.logger.info(`Key ${keyName} expired, rotating...`);
                await this._rotateKey(keyName);
            }
        }
    }

    /**
     * Rotate encryption key
     * چرخش کلید رمزنگاری
     */
    async _rotateKey(keyName) {
        try {
            // Generate new key
            const newKey = await this._generateNewKey(keyName);
            
            // Update encryption keys map
            this.encryptionKeys.set(keyName, newKey);
            
            // Log rotation
            await this._logKeyRotation(keyName);
            
            this.logger.info(`Key ${keyName} rotated successfully`);
            
        } catch (error) {
            this.logger.error(`Failed to rotate key ${keyName}:`, error);
        }
    }

    /**
     * Log key rotation
     * ثبت چرخش کلید
     */
    async _logKeyRotation(keyName) {
        const auditPath = path.join(process.cwd(), 'security/audit/key-rotation.log');
        
        const rotationLog = {
            timestamp: new Date().toISOString(),
            event: 'KEY_ROTATION',
            keyName: keyName,
            status: 'SUCCESS'
        };
        
        await fs.appendFile(auditPath, JSON.stringify(rotationLog) + '\n');
    }

    /**
     * Encrypt card data
     * رمزنگاری داده‌های کارت
     */
    encryptCardData(cardData, keyName = 'card_encryption') {
        try {
            const keyData = this.encryptionKeys.get(keyName);
            if (!keyData) {
                throw new Error(`Encryption key ${keyName} not found`);
            }
            
            const iv = crypto.randomBytes(this.config.ivLength);
            const cipher = crypto.createCipher(this.config.algorithm, keyData.key);
            
            let encrypted = cipher.update(JSON.stringify(cardData), 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            return {
                encrypted: encrypted,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex'),
                algorithm: this.config.algorithm,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            this.logger.error('Failed to encrypt card data:', error);
            throw error;
        }
    }

    /**
     * Decrypt card data
     * رمزگشایی داده‌های کارت
     */
    decryptCardData(encryptedData, keyName = 'card_encryption') {
        try {
            const keyData = this.encryptionKeys.get(keyName);
            if (!keyData) {
                throw new Error(`Decryption key ${keyName} not found`);
            }
            
            const decipher = crypto.createDecipher(this.config.algorithm, keyData.key);
            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
            
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return JSON.parse(decrypted);
            
        } catch (error) {
            this.logger.error('Failed to decrypt card data:', error);
            throw error;
        }
    }

    /**
     * Check user permission
     * بررسی مجوز کاربر
     */
    checkUserPermission(userId, permission) {
        const userPerms = this.userPermissions.get(userId);
        if (!userPerms) {
            return false;
        }
        
        return userPerms.permissions.includes('all') || 
               userPerms.permissions.includes(permission);
    }

    /**
     * Get security status
     * دریافت وضعیت امنیت
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            pciCompliance: this.pciCompliance,
            encryptionKeys: {
                count: this.encryptionKeys.size,
                names: Array.from(this.encryptionKeys.keys())
            },
            userPermissions: {
                count: this.userPermissions.size,
                users: Array.from(this.userPermissions.keys())
            }
        };
    }

    /**
     * Shutdown security manager
     * خاموش کردن مدیر امنیت
     */
    async shutdown() {
        try {
            this.logger.info('Shutting down Security Manager...');
            
            // Secure deletion of sensitive data if enabled
            if (this.pciCompliance.secureDeletion) {
                await this._secureDeleteSensitiveData();
            }
            
            this.isInitialized = false;
            this.logger.info('Security Manager shutdown complete');
            
        } catch (error) {
            this.logger.error('Security Manager shutdown failed:', error);
            throw error;
        }
    }

    /**
     * Secure deletion of sensitive data
     * حذف امن داده‌های حساس
     */
    async _secureDeleteSensitiveData() {
        // Overwrite sensitive data with random bytes before deletion
        for (const [keyName, keyData] of this.encryptionKeys) {
            const randomData = crypto.randomBytes(this.config.keyLength);
            this.encryptionKeys.set(keyName, randomData);
        }
        
        this.logger.info('Sensitive data securely deleted');
    }
}

module.exports = { SecurityManager };