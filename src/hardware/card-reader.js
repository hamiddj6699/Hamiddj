/**
 * Card Reader Module for POS SDK 7220
 * ماژول کارت‌خوان برای SDK POS 7220
 * 
 * Features:
 * - Magnetic Card Reader (Track 1 & 2)
 * - IC Card (Smart Card) Support
 * - NFC Technology Support
 * - Secure Data Processing
 * - Multiple Card Format Support
 */

const EventEmitter = require('events');
const { SerialPort } = require('serialport');
const { SecurityManager } = require('../security/security-manager');

class CardReader extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            port: config.port || '/dev/ttyUSB0',
            baudRate: config.baudRate || 9600,
            dataBits: config.dataBits || 8,
            stopBits: config.stopBits || 1,
            parity: config.parity || 'none',
            timeout: config.timeout || 5000,
            ...config
        };
        
        this.status = {
            connected: false,
            ready: false,
            cardPresent: false,
            lastRead: null,
            errorCount: 0
        };
        
        this.serialPort = null;
        this.security = null;
        this.cardData = null;
        this.readBuffer = Buffer.alloc(0);
        
        // Card type detection
        this.supportedCardTypes = {
            magnetic: {
                track1: true,
                track2: true,
                track3: false
            },
            ic: {
                iso7816: true,
                emv: true,
                tlv: true
            },
            nfc: {
                iso14443: true,
                iso15693: true,
                ndef: true
            }
        };
    }

    /**
     * Initialize card reader
     * راه‌اندازی کارت‌خوان
     */
    async initialize() {
        try {
            this.logger.info('Initializing Card Reader...');
            
            // Initialize security manager
            this.security = new SecurityManager();
            await this.security.initialize();
            
            // Initialize serial communication
            await this._initializeSerialPort();
            
            // Initialize card detection
            await this._initializeCardDetection();
            
            // Start monitoring
            this._startMonitoring();
            
            this.status.ready = true;
            this.logger.info('Card Reader initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize Card Reader:', error);
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
                this.logger.info(`Serial port ${this.config.port} opened`);
                this.status.connected = true;
                this.emit('reader:connected');
            });
            
            this.serialPort.on('data', (data) => {
                this._handleSerialData(data);
            });
            
            this.serialPort.on('error', (error) => {
                this.logger.error('Serial port error:', error);
                this.status.connected = false;
                this.emit('reader:error', error);
            });
            
            this.serialPort.on('close', () => {
                this.logger.info('Serial port closed');
                this.status.connected = false;
                this.emit('reader:disconnected');
            });
            
        } catch (error) {
            this.logger.error('Failed to initialize serial port:', error);
            throw error;
        }
    }

    /**
     * Initialize card detection
     * راه‌اندازی تشخیص کارت
     */
    async _initializeCardDetection() {
        // Send initialization commands to card reader
        const initCommands = [
            { command: 'INIT', description: 'Initialize reader' },
            { command: 'MODE', description: 'Set card mode' },
            { command: 'FORMAT', description: 'Set data format' }
        ];
        
        for (const cmd of initCommands) {
            try {
                await this._sendCommand(cmd.command);
                this.logger.info(`Card detection command ${cmd.description} sent`);
            } catch (error) {
                this.logger.warn(`Failed to send ${cmd.description}:`, error.message);
            }
        }
    }

    /**
     * Start monitoring
     * شروع نظارت
     */
    _startMonitoring() {
        // Monitor card presence
        setInterval(() => {
            this._checkCardPresence();
        }, 1000); // Every second
        
        // Monitor connection health
        setInterval(() => {
            this._checkConnectionHealth();
        }, 5000); // Every 5 seconds
    }

    /**
     * Check card presence
     * بررسی حضور کارت
     */
    async _checkCardPresence() {
        try {
            if (this.status.connected) {
                const response = await this._sendCommand('STATUS');
                const cardPresent = response.includes('CARD_PRESENT');
                
                if (cardPresent !== this.status.cardPresent) {
                    this.status.cardPresent = cardPresent;
                    if (cardPresent) {
                        this.emit('card:inserted');
                        this.logger.info('Card detected');
                    } else {
                        this.emit('card:removed');
                        this.logger.info('Card removed');
                        this.cardData = null;
                    }
                }
            }
        } catch (error) {
            this.logger.debug('Card presence check failed:', error.message);
        }
    }

    /**
     * Check connection health
     * بررسی سلامت اتصال
     */
    async _checkConnectionHealth() {
        try {
            if (this.status.connected) {
                const response = await this._sendCommand('PING');
                if (!response.includes('PONG')) {
                    throw new Error('No response from card reader');
                }
            }
        } catch (error) {
            this.logger.warn('Connection health check failed:', error.message);
            this.status.errorCount++;
            
            if (this.status.errorCount > 3) {
                this.logger.error('Too many errors, reconnecting...');
                await this._reconnect();
            }
        }
    }

    /**
     * Reconnect to card reader
     * اتصال مجدد به کارت‌خوان
     */
    async _reconnect() {
        try {
            this.logger.info('Attempting to reconnect...');
            
            if (this.serialPort) {
                this.serialPort.close();
            }
            
            await this._initializeSerialPort();
            this.status.errorCount = 0;
            
            this.logger.info('Reconnection successful');
            
        } catch (error) {
            this.logger.error('Reconnection failed:', error);
        }
    }

    /**
     * Send command to card reader
     * ارسال دستور به کارت‌خوان
     */
    async _sendCommand(command, timeout = this.config.timeout) {
        return new Promise((resolve, reject) => {
            if (!this.serialPort || !this.status.connected) {
                reject(new Error('Serial port not connected'));
                return;
            }
            
            const timer = setTimeout(() => {
                reject(new Error(`Command timeout: ${command}`));
            }, timeout);
            
            this.serialPort.write(`${command}\r\n`, (error) => {
                if (error) {
                    clearTimeout(timer);
                    reject(error);
                    return;
                }
                
                // Wait for response
                this.once('command:response', (response) => {
                    clearTimeout(timer);
                    resolve(response);
                });
            });
        });
    }

    /**
     * Handle serial data
     * مدیریت داده‌های سریال
     */
    _handleSerialData(data) {
        this.readBuffer = Buffer.concat([this.readBuffer, data]);
        
        // Look for complete responses (ending with \r\n)
        const lines = this.readBuffer.toString().split('\r\n');
        
        if (lines.length > 1) {
            // Complete response received
            const response = lines[0];
            this.readBuffer = Buffer.from(lines.slice(1).join('\r\n'));
            
            this.emit('command:response', response);
        }
    }

    /**
     * Read magnetic card
     * خواندن کارت مغناطیسی
     */
    async readMagneticCard() {
        try {
            this.logger.info('Reading magnetic card...');
            
            if (!this.status.cardPresent) {
                throw new Error('No card present');
            }
            
            // Send read command for magnetic card
            const response = await this._sendCommand('READ_MAG');
            
            // Parse magnetic card data
            const cardData = this._parseMagneticCardData(response);
            
            // Encrypt sensitive data
            const encryptedData = this.security.encryptCardData(cardData);
            
            this.cardData = {
                type: 'magnetic',
                data: cardData,
                encrypted: encryptedData,
                timestamp: new Date().toISOString()
            };
            
            this.status.lastRead = new Date();
            this.emit('card:read', this.cardData);
            
            this.logger.info('Magnetic card read successfully');
            return this.cardData;
            
        } catch (error) {
            this.logger.error('Failed to read magnetic card:', error);
            throw error;
        }
    }

    /**
     * Parse magnetic card data
     * تجزیه داده‌های کارت مغناطیسی
     */
    _parseMagneticCardData(rawData) {
        try {
            const tracks = {};
            
            // Parse Track 1 (alphanumeric)
            if (rawData.includes('Track1:')) {
                const track1Match = rawData.match(/Track1:([^|]+)/);
                if (track1Match) {
                    tracks.track1 = this._parseTrack1(track1Match[1]);
                }
            }
            
            // Parse Track 2 (numeric)
            if (rawData.includes('Track2:')) {
                const track2Match = rawData.match(/Track2:([^=]+)/);
                if (track2Match) {
                    tracks.track2 = this._parseTrack2(track2Match[1]);
                }
            }
            
            return {
                tracks,
                rawData,
                format: 'ISO 7811',
                encoding: 'ISO 7811'
            };
            
        } catch (error) {
            this.logger.error('Failed to parse magnetic card data:', error);
            throw error;
        }
    }

    /**
     * Parse Track 1 data
     * تجزیه داده‌های Track 1
     */
    _parseTrack1(track1Data) {
        // Track 1 format: %B1234567890123456^CARDHOLDER/NAME^YYMM#123456789012345678901234567890?
        const parts = track1Data.split('^');
        
        if (parts.length >= 3) {
            const pan = parts[0].substring(1); // Remove '%B'
            const cardholder = parts[1];
            const expiry = parts[2].substring(0, 4);
            const serviceCode = parts[2].substring(4, 6);
            const discretionary = parts[2].substring(6);
            
            return {
                pan: pan,
                cardholder: cardholder,
                expiry: expiry,
                serviceCode: serviceCode,
                discretionary: discretionary,
                raw: track1Data
            };
        }
        
        return { raw: track1Data };
    }

    /**
     * Parse Track 2 data
     * تجزیه داده‌های Track 2
     */
    _parseTrack2(track2Data) {
        // Track 2 format: 1234567890123456=YYMM#123456789012345678901234567890?
        const parts = track2Data.split('=');
        
        if (parts.length >= 2) {
            const pan = parts[0];
            const remaining = parts[1];
            const expiry = remaining.substring(0, 4);
            const serviceCode = remaining.substring(4, 6);
            const discretionary = remaining.substring(6);
            
            return {
                pan: pan,
                expiry: expiry,
                serviceCode: serviceCode,
                discretionary: discretionary,
                raw: track2Data
            };
        }
        
        return { raw: track2Data };
    }

    /**
     * Read IC card
     * خواندن کارت هوشمند
     */
    async readICCard() {
        try {
            this.logger.info('Reading IC card...');
            
            if (!this.status.cardPresent) {
                throw new Error('No card present');
            }
            
            // Send read command for IC card
            const response = await this._sendCommand('READ_IC');
            
            // Parse IC card data
            const cardData = this._parseICCardData(response);
            
            // Encrypt sensitive data
            const encryptedData = this.security.encryptCardData(cardData);
            
            this.cardData = {
                type: 'ic',
                data: cardData,
                encrypted: encryptedData,
                timestamp: new Date().toISOString()
            };
            
            this.status.lastRead = new Date();
            this.emit('card:read', this.cardData);
            
            this.logger.info('IC card read successfully');
            return this.cardData;
            
        } catch (error) {
            this.logger.error('Failed to read IC card:', error);
            throw error;
        }
    }

    /**
     * Parse IC card data
     * تجزیه داده‌های کارت هوشمند
     */
    _parseICCardData(rawData) {
        try {
            // Parse EMV TLV data
            const tlvData = this._parseTLV(rawData);
            
            return {
                tlv: tlvData,
                rawData,
                format: 'EMV',
                encoding: 'TLV'
            };
            
        } catch (error) {
            this.logger.error('Failed to parse IC card data:', error);
            throw error;
        }
    }

    /**
     * Parse TLV (Tag-Length-Value) data
     * تجزیه داده‌های TLV
     */
    _parseTLV(tlvData) {
        const result = {};
        let offset = 0;
        
        while (offset < tlvData.length) {
            // Read tag (1-2 bytes)
            let tag = tlvData[offset++];
            if ((tag & 0x1F) === 0x1F) {
                tag = (tag << 8) | tlvData[offset++];
            }
            
            // Read length
            let length = tlvData[offset++];
            if (length === 0x81) {
                length = tlvData[offset++];
            } else if (length === 0x82) {
                length = (tlvData[offset] << 8) | tlvData[offset + 1];
                offset += 2;
            }
            
            // Read value
            const value = tlvData.slice(offset, offset + length);
            result[tag.toString(16).toUpperCase()] = value;
            
            offset += length;
        }
        
        return result;
    }

    /**
     * Read NFC card
     * خواندن کارت NFC
     */
    async readNFCCard() {
        try {
            this.logger.info('Reading NFC card...');
            
            if (!this.status.cardPresent) {
                throw new Error('No card present');
            }
            
            // Send read command for NFC card
            const response = await this._sendCommand('READ_NFC');
            
            // Parse NFC card data
            const cardData = this._parseNFCCardData(response);
            
            // Encrypt sensitive data
            const encryptedData = this.security.encryptCardData(cardData);
            
            this.cardData = {
                type: 'nfc',
                data: cardData,
                encrypted: encryptedData,
                timestamp: new Date().toISOString()
            };
            
            this.status.lastRead = new Date();
            this.emit('card:read', this.cardData);
            
            this.logger.info('NFC card read successfully');
            return this.cardData;
            
        } catch (error) {
            this.logger.error('Failed to read NFC card:', error);
            throw error;
        }
    }

    /**
     * Parse NFC card data
     * تجزیه داده‌های کارت NFC
     */
    _parseNFCCardData(rawData) {
        try {
            // Parse NDEF (NFC Data Exchange Format) data
            const ndefData = this._parseNDEF(rawData);
            
            return {
                ndef: ndefData,
                rawData,
                format: 'NDEF',
                encoding: 'ISO 14443'
            };
            
        } catch (error) {
            this.logger.error('Failed to parse NFC card data:', error);
            throw error;
        }
    }

    /**
     * Parse NDEF data
     * تجزیه داده‌های NDEF
     */
    _parseNDEF(ndefData) {
        try {
            // Simplified NDEF parsing
            const result = {
                version: ndefData[0] & 0x0F,
                messageBegin: (ndefData[0] & 0x80) !== 0,
                messageEnd: (ndefData[0] & 0x40) !== 0,
                shortRecord: (ndefData[0] & 0x10) !== 0,
                idLength: ndefData[0] & 0x08,
                typeNameFormat: ndefData[1] & 0x07,
                typeLength: ndefData[2],
                payloadLength: ndefData[3],
                type: ndefData.slice(4, 4 + ndefData[2]).toString(),
                payload: ndefData.slice(4 + ndefData[2], 4 + ndefData[2] + ndefData[3])
            };
            
            return result;
            
        } catch (error) {
            this.logger.error('Failed to parse NDEF data:', error);
            return { raw: ndefData };
        }
    }

    /**
     * Auto-detect card type and read
     * تشخیص خودکار نوع کارت و خواندن
     */
    async autoReadCard() {
        try {
            this.logger.info('Auto-detecting card type...');
            
            if (!this.status.cardPresent) {
                throw new Error('No card present');
            }
            
            // Try to detect card type
            const cardType = await this._detectCardType();
            
            switch (cardType) {
                case 'magnetic':
                    return await this.readMagneticCard();
                case 'ic':
                    return await this.readICCard();
                case 'nfc':
                    return await this.readNFCCard();
                default:
                    throw new Error(`Unsupported card type: ${cardType}`);
            }
            
        } catch (error) {
            this.logger.error('Auto-read card failed:', error);
            throw error;
        }
    }

    /**
     * Detect card type
     * تشخیص نوع کارت
     */
    async _detectCardType() {
        try {
            // Send detection command
            const response = await this._sendCommand('DETECT_TYPE');
            
            if (response.includes('MAGNETIC')) {
                return 'magnetic';
            } else if (response.includes('IC')) {
                return 'ic';
            } else if (response.includes('NFC')) {
                return 'nfc';
            } else {
                throw new Error('Unknown card type');
            }
            
        } catch (error) {
            this.logger.error('Card type detection failed:', error);
            throw error;
        }
    }

    /**
     * Get card reader status
     * دریافت وضعیت کارت‌خوان
     */
    getStatus() {
        return {
            ...this.status,
            config: this.config,
            supportedCardTypes: this.supportedCardTypes,
            cardData: this.cardData ? {
                type: this.cardData.type,
                timestamp: this.cardData.timestamp
            } : null
        };
    }

    /**
     * Shutdown card reader
     * خاموش کردن کارت‌خوان
     */
    async shutdown() {
        try {
            this.logger.info('Shutting down Card Reader...');
            
            if (this.serialPort) {
                this.serialPort.close();
            }
            
            this.status.connected = false;
            this.status.ready = false;
            
            this.logger.info('Card Reader shutdown complete');
            
        } catch (error) {
            this.logger.error('Card Reader shutdown failed:', error);
            throw error;
        }
    }
}

module.exports = { CardReader };