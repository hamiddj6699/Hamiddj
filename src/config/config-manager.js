/**
 * Configuration Manager for POS SDK 7220
 * مدیر پیکربندی برای SDK POS 7220
 * 
 * Features:
 * - Environment-based Configuration
 * - Configuration Validation
 * - Hot Reload Support
 * - Default Values
 * - Configuration Profiles
 */

const fs = require('fs-extra');
const path = require('path');

class ConfigManager {
    constructor(config = {}) {
        this.config = {};
        this.environment = process.env.NODE_ENV || 'development';
        this.configPath = process.env.POS_CONFIG_PATH || 'config';
        
        // Load configuration
        this._loadConfiguration(config);
        
        // Validate configuration
        this._validateConfiguration();
    }

    /**
     * Load configuration
     * بارگذاری پیکربندی
     */
    _loadConfiguration(userConfig = {}) {
        try {
            // Load environment-specific config
            const envConfig = this._loadEnvironmentConfig();
            
            // Load file-based config
            const fileConfig = this._loadFileConfig();
            
            // Merge configurations in order of priority:
            // 1. User config (highest priority)
            // 2. Environment config
            // 3. File config
            // 4. Default config (lowest priority)
            this.config = {
                ...this._getDefaultConfig(),
                ...fileConfig,
                ...envConfig,
                ...userConfig
            };
            
        } catch (error) {
            console.error('Failed to load configuration:', error);
            // Use default configuration
            this.config = this._getDefaultConfig();
        }
    }

    /**
     * Load environment-specific configuration
     * بارگذاری پیکربندی مخصوص محیط
     */
    _loadEnvironmentConfig() {
        const envConfig = {};
        
        // Load from environment variables
        const envMappings = {
            'POS_DEVICE_ID': 'device.deviceId',
            'POS_MODEL': 'device.model',
            'POS_FIRMWARE': 'device.firmware',
            'POS_WIFI_SSID': 'network.wifi.ssid',
            'POS_WIFI_PASSWORD': 'network.wifi.password',
            'POS_CELLULAR_APN': 'network.cellular.apn',
            'POS_SERVER_HOST': 'network.server.host',
            'POS_SERVER_PORT': 'network.server.port',
            'POS_SERVER_SECURE': 'network.server.secure',
            'POS_LOG_LEVEL': 'logging.level',
            'POS_LOG_DIR': 'logging.logDir',
            'POS_SECURITY_ENABLED': 'security.enabled',
            'POS_PCI_COMPLIANCE': 'security.pciCompliance.enabled',
            'POS_MASTER_KEY': 'security.masterKey'
        };
        
        for (const [envVar, configPath] of Object.entries(envMappings)) {
            if (process.env[envVar]) {
                this._setNestedValue(envConfig, configPath, process.env[envVar]);
            }
        }
        
        return envConfig;
    }

    /**
     * Load file-based configuration
     * بارگذاری پیکربندی مبتنی بر فایل
     */
    _loadFileConfig() {
        try {
            const configDir = path.join(process.cwd(), this.configPath);
            
            if (!fs.existsSync(configDir)) {
                return {};
            }
            
            const configFiles = [
                'config.json',
                `config.${this.environment}.json`,
                'pos-sdk.json',
                'pos-7220.json'
            ];
            
            let fileConfig = {};
            
            for (const fileName of configFiles) {
                const filePath = path.join(configDir, fileName);
                if (fs.existsSync(filePath)) {
                    try {
                        const fileData = fs.readJsonSync(filePath);
                        fileConfig = { ...fileConfig, ...fileData };
                    } catch (error) {
                        console.warn(`Failed to load config file ${fileName}:`, error.message);
                    }
                }
            }
            
            return fileConfig;
            
        } catch (error) {
            console.warn('Failed to load file configuration:', error.message);
            return {};
        }
    }

