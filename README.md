# POS SDK 7220 🏪💳

[![Node.js](https://img.shields.io/badge/Node.js-16.x-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-green.svg)]()
[![Security](https://img.shields.io/badge/Security-Audited-green.svg)]()

> **Comprehensive POS SDK for New 7220 device with magnetic card reader, IC card, NFC, thermal printer, and enterprise-grade security features**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Requirements](#system-requirements)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Development](#development)
- [Deployment](#deployment)
- [Security](#security)
- [Contributing](#contributing)
- [Support](#support)

---

## 🌟 Overview

The **POS SDK 7220** is a comprehensive, enterprise-grade software development kit designed specifically for the New 7220 Point of Sale device. This SDK provides developers with a robust foundation for building secure, reliable, and feature-rich POS applications that integrate seamlessly with payment systems, banks, and PSPs in Iran.

### 🎯 Key Benefits

- **🔒 Enterprise Security**: PCI-DSS compliant with end-to-end encryption
- **🔄 Hardware Integration**: Full support for magnetic card readers, IC cards, NFC, and thermal printers
- **🌐 Network Flexibility**: Multi-connection support (Wi-Fi, GSM/3G/4G, USB)
- **📱 OTA Updates**: Over-the-air system updates and application management
- **📊 Comprehensive Logging**: Advanced logging and monitoring capabilities
- **🚀 High Performance**: Optimized for real-time transaction processing

---

## ✨ Features

### 🏗️ Core Architecture
- **Modular Design**: Clean separation of concerns with dedicated modules
- **Event-Driven**: Real-time notifications using Node.js EventEmitter
- **Async/Await**: Modern JavaScript patterns for better performance
- **Error Handling**: Comprehensive error handling with retry mechanisms

### 💳 Payment Hardware Support
- **Magnetic Card Reader**: Track 1 & 2 data parsing and encryption
- **IC Card (Smart Card)**: EMV standard support with TLV parsing
- **NFC Module**: NDEF data parsing and secure communication
- **Thermal Printer**: ESC/POS commands for receipts, reports, and barcodes

### 🔐 Security Features
- **End-to-End Encryption**: AES-256-GCM for sensitive data
- **PCI-DSS Compliance**: Payment card industry security standards
- **Key Management**: Automated key generation, rotation, and secure storage
- **User Authorization**: Role-based access control system
- **Audit Logging**: Comprehensive security event logging

### 🌐 Network & Communication
- **Multi-Connection**: Wi-Fi, GSM/3G/4G, and USB connectivity
- **Secure Protocols**: HTTPS/TLS for server communication
- **OTA Updates**: Remote software updates and deployment
- **Data Sync**: Batch processing and real-time synchronization

### 📊 Monitoring & Logging
- **Structured Logging**: Winston-based logging with daily rotation
- **Performance Metrics**: Real-time performance monitoring
- **Health Checks**: Device health and connectivity monitoring
- **Alert System**: Automated alerts for critical issues

---

## 🖥️ System Requirements

### Minimum Requirements
- **Operating System**: Ubuntu 18.04+, Debian 10+, or Raspberry Pi OS
- **Node.js**: Version 16.x or higher
- **Memory**: 2GB RAM
- **Storage**: 8GB available disk space
- **Network**: Wi-Fi or Ethernet connection

### Recommended Requirements
- **Operating System**: Ubuntu 20.04+ or Debian 11+
- **Node.js**: Version 18.x LTS
- **Memory**: 4GB RAM
- **Storage**: 16GB SSD
- **Network**: Gigabit Ethernet + Wi-Fi 5

### Hardware Compatibility
- **New 7220 POS Device**: Full compatibility
- **Card Readers**: Magnetic, IC, and NFC modules
- **Printers**: Thermal printers with ESC/POS support
- **Network**: Wi-Fi, GSM/3G/4G, USB connectivity

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/pos-sdk-7220.git
cd pos-sdk-7220
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure the Application
```bash
cp config/pos-sdk.example.json config/pos-sdk.json
# Edit config/pos-sdk.json with your settings
```

### 4. Run the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 5. Test Basic Functionality
```bash
# Run hardware tests
make test-hardware

# Run application tests
npm test
```

---

## 📦 Installation

### Automated Installation (Recommended)
```bash
# Make the installation script executable
chmod +x scripts/install-pos-app.sh

# Run the automated installation
./scripts/install-pos-app.sh
```

### Manual Installation
```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install dependencies
npm install

# 3. Build the application
npm run build

# 4. Create systemd service
sudo cp scripts/pos-app.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pos-app
sudo systemctl start pos-app
```

### Docker Installation
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build specific stages
docker build --target production -t pos-sdk-7220:latest .
docker run -d -p 3000:3000 --name pos-app pos-sdk-7220:latest
```

---

## ⚙️ Configuration

### Environment Variables
```bash
# Core Configuration
NODE_ENV=production
PORT=3000

# Device Configuration
POS_DEVICE_ID=POS_7220_001
POS_MODEL=7220
POS_FIRMWARE=1.0.0

# Network Configuration
POS_WIFI_SSID=YourWiFiSSID
POS_WIFI_PASSWORD=YourWiFiPassword
POS_SERVER_HOST=api.pos7220.com
POS_SERVER_PORT=443
POS_SERVER_SECURE=true

# Security Configuration
POS_SECURITY_ENABLED=true
POS_PCI_COMPLIANCE=true
```

### Configuration File Structure
```json
{
  "device": {
    "id": "POS_7220_001",
    "model": "7220",
    "firmware": "1.0.0"
  },
  "security": {
    "encryption": {
      "algorithm": "aes-256-gcm",
      "keyRotationDays": 30
    },
    "pciCompliance": true
  },
  "hardware": {
    "cardReader": {
      "port": "/dev/ttyUSB0",
      "baudRate": 9600
    },
    "printer": {
      "port": "/dev/ttyUSB1",
      "baudRate": 9600
    }
  },
  "network": {
    "wifi": {
      "ssid": "YourWiFiSSID",
      "password": "YourWiFiPassword"
    },
    "server": {
      "host": "api.pos7220.com",
      "port": 443,
      "secure": true
    }
  }
}
```

---

## 🔌 API Reference

### Core SDK
```javascript
const { POSSDK } = require('pos-sdk-7220');

// Initialize the SDK
const posSDK = new POSSDK({
  deviceId: 'POS_7220_001',
  security: { enabled: true },
  logging: { level: 'info' }
});

// Start the SDK
await posSDK.initialize();

// Get SDK components
const device = posSDK.getDevice();
const cardReader = posSDK.getCardReader();
const printer = posSDK.getPrinter();
const network = posSDK.getNetwork();
const transactions = posSDK.getTransactions();
const security = posSDK.getSecurity();
```

### Card Reader API
```javascript
// Read magnetic card
const magneticCard = await cardReader.readMagneticCard();
console.log('Card Number:', magneticCard.cardNumber);
console.log('Expiry Date:', magneticCard.expiryDate);

// Read IC card
const icCard = await cardReader.readICCard();
console.log('EMV Data:', icCard.emvData);

// Read NFC card
const nfcCard = await cardReader.readNFCCard();
console.log('NDEF Data:', nfcCard.ndefData);

// Auto-detect card type
const card = await cardReader.autoReadCard();
console.log('Card Type:', card.type);
```

### Printer API
```javascript
// Print receipt
await printer.printReceipt({
  merchantName: 'My Store',
  transactionId: 'TXN123456',
  amount: 150000,
  items: [
    { name: 'Product 1', price: 75000, quantity: 2 }
  ]
});

// Print barcode
await printer.printBarcode('1234567890123', {
  type: 'CODE128',
  height: 100
});

// Print QR code
await printer.printQRCode('https://example.com/pay', {
  size: 200,
  errorCorrection: 'M'
});
```

### Transaction API
```javascript
// Create transaction
const transaction = await transactions.createTransaction({
  type: 'sale',
  amount: 150000,
  currency: 'IRR',
  cardData: encryptedCardData,
  merchantId: 'MERCH001'
});

// Process transaction
const result = await transactions.processTransaction(transaction.id);

// Get transaction status
const status = await transactions.getTransactionStatus(transaction.id);
```

### Security API
```javascript
// Encrypt card data
const encryptedData = security.encryptCardData({
  cardNumber: '1234567890123456',
  expiryDate: '12/25',
  cvv: '123'
});

// Decrypt card data
const decryptedData = security.decryptCardData(encryptedData);

// Check user permissions
const hasPermission = security.checkUserPermission(userId, 'TRANSACTION_CREATE');
```

---

## 📚 Examples

### Basic Usage
```javascript
const { POSSDK } = require('pos-sdk-7220');

async function main() {
  try {
    // Initialize SDK
    const posSDK = new POSSDK();
    await posSDK.initialize();
    
    // Set up event listeners
    posSDK.on('cardRead', (cardData) => {
      console.log('Card read:', cardData);
    });
    
    posSDK.on('transactionComplete', (transaction) => {
      console.log('Transaction completed:', transaction.id);
    });
    
    // Get SDK status
    const status = posSDK.getStatus();
    console.log('SDK Status:', status);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

### Card Reading and Printing
```javascript
const { POSSDK } = require('pos-sdk-7220');

async function cardReadingExample() {
  const posSDK = new POSSDK();
  await posSDK.initialize();
  
  const cardReader = posSDK.getCardReader();
  const printer = posSDK.getPrinter();
  
  // Wait for hardware to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('Ready for card reading and printing!');
  console.log('Commands: read, print, quit');
  
  // Simple command interface
  process.stdin.on('data', async (data) => {
    const command = data.toString().trim();
    
    switch (command) {
      case 'read':
        try {
          const card = await cardReader.autoReadCard();
          console.log('Card read successfully:', card);
        } catch (error) {
          console.error('Error reading card:', error.message);
        }
        break;
        
      case 'print':
        try {
          await printer.printReceipt({
            merchantName: 'Test Store',
            transactionId: 'TEST123',
            amount: 50000,
            items: [{ name: 'Test Item', price: 50000, quantity: 1 }]
          });
          console.log('Receipt printed successfully');
        } catch (error) {
          console.error('Error printing receipt:', error.message);
        }
        break;
        
      case 'quit':
        await posSDK.shutdown();
        process.exit(0);
        break;
        
      default:
        console.log('Unknown command. Use: read, print, quit');
    }
  });
}

cardReadingExample();
```

---

## 🛠️ Development

### Project Structure
```
pos-sdk-7220/
├── src/                    # Source code
│   ├── core/              # Core SDK functionality
│   ├── hardware/          # Hardware integration
│   ├── security/          # Security features
│   ├── network/           # Network management
│   ├── transactions/      # Transaction handling
│   ├── config/            # Configuration management
│   └── utils/             # Utility functions
├── examples/              # Example applications
├── scripts/               # Installation and utility scripts
├── config/                # Configuration files
├── test/                  # Test files
├── docs/                  # Documentation
└── docker/                # Docker configuration
```

### Development Commands
```bash
# Install dependencies
make install

# Run in development mode
make dev

# Run tests
make test

# Check code quality
make lint

# Build for production
make build

# Security audit
make security-audit

# Generate documentation
make docs

# Clean build artifacts
make clean
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testNamePattern="Card Reader"

# Generate coverage report
npm run test:coverage
```

---

## 🚀 Deployment

### Local Deployment
```bash
# Build the application
make build

# Install as system service
make install-pos

# Start the service
sudo systemctl start pos-app

# Check status
sudo systemctl status pos-app
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build specific stages
docker build --target production -t pos-sdk-7220:latest .
docker run -d -p 3000:3000 --name pos-app pos-sdk-7220:latest
```

### OTA Deployment
```bash
# Deploy over-the-air
make deploy-ota

# Or manually transfer files
scp -r dist/* user@pos-device:/home/posuser/pos-app/
ssh user@pos-device "sudo systemctl restart pos-app"
```

---

## 🔒 Security

### Security Features
- **End-to-End Encryption**: All sensitive data is encrypted using AES-256-GCM
- **PCI-DSS Compliance**: Adheres to payment card industry security standards
- **Key Management**: Automated key generation, rotation, and secure storage
- **Access Control**: Role-based user authorization and permission management
- **Audit Logging**: Comprehensive logging of all security events

### Security Best Practices
1. **Never store sensitive data in plain text**
2. **Use HTTPS for all network communications**
3. **Implement proper user authentication and authorization**
4. **Regular security audits and updates**
5. **Monitor and log all security events**

### Compliance
- **PCI-DSS**: Payment Card Industry Data Security Standard
- **GDPR**: General Data Protection Regulation compliance
- **Local Regulations**: Compliance with Iranian banking regulations

---

## 🤝 Contributing

We welcome contributions from the community! Please read our contributing guidelines before submitting pull requests.

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup
```bash
# Clone your fork
git clone https://github.com/your-username/pos-sdk-7220.git

# Add upstream remote
git remote add upstream https://github.com/original-org/pos-sdk-7220.git

# Create development branch
git checkout -b development

# Install dependencies
make setup-dev

# Run tests
make test
```

---

## 📞 Support

### Getting Help
- **Documentation**: [Full API Documentation](docs/)
- **Examples**: [Code Examples](examples/)
- **Issues**: [GitHub Issues](https://github.com/your-org/pos-sdk-7220/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/pos-sdk-7220/discussions)

### Contact Information
- **Email**: support@pos-sdk-7220.com
- **Phone**: +98-21-1234-5678
- **Website**: https://pos-sdk-7220.com
- **Support Hours**: Sunday-Thursday, 9:00 AM - 6:00 PM (IRST)

### Commercial Support
For enterprise customers, we offer:
- **Priority Support**: 24/7 technical support
- **Custom Development**: Tailored solutions for your business
- **Training**: Comprehensive training programs
- **Consulting**: Expert consultation services

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **New 7220 Team**: For hardware specifications and testing
- **Open Source Community**: For the amazing tools and libraries
- **Contributors**: All the developers who contributed to this project

---

## 📊 Project Status

- **Version**: 1.0.0
- **Status**: Production Ready
- **Last Updated**: December 2024
- **Next Release**: Q1 2025

---

<div align="center">

**Made with ❤️ for the Iranian POS Community**

[![GitHub stars](https://img.shields.io/github/stars/your-org/pos-sdk-7220.svg?style=social&label=Star)](https://github.com/your-org/pos-sdk-7220)
[![GitHub forks](https://img.shields.io/github/forks/your-org/pos-sdk-7220.svg?style=social&label=Fork)](https://github.com/your-org/pos-sdk-7220)
[![GitHub issues](https://img.shields.io/github/issues/your-org/pos-sdk-7220.svg)](https://github.com/your-org/pos-sdk-7220/issues)

</div>

---

## 🇮🇷 راهنمای فارسی

### خلاصه
**POS SDK 7220** یک کیت توسعه نرم‌افزار جامع و حرفه‌ای است که مخصوص دستگاه نقطه فروش New 7220 طراحی شده است. این SDK به توسعه‌دهندگان امکان ساخت برنامه‌های POS امن، قابل اعتماد و غنی از ویژگی‌ها را می‌دهد که با سیستم‌های پرداخت، بانک‌ها و PSP های ایران یکپارچه می‌شوند.

### ویژگی‌های کلیدی
- **امنیت حرفه‌ای**: مطابق با استاندارد PCI-DSS و رمزگذاری انتها به انتها
- **یکپارچه‌سازی سخت‌افزار**: پشتیبانی کامل از کارت‌خوان‌های مغناطیسی، کارت‌های هوشمند، NFC و چاپگرهای حرارتی
- **انعطاف‌پذیری شبکه**: پشتیبانی از اتصالات چندگانه (Wi-Fi، GSM/3G/4G، USB)
- **به‌روزرسانی OTA**: به‌روزرسانی‌های سیستم از راه دور و مدیریت برنامه‌ها
- **ثبت جامع**: قابلیت‌های پیشرفته ثبت و نظارت
- **عملکرد بالا**: بهینه‌سازی شده برای پردازش تراکنش‌های زمان واقعی

### شروع سریع
```bash
# کلون کردن مخزن
git clone https://github.com/your-org/pos-sdk-7220.git
cd pos-sdk-7220

# نصب وابستگی‌ها
npm install

# پیکربندی برنامه
cp config/pos-sdk.example.json config/pos-sdk.json

# اجرای برنامه
npm run dev
```

### پشتیبانی
- **ایمیل**: support@pos-sdk-7220.com
- **تلفن**: +98-21-1234-5678
- **ساعات کاری**: یکشنبه تا پنجشنبه، 9 صبح تا 6 عصر (به وقت ایران)

برای اطلاعات بیشتر و راهنمای کامل، لطفاً مستندات انگلیسی را مطالعه کنید.
