/**
 * Thermal Printer Module for POS SDK 7220
 * ماژول چاپگر حرارتی برای SDK POS 7220
 * 
 * Features:
 * - Receipt Printing
 * - Report Generation
 * - Multiple Font Support
 * - Barcode & QR Code Printing
 * - Custom Layouts
 * - Print Queue Management
 */

const EventEmitter = require('events');
const { SerialPort } = require('serialport');
const QRCode = require('qrcode');

class ThermalPrinter extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            port: config.port || '/dev/ttyUSB1',
            baudRate: config.baudRate || 9600,
            dataBits: config.dataBits || 8,
            stopBits: config.stopBits || 1,
            parity: config.parity || 'none',
            timeout: config.timeout || 10000,
            paperWidth: config.paperWidth || 80, // mm
            dpi: config.dpi || 203,
            ...config
        };
        
        this.status = {
            connected: false,
            ready: false,
            paperStatus: 'unknown',
            headStatus: 'unknown',
            temperature: 25,
            lastPrint: null,
            queueLength: 0
        };
        
        this.serialPort = null;
        this.printQueue = [];
        this.isPrinting = false;
        this.currentJob = null;
        
        // Printer commands
        this.commands = {
            INIT: Buffer.from([0x1B, 0x40]), // Initialize printer
            CUT: Buffer.from([0x1D, 0x56, 0x00]), // Full cut
            FEED: Buffer.from([0x0A]), // Line feed
            ALIGN_LEFT: Buffer.from([0x1B, 0x61, 0x00]),
            ALIGN_CENTER: Buffer.from([0x1B, 0x61, 0x01]),
            ALIGN_RIGHT: Buffer.from([0x1B, 0x61, 0x02]),
            BOLD_ON: Buffer.from([0x1B, 0x45, 0x01]),
            BOLD_OFF: Buffer.from([0x1B, 0x45, 0x00]),
            UNDERLINE_ON: Buffer.from([0x1B, 0x2D, 0x01]),
            UNDERLINE_OFF: Buffer.from([0x1B, 0x2D, 0x00]),
            FONT_NORMAL: Buffer.from([0x1B, 0x21, 0x00]),
            FONT_LARGE: Buffer.from([0x1B, 0x21, 0x11]),
            FONT_SMALL: Buffer.from([0x1B, 0x21, 0x22])
        };
        
        // Paper dimensions
        this.paperDimensions = {
            width: this.config.paperWidth,
            maxChars: Math.floor(this.config.paperWidth / 2.5), // Approximate chars per line
            lineHeight: 8 // dots
        };
    }

    /**
     * Initialize thermal printer
     * راه‌اندازی چاپگر حرارتی
     */
    async initialize() {
        try {
            this.logger.info('Initializing Thermal Printer...');
            
            // Initialize serial communication
            await this._initializeSerialPort();
            
            // Initialize printer hardware
            await this._initializePrinterHardware();
            
            // Start monitoring
            this._startMonitoring();
            
            // Start print queue processor
            this._startQueueProcessor();
            
            this.status.ready = true;
            this.logger.info('Thermal Printer initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize Thermal Printer:', error);
            throw error;
        }
    }

    /**
     * Initialize serial port
     * راه‌اندازی پورت سریال
     */
    async _initializeSerialPort() {
        try {
            this.serialPort = new SerialPort({
                path: this.config.port,
                baudRate: this.config.baudRate,
                dataBits: this.config.dataBits,
                stopBits: this.config.stopBits,
                parity: this.config.parity
            });
            
            this.serialPort.on('open', () => {
                this.logger.info(`Serial port ${this.config.port} opened for printer`);
                this.status.connected = true;
                this.emit('printer:connected');
            });
            
            this.serialPort.on('error', (error) => {
                this.logger.error('Printer serial port error:', error);
                this.status.connected = false;
                this.emit('printer:error', error);
            });
            
            this.serialPort.on('close', () => {
                this.logger.info('Printer serial port closed');
                this.status.connected = false;
                this.emit('printer:disconnected');
            });
            
        } catch (error) {
            this.logger.error('Failed to initialize printer serial port:', error);
            throw error;
        }
    }

    /**
     * Initialize printer hardware
     * راه‌اندازی سخت‌افزار چاپگر
     */
    async _initializePrinterHardware() {
        try {
            // Send initialization command
            await this._sendCommand(this.commands.INIT);
            
            // Check printer status
            await this._checkPrinterStatus();
            
            this.logger.info('Printer hardware initialized');
            
        } catch (error) {
            this.logger.error('Failed to initialize printer hardware:', error);
            throw error;
        }
    }

    /**
     * Check printer status
     * بررسی وضعیت چاپگر
     */
    async _checkPrinterStatus() {
        try {
            // Send status request command
            const statusCommand = Buffer.from([0x10, 0x04, 0x01]);
            const response = await this._sendCommand(statusCommand);
            
            // Parse status response
            this._parseStatusResponse(response);
            
        } catch (error) {
            this.logger.warn('Printer status check failed:', error.message);
        }
    }

    /**
     * Parse status response
     * تجزیه پاسخ وضعیت
     */
    _parseStatusResponse(response) {
        try {
            if (response && response.length > 0) {
                const statusByte = response[0];
                
                // Paper status
                this.status.paperStatus = (statusByte & 0x04) ? 'low' : 'ok';
                
                // Head status
                this.status.headStatus = (statusByte & 0x08) ? 'error' : 'ok';
                
                // Temperature status
                this.status.temperature = (statusByte & 0x10) ? 'high' : 'normal';
            }
        } catch (error) {
            this.logger.error('Failed to parse status response:', error);
        }
    }

    /**
     * Start monitoring
     * شروع نظارت
     */
    _startMonitoring() {
        // Monitor printer status
        setInterval(() => {
            this._checkPrinterStatus();
        }, 30000); // Every 30 seconds
        
        // Monitor connection health
        setInterval(() => {
            this._checkConnectionHealth();
        }, 60000); // Every minute
    }

    /**
     * Check connection health
     * بررسی سلامت اتصال
     */
    async _checkConnectionHealth() {
        try {
            if (this.status.connected) {
                // Send a simple command to check if printer responds
                await this._sendCommand(this.commands.FEED);
            }
        } catch (error) {
            this.logger.warn('Printer connection health check failed:', error.message);
            this.status.connected = false;
            this.emit('printer:disconnected');
        }
    }

    /**
     * Start queue processor
     * شروع پردازشگر صف
     */
    _startQueueProcessor() {
        setInterval(() => {
            this._processPrintQueue();
        }, 1000); // Every second
    }

    /**
     * Process print queue
     * پردازش صف چاپ
     */
    async _processPrintQueue() {
        if (this.isPrinting || this.printQueue.length === 0) {
            return;
        }
        
        try {
            this.isPrinting = true;
            const printJob = this.printQueue.shift();
            this.currentJob = printJob;
            
            this.logger.info(`Processing print job: ${printJob.id}`);
            this.emit('print:started', printJob);
            
            await this._executePrintJob(printJob);
            
            this.status.lastPrint = new Date();
            this.status.queueLength = this.printQueue.length;
            
            this.emit('print:completed', printJob);
            this.logger.info(`Print job completed: ${printJob.id}`);
            
        } catch (error) {
            this.logger.error('Print job failed:', error);
            this.emit('print:error', { job: this.currentJob, error });
        } finally {
            this.isPrinting = false;
            this.currentJob = null;
        }
    }

    /**
     * Execute print job
     * اجرای کار چاپ
     */
    async _executePrintJob(printJob) {
        try {
            // Send print data
            for (const command of printJob.commands) {
                await this._sendCommand(command);
                
                // Add small delay between commands
                await this._delay(50);
            }
            
            // Finalize print job
            await this._finalizePrintJob(printJob);
            
        } catch (error) {
            this.logger.error('Failed to execute print job:', error);
            throw error;
        }
    }

    /**
     * Finalize print job
     * نهایی کردن کار چاپ
     */
    async _finalizePrintJob(printJob) {
        try {
            // Feed paper
            await this._sendCommand(this.commands.FEED);
            await this._sendCommand(this.commands.FEED);
            
            // Cut paper if requested
            if (printJob.options.cutPaper) {
                await this._sendCommand(this.commands.CUT);
            }
            
        } catch (error) {
            this.logger.error('Failed to finalize print job:', error);
            throw error;
        }
    }

    /**
     * Send command to printer
     * ارسال دستور به چاپگر
     */
    async _sendCommand(command, timeout = this.config.timeout) {
        return new Promise((resolve, reject) => {
            if (!this.serialPort || !this.status.connected) {
                reject(new Error('Printer not connected'));
                return;
            }
            
            const timer = setTimeout(() => {
                reject(new Error('Printer command timeout'));
            }, timeout);
            
            this.serialPort.write(command, (error) => {
                clearTimeout(timer);
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Add print job to queue
     * افزودن کار چاپ به صف
     */
    addToQueue(printJob) {
        printJob.id = this._generateJobId();
        printJob.timestamp = new Date();
        printJob.status = 'queued';
        
        this.printQueue.push(printJob);
        this.status.queueLength = this.printQueue.length;
        
        this.logger.info(`Print job added to queue: ${printJob.id}`);
        this.emit('print:queued', printJob);
        
        return printJob.id;
    }

    /**
     * Generate job ID
     * تولید شناسه کار
     */
    _generateJobId() {
        return `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Print receipt
     * چاپ رسید
     */
    async printReceipt(receiptData, options = {}) {
        try {
            const printJob = {
                type: 'receipt',
                data: receiptData,
                options: {
                    cutPaper: true,
                    align: 'center',
                    ...options
                },
                commands: []
            };
            
            // Generate receipt commands
            printJob.commands = await this._generateReceiptCommands(receiptData, printJob.options);
            
            // Add to queue
            const jobId = this.addToQueue(printJob);
            
            this.logger.info(`Receipt print job created: ${jobId}`);
            return jobId;
            
        } catch (error) {
            this.logger.error('Failed to create receipt print job:', error);
            throw error;
        }
    }

    /**
     * Generate receipt commands
     * تولید دستورات رسید
     */
    async _generateReceiptCommands(receiptData, options) {
        const commands = [];
        
        try {
            // Header
            commands.push(this.commands.ALIGN_CENTER);
            commands.push(this.commands.BOLD_ON);
            commands.push(Buffer.from(receiptData.header || 'RECEIPT', 'utf8'));
            commands.push(this.commands.BOLD_OFF);
            commands.push(this.commands.FEED);
            
            // Store information
            if (receiptData.store) {
                commands.push(Buffer.from(receiptData.store.name || 'Store Name', 'utf8'));
                commands.push(this.commands.FEED);
                if (receiptData.store.address) {
                    commands.push(Buffer.from(receiptData.store.address, 'utf8'));
                    commands.push(this.commands.FEED);
                }
            }
            
            commands.push(this.commands.FEED);
            
            // Transaction details
            commands.push(this.commands.ALIGN_LEFT);
            commands.push(Buffer.from(`Date: ${receiptData.date || new Date().toLocaleString()}`, 'utf8'));
            commands.push(this.commands.FEED);
            commands.push(Buffer.from(`Receipt #: ${receiptData.receiptNumber || 'N/A'}`, 'utf8'));
            commands.push(this.commands.FEED);
            commands.push(Buffer.from(`Cashier: ${receiptData.cashier || 'N/A'}`, 'utf8'));
            commands.push(this.commands.FEED);
            commands.push(this.commands.FEED);
            
            // Items
            if (receiptData.items && receiptData.items.length > 0) {
                commands.push(this.commands.BOLD_ON);
                commands.push(Buffer.from('ITEMS:', 'utf8'));
                commands.push(this.commands.BOLD_OFF);
                commands.push(this.commands.FEED);
                
                for (const item of receiptData.items) {
                    const itemLine = `${item.name} x${item.quantity} @ ${item.price}`;
                    commands.push(Buffer.from(itemLine, 'utf8'));
                    commands.push(this.commands.FEED);
                }
                
                commands.push(this.commands.FEED);
            }
            
            // Totals
            commands.push(this.commands.ALIGN_RIGHT);
            commands.push(this.commands.BOLD_ON);
            if (receiptData.subtotal) {
                commands.push(Buffer.from(`Subtotal: ${receiptData.subtotal}`, 'utf8'));
                commands.push(this.commands.FEED);
            }
            if (receiptData.tax) {
                commands.push(Buffer.from(`Tax: ${receiptData.tax}`, 'utf8'));
                commands.push(this.commands.FEED);
            }
            if (receiptData.total) {
                commands.push(Buffer.push(Buffer.from(`TOTAL: ${receiptData.total}`, 'utf8'));
                commands.push(this.commands.FEED);
            }
            commands.push(this.commands.BOLD_OFF);
            
            // Payment method
            if (receiptData.paymentMethod) {
                commands.push(this.commands.ALIGN_CENTER);
                commands.push(Buffer.from(`Payment: ${receiptData.paymentMethod}`, 'utf8'));
                commands.push(this.commands.FEED);
            }
            
            // Footer
            commands.push(this.commands.ALIGN_CENTER);
            commands.push(this.commands.FEED);
            commands.push(Buffer.from(receiptData.footer || 'Thank you for your purchase!', 'utf8'));
            commands.push(this.commands.FEED);
            commands.push(this.commands.FEED);
            
            // QR Code if transaction ID provided
            if (receiptData.transactionId) {
                try {
                    const qrCodeData = await QRCode.toBuffer(receiptData.transactionId, {
                        width: 200,
                        margin: 1
                    });
                    
                    // Convert QR code to printer commands (simplified)
                    commands.push(Buffer.from('QR Code:', 'utf8'));
                    commands.push(this.commands.FEED);
                    // In real implementation, you would convert QR code to printer-specific format
                } catch (error) {
                    this.logger.warn('Failed to generate QR code:', error.message);
                }
            }
            
        } catch (error) {
            this.logger.error('Failed to generate receipt commands:', error);
            throw error;
        }
        
        return commands;
    }

    /**
     * Print report
     * چاپ گزارش
     */
    async printReport(reportData, options = {}) {
        try {
            const printJob = {
                type: 'report',
                data: reportData,
                options: {
                    cutPaper: false,
                    align: 'left',
                    ...options
                },
                commands: []
            };
            
            // Generate report commands
            printJob.commands = this._generateReportCommands(reportData, printJob.options);
            
            // Add to queue
            const jobId = this.addToQueue(printJob);
            
            this.logger.info(`Report print job created: ${jobId}`);
            return jobId;
            
        } catch (error) {
            this.logger.error('Failed to create report print job:', error);
            throw error;
        }
    }

    /**
     * Generate report commands
     * تولید دستورات گزارش
     */
    _generateReportCommands(reportData, options) {
        const commands = [];
        
        try {
            // Header
            commands.push(this.commands.ALIGN_CENTER);
            commands.push(this.commands.BOLD_ON);
            commands.push(Buffer.from(reportData.title || 'REPORT', 'utf8'));
            commands.push(this.commands.BOLD_OFF);
            commands.push(this.commands.FEED);
            
            // Date range
            if (reportData.dateRange) {
                commands.push(Buffer.from(`Period: ${reportData.dateRange.start} - ${reportData.dateRange.end}`, 'utf8'));
                commands.push(this.commands.FEED);
            }
            
            commands.push(this.commands.FEED);
            
            // Report content
            commands.push(this.commands.ALIGN_LEFT);
            if (reportData.content) {
                for (const line of reportData.content) {
                    commands.push(Buffer.from(line, 'utf8'));
                    commands.push(this.commands.FEED);
                }
            }
            
            // Summary
            if (reportData.summary) {
                commands.push(this.commands.FEED);
                commands.push(this.commands.BOLD_ON);
                commands.push(Buffer.from('SUMMARY:', 'utf8'));
                commands.push(this.commands.BOLD_OFF);
                commands.push(this.commands.FEED);
                
                for (const [key, value] of Object.entries(reportData.summary)) {
                    commands.push(Buffer.from(`${key}: ${value}`, 'utf8'));
                    commands.push(this.commands.FEED);
                }
            }
            
        } catch (error) {
            this.logger.error('Failed to generate report commands:', error);
            throw error;
        }
        
        return commands;
    }

    /**
     * Print barcode
     * چاپ بارکد
     */
    async printBarcode(barcodeData, options = {}) {
        try {
            const printJob = {
                type: 'barcode',
                data: barcodeData,
                options: {
                    cutPaper: false,
                    height: 100,
                    width: 2,
                    ...options
                },
                commands: []
            };
            
            // Generate barcode commands
            printJob.commands = this._generateBarcodeCommands(barcodeData, printJob.options);
            
            // Add to queue
            const jobId = this.addToQueue(printJob);
            
            this.logger.info(`Barcode print job created: ${jobId}`);
            return jobId;
            
        } catch (error) {
            this.logger.error('Failed to create barcode print job:', error);
            throw error;
        }
    }

    /**
     * Generate barcode commands
     * تولید دستورات بارکد
     */
    _generateBarcodeCommands(barcodeData, options) {
        const commands = [];
        
        try {
            // Set barcode parameters
            const height = options.height || 100;
            const width = options.width || 2;
            
            // Barcode height command
            commands.push(Buffer.from([0x1D, 0x68, height]));
            
            // Barcode width command
            commands.push(Buffer.from([0x1D, 0x77, width]));
            
            // Print barcode (Code 128)
            commands.push(Buffer.from([0x1D, 0x6B, 0x49, barcodeData.length]));
            commands.push(Buffer.from(barcodeData, 'utf8'));
            
            // Feed paper
            commands.push(this.commands.FEED);
            
        } catch (error) {
            this.logger.error('Failed to generate barcode commands:', error);
            throw error;
        }
        
        return commands;
    }

    /**
     * Get printer status
     * دریافت وضعیت چاپگر
     */
    getStatus() {
        return {
            ...this.status,
            config: this.config,
            currentJob: this.currentJob ? {
                id: this.currentJob.id,
                type: this.currentJob.type,
                status: this.currentJob.status
            } : null
        };
    }

    /**
     * Clear print queue
     * پاک کردن صف چاپ
     */
    clearQueue() {
        const clearedJobs = this.printQueue.length;
        this.printQueue = [];
        this.status.queueLength = 0;
        
        this.logger.info(`Print queue cleared, ${clearedJobs} jobs removed`);
        this.emit('print:queue-cleared', clearedJobs);
        
        return clearedJobs;
    }

    /**
     * Utility function for delays
     * تابع کمکی برای تاخیر
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Shutdown thermal printer
     * خاموش کردن چاپگر حرارتی
     */
    async shutdown() {
        try {
            this.logger.info('Shutting down Thermal Printer...');
            
            // Wait for current print job to complete
            if (this.isPrinting) {
                this.logger.info('Waiting for current print job to complete...');
                while (this.isPrinting) {
                    await this._delay(1000);
                }
            }
            
            // Clear print queue
            this.clearQueue();
            
            if (this.serialPort) {
                this.serialPort.close();
            }
            
            this.status.connected = false;
            this.status.ready = false;
            
            this.logger.info('Thermal Printer shutdown complete');
            
        } catch (error) {
            this.logger.error('Thermal Printer shutdown failed:', error);
            throw error;
        }
    }
}

module.exports = { ThermalPrinter };