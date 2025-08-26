/**
 * POS SDK 7220 - Main Entry Point
 * SDK جامع برای دستگاه POS مدل 7220
 * 
 * Features:
 * - Magnetic Card Reader Support
 * - IC Card Support  
 * - NFC Support
 * - Thermal Printer
 * - Security & Encryption
 * - Network Communication
 * - OTA Updates
 */

const { POSDevice } = require('./core/device');
const { SecurityManager } = require('./security/security-manager');
const { CardReader } = require('./hardware/card-reader');
const { ThermalPrinter } = require('./hardware/thermal-printer');
const { NetworkManager } = require('./network/network-manager');
const { TransactionManager } = require('./transactions/transaction-manager');
const { Logger } = require('./utils/logger');
const { ConfigManager } = require('./config/config-manager');

class POSSDK {
    constructor(config = {}) {
        this.config = new ConfigManager(config);
        this.logger = new Logger();
        this.device = null;
        this.security = null;
        this.cardReader = null;
        this.printer = null;
        this.network = null;
        this.transactions = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the POS SDK
     * راه‌اندازی اولیه SDK
     */
    async initialize() {
        try {
            this.logger.info('Initializing POS SDK 7220...');
            
            // Initialize security manager
            this.security = new SecurityManager(this.config.getSecurityConfig());
            await this.security.initialize();
            
            // Initialize device
            this.device = new POSDevice(this.config.getDeviceConfig());
            await this.device.initialize();
            
            // Initialize hardware components
            this.cardReader = new CardReader(this.config.getCardReaderConfig());
            await this.cardReader.initialize();
            
            this.printer = new ThermalPrinter(this.config.getPrinterConfig());
            await this.printer.initialize();
            
            // Initialize network manager
            this.network = new NetworkManager(this.config.getNetworkConfig());
            await this.network.initialize();
            
            // Initialize transaction manager
            this.transactions = new TransactionManager(this.config.getTransactionConfig());
            await this.transactions.initialize();
            
            this.isInitialized = true;
            this.logger.info('POS SDK 7220 initialized successfully');
            
            // Start monitoring services
            this._startMonitoring();
            
        } catch (error) {
            this.logger.error('Failed to initialize POS SDK:', error);
            throw error;
        }
    }

    /**
     * Start monitoring services
     * شروع سرویس‌های نظارتی
     */
    _startMonitoring() {
        // Monitor device health
        setInterval(() => {
            this.device.checkHealth();
        }, 30000); // Every 30 seconds
        
        // Monitor network connectivity
        setInterval(() => {
            this.network.checkConnectivity();
        }, 60000); // Every minute
        
        // Check for OTA updates
        setInterval(() => {
            this._checkForUpdates();
        }, 3600000); // Every hour
    }

    /**
     * Check for OTA updates
     * بررسی به‌روزرسانی‌های OTA
     */
    async _checkForUpdates() {
        try {
            const updateAvailable = await this.network.checkForUpdates();
            if (updateAvailable) {
                this.logger.info('OTA update available');
                // Notify application about available update
            }
        } catch (error) {
            this.logger.error('Error checking for updates:', error);
        }
    }

    /**
     * Get SDK status
     * دریافت وضعیت SDK
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            device: this.device ? this.device.getStatus() : null,
            cardReader: this.cardReader ? this.cardReader.getStatus() : null,
            printer: this.printer ? this.printer.getStatus() : null,
            network: this.network ? this.network.getStatus() : null,
            security: this.security ? this.security.getStatus() : null
        };
    }

    /**
     * Shutdown SDK gracefully
     * خاموش کردن آرام SDK
     */
    async shutdown() {
        try {
            this.logger.info('Shutting down POS SDK...');
            
            if (this.transactions) await this.transactions.shutdown();
            if (this.network) await this.network.shutdown();
            if (this.printer) await this.printer.shutdown();
            if (this.cardReader) await this.cardReader.shutdown();
            if (this.device) await this.device.shutdown();
            if (this.security) await this.security.shutdown();
            
            this.isInitialized = false;
            this.logger.info('POS SDK shutdown complete');
        } catch (error) {
            this.logger.error('Error during shutdown:', error);
        }
    }

    // Public API methods
    getDevice() { return this.device; }
    getCardReader() { return this.cardReader; }
    getPrinter() { return this.printer; }
    getNetwork() { return this.network; }
    getTransactions() { return this.transactions; }
    getSecurity() { return this.security; }
}

// Export the SDK
module.exports = {
    POSSDK,
    // Individual components for direct use
    POSDevice,
    SecurityManager,
    CardReader,
    ThermalPrinter,
    NetworkManager,
    TransactionManager
};

// Auto-initialize if running directly
if (require.main === module) {
    const sdk = new POSSDK();
    sdk.initialize().catch(console.error);
}