    /**
     * Get default configuration
     * دریافت پیکربندی پیش‌فرض
     */
    _getDefaultConfig() {
        return {
            device: {
                deviceId: 'POS_7220_001',
                model: '7220',
                firmware: '1.0.0',
                autoRestart: true,
                healthCheckInterval: 30000
            },
            security: {
                enabled: true,
                algorithm: 'aes-256-gcm',
                keyLength: 32,
                ivLength: 16,
                saltLength: 64,
                iterations: 100000,
                pciCompliance: {
                    enabled: true,
                    encryptionLevel: 'AES-256',
                    keyRotationDays: 90,
                    auditLogging: true,
                    secureDeletion: true
                }
            },
            hardware: {
                cardReader: {
                    port: '/dev/ttyUSB0',
                    baudRate: 9600,
                    dataBits: 8,
                    stopBits: 1,
                    parity: 'none',
                    timeout: 5000
                },
                printer: {
                    port: '/dev/ttyUSB1',
                    baudRate: 9600,
                    paperWidth: 80,
                    dpi: 203,
                    timeout: 10000
                }
            },
            network: {
                primaryConnection: 'wifi',
                wifi: {
                    ssid: '',
                    password: '',
                    security: 'WPA2',
                    autoConnect: true
                },
                cellular: {
                    apn: '',
                    username: '',
                    password: '',
                    autoConnect: true
                },
                usb: {
                    enabled: true,
                    autoMount: true
                },
                server: {
                    host: 'api.pos7220.com',
                    port: 443,
                    secure: true,
                    timeout: 30000
                },
                ota: {
                    enabled: true,
                    checkInterval: 3600000,
                    autoUpdate: false
                }
            },
            transactions: {
                autoSync: true,
                syncInterval: 300000,
                maxRetries: 3,
                batchSize: 100,
                currency: 'IRR',
                timezone: 'Asia/Tehran'
            },
            logging: {
                level: 'info',
                enableConsole: true,
                enableFile: true,
                logDir: 'logs',
                maxSize: '20m',
                maxFiles: '14d',
                format: 'json'
            },
            monitoring: {
                enabled: true,
                metricsInterval: 60000,
                alertThresholds: {
                    cpu: 80,
                    memory: 85,
                    disk: 90,
                    temperature: 70
                }
            }
        };
    }

