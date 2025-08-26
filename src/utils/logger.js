/**
 * Logger Utility for POS SDK 7220
 * ابزار ثبت لاگ برای SDK POS 7220
 * 
 * Features:
 * - Multiple Log Levels
 * - File & Console Logging
 * - Log Rotation
 * - Structured Logging
 * - Performance Monitoring
 */

const fs = require('fs-extra');
const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

class Logger {
    constructor(config = {}) {
        this.config = {
            level: config.level || 'info',
            enableConsole: config.enableConsole !== false,
            enableFile: config.enableFile !== false,
            logDir: config.logDir || 'logs',
            maxSize: config.maxSize || '20m',
            maxFiles: config.maxFiles || '14d',
            format: config.format || 'json',
            ...config
        };
        
        this.logger = null;
        this.isInitialized = false;
        
        // Initialize logger
        this._initializeLogger();
    }

    /**
     * Initialize logger
     * راه‌اندازی ثبت‌کننده
     */
    _initializeLogger() {
        try {
            const transports = [];
            
            // Console transport
            if (this.config.enableConsole) {
                transports.push(new winston.transports.Console({
                    level: this.config.level,
                    format: this._getConsoleFormat()
                }));
            }
            
            // File transport
            if (this.config.enableFile) {
                // Ensure log directory exists
                fs.ensureDirSync(path.join(process.cwd(), this.config.logDir));
                
                // Daily rotate file transport
                const fileTransport = new DailyRotateFile({
                    filename: path.join(process.cwd(), this.config.logDir, 'pos-sdk-%DATE%.log'),
                    datePattern: 'YYYY-MM-DD',
                    level: this.config.level,
                    maxSize: this.config.maxSize,
                    maxFiles: this.config.maxFiles,
                    format: this._getFileFormat(),
                    zippedArchive: true
                });
                
                transports.push(fileTransport);
                
                // Error log file
                const errorTransport = new DailyRotateFile({
                    filename: path.join(process.cwd(), this.config.logDir, 'pos-sdk-error-%DATE%.log'),
                    datePattern: 'YYYY-MM-DD',
                    level: 'error',
                    maxSize: this.config.maxSize,
                    maxFiles: this.config.maxFiles,
                    format: this._getFileFormat(),
                    zippedArchive: true
                });
                
                transports.push(errorTransport);
            }
            
            // Create logger instance
            this.logger = winston.createLogger({
                level: this.config.level,
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.errors({ stack: true }),
                    winston.format.json()
                ),
                transports,
                exitOnError: false
            });
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('Failed to initialize logger:', error);
            // Fallback to console logging
            this._createFallbackLogger();
        }
    }

    /**
     * Create fallback logger
     * ایجاد ثبت‌کننده پشتیبان
     */
    _createFallbackLogger() {
        this.logger = {
            log: (level, message, meta) => {
                const timestamp = new Date().toISOString();
                const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
                
                if (meta && Object.keys(meta).length > 0) {
                    console.log(logEntry, meta);
                } else {
                    console.log(logEntry);
                }
            },
            error: (message, meta) => this.logger.log('error', message, meta),
            warn: (message, meta) => this.logger.log('warn', message, meta),
            info: (message, meta) => this.logger.log('info', message, meta),
            debug: (message, meta) => this.logger.log('debug', message, meta),
            verbose: (message, meta) => this.logger.log('verbose', message, meta)
        };
    }

    /**
     * Get console format
     * دریافت فرمت کنسول
     */
    _getConsoleFormat() {
        return winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                let logEntry = `${timestamp} [${level}]: ${message}`;
                
                if (Object.keys(meta).length > 0) {
                    logEntry += ` ${JSON.stringify(meta)}`;
                }
                
                return logEntry;
            })
        );
    }

    /**
     * Get file format
     * دریافت فرمت فایل
     */
    _getFileFormat() {
        return winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        );
    }

    /**
     * Log message with level
     * ثبت پیام با سطح
     */
    log(level, message, meta = {}) {
        if (!this.isInitialized || !this.logger) {
            console.log(`[${level.toUpperCase()}] ${message}`, meta);
            return;
        }
        
        try {
            this.logger.log(level, message, meta);
        } catch (error) {
            console.error('Logger error:', error);
            console.log(`[${level.toUpperCase()}] ${message}`, meta);
        }
    }

    /**
     * Log error message
     * ثبت پیام خطا
     */
    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    /**
     * Log warning message
     * ثبت پیام هشدار
     */
    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    /**
     * Log info message
     * ثبت پیام اطلاعات
     */
    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    /**
     * Log debug message
     * ثبت پیام اشکال‌زدایی
     */
    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    /**
     * Log verbose message
     * ثبت پیام مفصل
     */
    verbose(message, meta = {}) {
        this.log('verbose', message, meta);
    }

    /**
     * Log performance metric
     * ثبت متریک عملکرد
     */
    performance(operation, duration, meta = {}) {
        this.info(`Performance: ${operation} completed in ${duration}ms`, {
            operation,
            duration,
            type: 'performance',
            ...meta
        });
    }

    /**
     * Log security event
     * ثبت رویداد امنیتی
     */
    security(event, details, meta = {}) {
        this.warn(`Security Event: ${event}`, {
            event,
            details,
            type: 'security',
            timestamp: new Date().toISOString(),
            ...meta
        });
    }

    /**
     * Log transaction event
     * ثبت رویداد تراکنش
     */
    transaction(event, transactionId, details, meta = {}) {
        this.info(`Transaction Event: ${event}`, {
            event,
            transactionId,
            details,
            type: 'transaction',
            timestamp: new Date().toISOString(),
            ...meta
        });
    }

    /**
     * Log hardware event
     * ثبت رویداد سخت‌افزاری
     */
    hardware(event, device, details, meta = {}) {
        this.info(`Hardware Event: ${event}`, {
            event,
            device,
            details,
            type: 'hardware',
            timestamp: new Date().toISOString(),
            ...meta
        });
    }

    /**
     * Log network event
     * ثبت رویداد شبکه
     */
    network(event, connection, details, meta = {}) {
        this.info(`Network Event: ${event}`, {
            event,
            connection,
            details,
            type: 'network',
            timestamp: new Date().toISOString(),
            ...meta
        });
    }

    /**
     * Log audit event
     * ثبت رویداد حسابرسی
     */
    audit(event, user, action, details, meta = {}) {
        this.info(`Audit Event: ${event}`, {
            event,
            user,
            action,
            details,
            type: 'audit',
            timestamp: new Date().toISOString(),
            ...meta
        });
    }

    /**
     * Create child logger
     * ایجاد ثبت‌کننده فرزند
     */
    child(module, config = {}) {
        const childConfig = {
            ...this.config,
            ...config,
            module
        };
        
        return new Logger(childConfig);
    }

    /**
     * Get log files
     * دریافت فایل‌های لاگ
     */
    async getLogFiles() {
        try {
            if (!this.config.enableFile) {
                return [];
            }
            
            const logDir = path.join(process.cwd(), this.config.logDir);
            const files = await fs.readdir(logDir);
            
            const logFiles = [];
            for (const file of files) {
                if (file.endsWith('.log') || file.endsWith('.gz')) {
                    const filePath = path.join(logDir, file);
                    const stats = await fs.stat(filePath);
                    
                    logFiles.push({
                        name: file,
                        path: filePath,
                        size: stats.size,
                        modified: stats.mtime,
                        type: file.endsWith('.gz') ? 'compressed' : 'log'
                    });
                }
            }
            
            return logFiles.sort((a, b) => b.modified - a.modified);
            
        } catch (error) {
            this.error('Failed to get log files:', error);
            return [];
        }
    }

    /**
     * Clear old logs
     * پاک کردن لاگ‌های قدیمی
     */
    async clearOldLogs(daysToKeep = 30) {
        try {
            if (!this.config.enableFile) {
                return;
            }
            
            const logDir = path.join(process.cwd(), this.config.logDir);
            const files = await fs.readdir(logDir);
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            let deletedCount = 0;
            
            for (const file of files) {
                if (file.endsWith('.log') || file.endsWith('.gz')) {
                    const filePath = path.join(logDir, file);
                    const stats = await fs.stat(filePath);
                    
                    if (stats.mtime < cutoffDate) {
                        await fs.unlink(filePath);
                        deletedCount++;
                        this.info(`Deleted old log file: ${file}`);
                    }
                }
            }
            
            this.info(`Cleared ${deletedCount} old log files`);
            return deletedCount;
            
        } catch (error) {
            this.error('Failed to clear old logs:', error);
            throw error;
        }
    }

    /**
     * Get logger status
     * دریافت وضعیت ثبت‌کننده
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            level: this.config.level,
            enableConsole: this.config.enableConsole,
            enableFile: this.config.enableFile,
            logDir: this.config.logDir
        };
    }

    /**
     * Shutdown logger
     * خاموش کردن ثبت‌کننده
     */
    async shutdown() {
        try {
            if (this.logger && this.logger.close) {
                await new Promise((resolve) => {
                    this.logger.close(resolve);
                });
            }
            
            this.isInitialized = false;
            this.logger = null;
            
        } catch (error) {
            console.error('Logger shutdown error:', error);
        }
    }
}

module.exports = { Logger };