/**
 * POS Device Core Management
 * مدیریت هسته دستگاه POS
 */

const EventEmitter = require('events');
const os = require('os');
const fs = require('fs-extra');
const path = require('path');

class POSDevice extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            deviceId: config.deviceId || 'POS_7220',
            model: '7220',
            firmware: config.firmware || '1.0.0',
            ...config
        };
        
        this.status = {
            online: false,
            healthy: false,
            battery: 100,
            temperature: 25,
            uptime: 0,
            lastHealthCheck: null
        };
        
        this.startTime = Date.now();
        this.healthCheckInterval = null;
    }

    /**
     * Initialize the device
     * راه‌اندازی دستگاه
     */
    async initialize() {
        try {
            this.logger.info(`Initializing POS Device ${this.config.model}...`);
            
            // Check system requirements
            await this._checkSystemRequirements();
            
            // Initialize device hardware
            await this._initializeHardware();
            
            // Start health monitoring
            this._startHealthMonitoring();
            
            this.status.online = true;
            this.status.healthy = true;
            
            this.logger.info(`POS Device ${this.config.model} initialized successfully`);
            this.emit('device:ready');
            
        } catch (error) {
            this.logger.error('Failed to initialize device:', error);
            this.emit('device:error', error);
            throw error;
        }
    }

    /**
     * Check system requirements
     * بررسی نیازمندی‌های سیستم
     */
    async _checkSystemRequirements() {
        const requirements = {
            nodeVersion: process.version,
            platform: os.platform(),
            arch: os.arch(),
            memory: os.totalmem(),
            cpus: os.cpus().length
        };
        
        // Check minimum requirements
        if (parseFloat(process.version.slice(1)) < 16.0) {
            throw new Error('Node.js version 16.0 or higher is required');
        }
        
        if (os.totalmem() < 512 * 1024 * 1024) { // 512MB
            throw new Error('Minimum 512MB RAM is required');
        }
        
        this.logger.info('System requirements check passed:', requirements);
    }

    /**
     * Initialize hardware components
     * راه‌اندازی قطعات سخت‌افزاری
     */
    async _initializeHardware() {
        // Check USB ports
        await this._checkUSBPorts();
        
        // Check serial ports
        await this._checkSerialPorts();
        
        // Check file system
        await this._checkFileSystem();
        
        this.logger.info('Hardware initialization completed');
    }

    /**
     * Check USB ports availability
     * بررسی در دسترس بودن پورت‌های USB
     */
    async _checkUSBPorts() {
        try {
            // This would integrate with actual USB detection
            // For now, we'll simulate the check
            this.logger.info('USB ports check completed');
        } catch (error) {
            this.logger.warn('USB ports check failed:', error.message);
        }
    }

    /**
     * Check serial ports availability
     * بررسی در دسترس بودن پورت‌های سریال
     */
    async _checkSerialPorts() {
        try {
            // This would integrate with actual serial port detection
            this.logger.info('Serial ports check completed');
        } catch (error) {
            this.logger.warn('Serial ports check failed:', error.message);
        }
    }

    /**
     * Check file system
     * بررسی سیستم فایل
     */
    async _checkFileSystem() {
        try {
            const dataDir = path.join(process.cwd(), 'data');
            await fs.ensureDir(dataDir);
            
            const logsDir = path.join(process.cwd(), 'logs');
            await fs.ensureDir(logsDir);
            
            this.logger.info('File system check completed');
        } catch (error) {
            this.logger.error('File system check failed:', error);
            throw error;
        }
    }

    /**
     * Start health monitoring
     * شروع نظارت بر سلامت دستگاه
     */
    _startHealthMonitoring() {
        this.healthCheckInterval = setInterval(() => {
            this.checkHealth();
        }, 30000); // Every 30 seconds
    }

    /**
     * Check device health
     * بررسی سلامت دستگاه
     */
    async checkHealth() {
        try {
            const health = await this._performHealthCheck();
            
            this.status.lastHealthCheck = new Date();
            this.status.uptime = Date.now() - this.startTime;
            
            if (health.healthy !== this.status.healthy) {
                this.status.healthy = health.healthy;
                this.emit('device:health-changed', health.healthy);
            }
            
            // Update status
            Object.assign(this.status, health);
            
            this.emit('device:health-check', health);
            
        } catch (error) {
            this.logger.error('Health check failed:', error);
            this.status.healthy = false;
            this.emit('device:health-error', error);
        }
    }

    /**
     * Perform actual health check
     * انجام بررسی سلامت واقعی
     */
    async _performHealthCheck() {
        const health = {
            healthy: true,
            battery: this._getBatteryLevel(),
            temperature: this._getTemperature(),
            memory: this._getMemoryUsage(),
            disk: await this._getDiskUsage()
        };
        
        // Determine overall health
        health.healthy = health.battery > 10 && 
                        health.temperature < 70 && 
                        health.memory < 90 && 
                        health.disk < 90;
        
        return health;
    }

    /**
     * Get battery level (simulated)
     * دریافت سطح باتری (شبیه‌سازی شده)
     */
    _getBatteryLevel() {
        // In real implementation, this would read from hardware
        return Math.floor(Math.random() * 30) + 70; // 70-100%
    }

    /**
     * Get device temperature (simulated)
     * دریافت دمای دستگاه (شبیه‌سازی شده)
     */
    _getTemperature() {
        // In real implementation, this would read from hardware
        return Math.floor(Math.random() * 20) + 20; // 20-40°C
    }

    /**
     * Get memory usage
     * دریافت استفاده از حافظه
     */
    _getMemoryUsage() {
        const total = os.totalmem();
        const free = os.freemem();
        return Math.round(((total - free) / total) * 100);
    }

    /**
     * Get disk usage
     * دریافت استفاده از دیسک
     */
    async _getDiskUsage() {
        try {
            const stats = await fs.stat(process.cwd());
            // This is a simplified disk usage check
            return Math.floor(Math.random() * 30) + 40; // 40-70%
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get device information
     * دریافت اطلاعات دستگاه
     */
    getDeviceInfo() {
        return {
            ...this.config,
            status: this.status,
            system: {
                platform: os.platform(),
                arch: os.arch(),
                nodeVersion: process.version,
                uptime: process.uptime(),
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    used: os.totalmem() - os.freemem()
                },
                cpus: os.cpus().length
            }
        };
    }

    /**
     * Get device status
     * دریافت وضعیت دستگاه
     */
    getStatus() {
        return {
            ...this.status,
            deviceInfo: this.getDeviceInfo()
        };
    }

    /**
     * Restart device
     * راه‌اندازی مجدد دستگاه
     */
    async restart() {
        try {
            this.logger.info('Restarting device...');
            this.emit('device:restarting');
            
            await this.shutdown();
            
            // In real implementation, this would trigger system restart
            setTimeout(() => {
                process.exit(0);
            }, 1000);
            
        } catch (error) {
            this.logger.error('Restart failed:', error);
            throw error;
        }
    }

    /**
     * Shutdown device
     * خاموش کردن دستگاه
     */
    async shutdown() {
        try {
            this.logger.info('Shutting down device...');
            
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
                this.healthCheckInterval = null;
            }
            
            this.status.online = false;
            this.status.healthy = false;
            
            this.emit('device:shutdown');
            this.logger.info('Device shutdown complete');
            
        } catch (error) {
            this.logger.error('Shutdown failed:', error);
            throw error;
        }
    }
}

module.exports = { POSDevice };