    /**
     * Set nested configuration value
     * تنظیم مقدار پیکربندی تو در تو
     */
    _setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key]) {
                current[key] = {};
            }
            current = current[key];
        }
        
        const lastKey = keys[keys.length - 1];
        current[lastKey] = this._parseValue(value);
    }

    /**
     * Parse configuration value
     * تجزیه مقدار پیکربندی
     */
    _parseValue(value) {
        // Try to parse as JSON
        try {
            return JSON.parse(value);
        } catch (error) {
            // Try to parse as number
            if (!isNaN(value) && value !== '') {
                return Number(value);
            }
            
            // Try to parse as boolean
            if (value.toLowerCase() === 'true') return true;
            if (value.toLowerCase() === 'false') return false;
            
            // Return as string
            return value;
        }
    }

    /**
     * Validate configuration
     * اعتبارسنجی پیکربندی
     */
    _validateConfiguration() {
        const errors = [];
        
        // Validate required fields
        const requiredFields = [
            'device.deviceId',
            'device.model',
            'security.algorithm',
            'network.server.host'
        ];
        
        for (const field of requiredFields) {
            if (!this.get(field)) {
                errors.push(`Required configuration field missing: ${field}`);
            }
        }
        
        // Validate numeric ranges
        const numericValidations = [
            { path: 'device.healthCheckInterval', min: 1000, max: 300000 },
            { path: 'network.server.port', min: 1, max: 65535 },
            { path: 'transactions.maxRetries', min: 1, max: 10 },
            { path: 'logging.maxFiles', min: 1, max: 365 }
        ];
        
        for (const validation of numericValidations) {
            const value = this.get(validation.path);
            if (value !== undefined && (value < validation.min || value > validation.max)) {
                errors.push(`Configuration value out of range: ${validation.path} = ${value} (expected ${validation.min}-${validation.max})`);
            }
        }
        
        // Validate enum values
        const enumValidations = [
            { path: 'logging.level', values: ['error', 'warn', 'info', 'debug', 'verbose'] },
            { path: 'network.primaryConnection', values: ['wifi', 'cellular', 'usb'] },
            { path: 'security.algorithm', values: ['aes-128-gcm', 'aes-256-gcm', 'aes-256-cbc'] }
        ];
        
        for (const validation of enumValidations) {
            const value = this.get(validation.path);
            if (value && !validation.values.includes(value)) {
                errors.push(`Invalid configuration value: ${validation.path} = ${value} (expected one of: ${validation.values.join(', ')})`);
            }
        }
        
        if (errors.length > 0) {
            console.warn('Configuration validation warnings:');
            errors.forEach(error => console.warn(`  - ${error}`));
        }
    }

    /**
     * Get configuration value
     * دریافت مقدار پیکربندی
     */
    get(path, defaultValue = undefined) {
        const keys = path.split('.');
        let current = this.config;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }
        
        return current;
    }

    /**
     * Set configuration value
     * تنظیم مقدار پیکربندی
     */
    set(path, value) {
        this._setNestedValue(this.config, path, value);
    }

    /**
     * Get device configuration
     * دریافت پیکربندی دستگاه
     */
    getDeviceConfig() {
        return this.config.device || {};
    }

    /**
     * Get security configuration
     * دریافت پیکربندی امنیت
     */
    getSecurityConfig() {
        return this.config.security || {};
    }

    /**
     * Get hardware configuration
     * دریافت پیکربندی سخت‌افزار
     */
    getHardwareConfig() {
        return this.config.hardware || {};
    }

    /**
     * Get card reader configuration
     * دریافت پیکربندی کارت‌خوان
     */
    getCardReaderConfig() {
        return this.config.hardware?.cardReader || {};
    }

    /**
     * Get printer configuration
     * دریافت پیکربندی چاپگر
     */
    getPrinterConfig() {
        return this.config.hardware?.printer || {};
    }

    /**
     * Get network configuration
     * دریافت پیکربندی شبکه
     */
    getNetworkConfig() {
        return this.config.network || {};
    }

    /**
     * Get transaction configuration
     * دریافت پیکربندی تراکنش
     */
    getTransactionConfig() {
        return this.config.transactions || {};
    }

    /**
     * Get logging configuration
     * دریافت پیکربندی ثبت لاگ
     */
    getLoggingConfig() {
        return this.config.logging || {};
    }

    /**
     * Get monitoring configuration
     * دریافت پیکربندی نظارت
     */
    getMonitoringConfig() {
        return this.config.monitoring || {};
    }

    /**
     * Check if configuration is valid
     * بررسی معتبر بودن پیکربندی
     */
    isValid() {
        try {
            this._validateConfiguration();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Reload configuration
     * بارگذاری مجدد پیکربندی
     */
    async reload() {
        try {
            this._loadConfiguration();
            this._validateConfiguration();
            return true;
        } catch (error) {
            console.error('Failed to reload configuration:', error);
            return false;
        }
    }

    /**
     * Save configuration to file
     * ذخیره پیکربندی در فایل
     */
    async saveToFile(filename = 'config.json') {
        try {
            const configDir = path.join(process.cwd(), this.configPath);
            await fs.ensureDir(configDir);
            
            const filePath = path.join(configDir, filename);
            await fs.writeJson(filePath, this.config, { spaces: 2 });
            
            return true;
        } catch (error) {
            console.error('Failed to save configuration:', error);
            return false;
        }
    }

    /**
     * Export configuration
     * صادر کردن پیکربندی
     */
    export() {
        return {
            ...this.config,
            _metadata: {
                environment: this.environment,
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }

    /**
     * Get configuration summary
     * دریافت خلاصه پیکربندی
     */
    getSummary() {
        return {
            environment: this.environment,
            device: {
                id: this.get('device.deviceId'),
                model: this.get('device.model'),
                firmware: this.get('device.firmware')
            },
            security: {
                enabled: this.get('security.enabled'),
                algorithm: this.get('security.algorithm'),
                pciCompliance: this.get('security.pciCompliance.enabled')
            },
            network: {
                primary: this.get('network.primaryConnection'),
                server: this.get('network.server.host'),
                ota: this.get('network.ota.enabled')
            },
            logging: {
                level: this.get('logging.level'),
                console: this.get('logging.enableConsole'),
                file: this.get('logging.enableFile')
            }
        };
    }

    /**
     * Reset to defaults
     * بازگشت به مقادیر پیش‌فرض
     */
    resetToDefaults() {
        this.config = this._getDefaultConfig();
        this._validateConfiguration();
    }

    /**
     * Get all configuration keys
     * دریافت تمام کلیدهای پیکربندی
     */
    getAllKeys() {
        const keys = [];
        
        const traverse = (obj, prefix = '') => {
            for (const [key, value] of Object.entries(obj)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    traverse(value, fullKey);
                } else {
                    keys.push(fullKey);
                }
            }
        };
        
        traverse(this.config);
        return keys;
    }

    /**
     * Check if configuration has changed
     * بررسی تغییر پیکربندی
     */
    hasChanged(originalConfig) {
        return JSON.stringify(this.config) !== JSON.stringify(originalConfig);
    }
}

module.exports = { ConfigManager };