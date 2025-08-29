# راهنمای توسعه برنامه روی دستگاه POS 7220
# Development Guide for POS 7220 Device Programming

[English](#english) | [فارسی](#persian)

---

## فارسی

### 🎯 مقدمه

برای برنامه‌نویسی روی دستگاه POS 7220، شما نیاز به SDK و ابزارهای توسعه دارید. این راهنما مراحل کامل توسعه، کامپایل و نصب برنامه روی دستگاه را توضیح می‌دهد.

### 🛠️ پیش‌نیازها

#### **1. ابزارهای توسعه:**
- **Node.js**: نسخه 16.0 یا بالاتر
- **npm** یا **yarn**: برای مدیریت وابستگی‌ها
- **Git**: برای کنترل نسخه
- **VS Code** یا **WebStorm**: برای توسعه
- **Terminal**: برای اجرای دستورات

#### **2. سخت‌افزار:**
- **دستگاه POS 7220**: برای تست و نصب
- **کابل USB**: برای اتصال به کامپیوتر
- **کارت‌های تست**: برای تست کارت‌خوان
- **کاغذ حرارتی**: برای تست چاپگر

#### **3. نرم‌افزار:**
- **SDK POS 7220**: که قبلاً ایجاد کردیم
- **درایورهای دستگاه**: برای اتصال USB/Serial
- **ابزارهای مانیتورینگ**: برای نظارت بر عملکرد

### 🚀 مراحل توسعه

#### **مرحله 1: راه‌اندازی محیط توسعه**

```bash
# 1. کلون کردن پروژه
git clone https://github.com/your-org/pos-sdk-7220.git
cd pos-sdk-7220

# 2. نصب وابستگی‌ها
npm install

# 3. ساخت پروژه
npm run build

# 4. اجرای تست‌ها
npm test
```

#### **مرحله 2: ایجاد برنامه جدید**

```bash
# ایجاد دایرکتوری برنامه
mkdir my-pos-app
cd my-pos-app

# راه‌اندازی پروژه
npm init -y

# نصب SDK
npm install ../pos-sdk-7220
```

#### **مرحله 3: نوشتن کد برنامه**

```javascript
// app.js - برنامه اصلی POS
const { POSSDK } = require('pos-sdk-7220');

class POSApplication {
    constructor() {
        this.sdk = new POSSDK({
            device: {
                deviceId: 'POS_7220_001',
                model: '7220'
            },
            network: {
                primaryConnection: 'wifi',
                wifi: {
                    ssid: 'YourWiFi',
                    password: 'YourPassword'
                }
            }
        });
        
        this.setupEventListeners();
    }
    
    async start() {
        try {
            console.log('🚀 راه‌اندازی برنامه POS...');
            await this.sdk.initialize();
            console.log('✅ برنامه با موفقیت راه‌اندازی شد');
            
            // شروع حلقه اصلی برنامه
            this.mainLoop();
            
        } catch (error) {
            console.error('❌ خطا در راه‌اندازی:', error);
        }
    }
    
    setupEventListeners() {
        // رویدادهای کارت‌خوان
        this.sdk.getCardReader().on('card:inserted', () => {
            this.handleCardInserted();
        });
        
        // رویدادهای چاپگر
        this.sdk.getPrinter().on('print:completed', (job) => {
            this.handlePrintCompleted(job);
        });
        
        // رویدادهای شبکه
        this.sdk.getNetwork().on('network:connected', () => {
            this.handleNetworkConnected();
        });
    }
    
    async handleCardInserted() {
        try {
            console.log('💳 کارت وارد شد، در حال خواندن...');
            
            // خواندن کارت
            const cardData = await this.sdk.getCardReader().autoReadCard();
            
            // پردازش کارت
            await this.processCard(cardData);
            
        } catch (error) {
            console.error('خطا در خواندن کارت:', error);
        }
    }
    
    async processCard(cardData) {
        try {
            console.log('🔄 پردازش کارت...');
            
            // ایجاد تراکنش
            const transaction = await this.sdk.getTransactions().createTransaction({
                type: 'sale',
                amount: 1000,
                currency: 'IRR',
                paymentMethod: 'card',
                description: 'پرداخت با کارت'
            });
            
            console.log('✅ تراکنش ایجاد شد:', transaction.id);
            
            // چاپ رسید
            await this.printReceipt(transaction, cardData);
            
        } catch (error) {
            console.error('خطا در پردازش کارت:', error);
        }
    }
    
    async printReceipt(transaction, cardData) {
        try {
            const receiptData = {
                header: 'رسید پرداخت',
                store: {
                    name: 'فروشگاه من',
                    address: 'تهران'
                },
                date: new Date().toLocaleString('fa-IR'),
                receiptNumber: transaction.id,
                items: [
                    { name: 'خدمات', quantity: 1, price: 1000 }
                ],
                total: 1000,
                paymentMethod: 'کارت اعتباری',
                footer: 'متشکریم'
            };
            
            const printJob = await this.sdk.getPrinter().printReceipt(receiptData);
            console.log('🖨️ رسید در صف چاپ قرار گرفت:', printJob);
            
        } catch (error) {
            console.error('خطا در چاپ رسید:', error);
        }
    }
    
    handlePrintCompleted(job) {
        console.log(`✅ چاپ رسید تکمیل شد: ${job.id}`);
    }
    
    handleNetworkConnected() {
        console.log('🌐 اتصال شبکه برقرار شد');
    }
    
    mainLoop() {
        // حلقه اصلی برنامه
        setInterval(() => {
            this.checkDeviceHealth();
        }, 30000); // هر 30 ثانیه
        
        console.log('🔄 حلقه اصلی برنامه شروع شد');
    }
    
    async checkDeviceHealth() {
        try {
            const status = this.sdk.getStatus();
            console.log('📊 وضعیت دستگاه:', status);
            
            // بررسی سلامت دستگاه
            if (!status.device.healthy) {
                console.warn('⚠️ دستگاه سالم نیست');
            }
            
        } catch (error) {
            console.error('خطا در بررسی سلامت:', error);
        }
    }
    
    async shutdown() {
        try {
            console.log('🛑 خاموش کردن برنامه...');
            await this.sdk.shutdown();
            console.log('✅ برنامه با موفقیت خاموش شد');
        } catch (error) {
            console.error('خطا در خاموش کردن:', error);
        }
    }
}

// راه‌اندازی برنامه
const app = new POSApplication();

// مدیریت خاموش کردن آرام
process.on('SIGINT', async () => {
    await app.shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await app.shutdown();
    process.exit(0);
});

// شروع برنامه
app.start().catch(error => {
    console.error('❌ برنامه با خطا مواجه شد:', error);
    process.exit(1);
});
```

#### **مرحله 4: پیکربندی برنامه**

```json
// config/app-config.json
{
  "app": {
    "name": "My POS App",
    "version": "1.0.0",
    "description": "برنامه POS سفارشی"
  },
  "device": {
    "deviceId": "POS_7220_001",
    "model": "7220",
    "firmware": "1.0.0"
  },
  "business": {
    "storeName": "فروشگاه من",
    "storeAddress": "تهران، خیابان ولیعصر",
    "phone": "021-12345678",
    "taxId": "1234567890"
  },
  "payment": {
    "defaultCurrency": "IRR",
    "supportedMethods": ["card", "cash", "transfer"],
    "taxRate": 0.09
  },
  "printing": {
    "autoPrint": true,
    "printLogo": true,
    "paperWidth": 80
  }
}
```

#### **مرحله 5: تست برنامه**

```bash
# اجرای برنامه در حالت توسعه
npm run dev

# اجرای برنامه در حالت تولید
npm start

# اجرای تست‌ها
npm test
```

### 📱 نصب روی دستگاه POS

#### **مرحله 1: آماده‌سازی دستگاه**

```bash
# 1. اتصال دستگاه به کامپیوتر
# 2. فعال‌سازی حالت توسعه
# 3. نصب درایورها
# 4. بررسی اتصال
```

#### **مرحله 2: انتقال برنامه**

```bash
# روش 1: انتقال از طریق USB
cp -r my-pos-app /media/usb/

# روش 2: انتقال از طریق شبکه
scp -r my-pos-app user@pos-device:/home/user/

# روش 3: انتقال از طریق OTA
# (اگر دستگاه از OTA پشتیبانی می‌کند)
```

#### **مرحله 3: نصب روی دستگاه**

```bash
# 1. ورود به دستگاه
ssh user@pos-device

# 2. نصب Node.js (اگر نصب نیست)
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. نصب وابستگی‌ها
cd my-pos-app
npm install --production

# 4. ساخت برنامه
npm run build

# 5. تنظیم مجوزها
chmod +x start.sh
```

#### **مرحله 4: راه‌اندازی خودکار**

```bash
# ایجاد سرویس systemd
sudo nano /etc/systemd/system/pos-app.service
```

```ini
[Unit]
Description=POS Application
After=network.target

[Service]
Type=simple
User=pos-user
WorkingDirectory=/home/pos-user/my-pos-app
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# فعال‌سازی سرویس
sudo systemctl enable pos-app
sudo systemctl start pos-app

# بررسی وضعیت
sudo systemctl status pos-app
```

### 🔧 ابزارهای توسعه

#### **1. VS Code Extensions:**
- **Node.js Extension Pack**
- **ESLint**
- **Prettier**
- **GitLens**
- **Remote Development**

#### **2. ابزارهای تست:**
```bash
# نصب ابزارهای تست
npm install --save-dev jest supertest

# اجرای تست‌ها
npm test

# تست با coverage
npm run test:coverage
```

#### **3. ابزارهای مانیتورینگ:**
```bash
# نصب PM2 برای مدیریت فرآیند
npm install -g pm2

# راه‌اندازی برنامه با PM2
pm2 start app.js --name "pos-app"

# نظارت بر برنامه
pm2 monit

# مشاهده لاگ‌ها
pm2 logs pos-app
```

### 📊 مدیریت خطا و لاگ

#### **1. سیستم لاگ:**
```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// استفاده در برنامه
logger.info('برنامه شروع شد');
logger.error('خطا در پردازش کارت', error);
```

#### **2. مدیریت خطا:**
```javascript
process.on('uncaughtException', (error) => {
    logger.error('خطای گرفته نشده:', error);
    // ارسال به سرور مانیتورینگ
    sendErrorReport(error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Promise رد شده:', reason);
});
```

### 🌐 اتصال به سرور

#### **1. API Client:**
```javascript
class APIClient {
    constructor(baseURL, apiKey) {
        this.baseURL = baseURL;
        this.apiKey = apiKey;
    }
    
    async sendTransaction(transaction) {
        try {
            const response = await fetch(`${this.baseURL}/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(transaction)
            });
            
            return await response.json();
        } catch (error) {
            logger.error('خطا در ارسال تراکنش:', error);
            throw error;
        }
    }
}
```

#### **2. همگام‌سازی داده:**
```javascript
class DataSync {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.syncInterval = 5 * 60 * 1000; // 5 دقیقه
    }
    
    startSync() {
        setInterval(async () => {
            try {
                await this.syncTransactions();
                await this.syncInventory();
            } catch (error) {
                logger.error('خطا در همگام‌سازی:', error);
            }
        }, this.syncInterval);
    }
    
    async syncTransactions() {
        const pendingTransactions = this.sdk.getTransactions().getPendingTransactions();
        
        for (const transaction of pendingTransactions) {
            try {
                await this.apiClient.sendTransaction(transaction);
                transaction.synced = true;
            } catch (error) {
                logger.error(`خطا در همگام‌سازی تراکنش ${transaction.id}:`, error);
            }
        }
    }
}
```

### 📱 رابط کاربری

#### **1. رابط کنسولی:**
```javascript
const readline = require('readline');

class ConsoleUI {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    
    showMenu() {
        console.log('\n=== منوی اصلی ===');
        console.log('1. خواندن کارت');
        console.log('2. چاپ رسید');
        console.log('3. گزارش‌گیری');
        console.log('4. تنظیمات');
        console.log('5. خروج');
        
        this.rl.question('انتخاب کنید: ', (answer) => {
            this.handleMenuChoice(answer);
        });
    }
    
    handleMenuChoice(choice) {
        switch (choice) {
            case '1':
                this.readCard();
                break;
            case '2':
                this.printReceipt();
                break;
            case '3':
                this.showReports();
                break;
            case '4':
                this.showSettings();
                break;
            case '5':
                this.exit();
                break;
            default:
                console.log('انتخاب نامعتبر');
                this.showMenu();
        }
    }
}
```

#### **2. رابط وب (اختیاری):**
```javascript
const express = require('express');
const app = express();

app.get('/status', (req, res) => {
    const status = sdk.getStatus();
    res.json(status);
});

app.post('/card/read', async (req, res) => {
    try {
        const cardData = await sdk.getCardReader().autoReadCard();
        res.json(cardData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('رابط وب روی پورت 3000 فعال شد');
});
```

### 🚀 بهینه‌سازی عملکرد

#### **1. مدیریت حافظه:**
```javascript
// پاک کردن حافظه به صورت دوره‌ای
setInterval(() => {
    if (global.gc) {
        global.gc();
    }
}, 30000);

// اجرا با --expose-gc
// node --expose-gc app.js
```

#### **2. کش کردن:**
```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 دقیقه

// کش کردن داده‌های پرتکرار
function getCachedData(key) {
    let data = cache.get(key);
    if (!data) {
        data = fetchDataFromDatabase(key);
        cache.set(key, data);
    }
    return data;
}
```

### 📋 چک‌لیست نهایی

#### **قبل از نصب:**
- [ ] کد تست شده است
- [ ] تمام وابستگی‌ها نصب شده‌اند
- [ ] پیکربندی صحیح است
- [ ] لاگ‌ها فعال شده‌اند

#### **بعد از نصب:**
- [ ] برنامه راه‌اندازی می‌شود
- [ ] سرویس خودکار فعال است
- [ ] کارت‌خوان کار می‌کند
- [ ] چاپگر کار می‌کند
- [ ] اتصال شبکه برقرار است

#### **تست‌های نهایی:**
- [ ] خواندن کارت مغناطیسی
- [ ] خواندن کارت هوشمند
- [ ] خواندن کارت NFC
- [ ] چاپ رسید
- [ ] ایجاد تراکنش
- [ ] همگام‌سازی با سرور

---

## English

### 🎯 Introduction

For programming on the POS 7220 device, you need the SDK and development tools. This guide explains the complete development, compilation, and installation process on the device.

### 🛠️ Prerequisites

#### **1. Development Tools:**
- **Node.js**: Version 16.0 or higher
- **npm** or **yarn**: For dependency management
- **Git**: For version control
- **VS Code** or **WebStorm**: For development
- **Terminal**: For running commands

#### **2. Hardware:**
- **POS 7220 Device**: For testing and installation
- **USB Cable**: For computer connection
- **Test Cards**: For card reader testing
- **Thermal Paper**: For printer testing

#### **3. Software:**
- **POS SDK 7220**: Previously created
- **Device Drivers**: For USB/Serial connection
- **Monitoring Tools**: For performance monitoring

### 🚀 Development Steps

#### **Step 1: Setup Development Environment**

```bash
# 1. Clone project
git clone https://github.com/your-org/pos-sdk-7220.git
cd pos-sdk-7220

# 2. Install dependencies
npm install

# 3. Build project
npm run build

# 4. Run tests
npm test
```

#### **Step 2: Create New Application**

```bash
# Create application directory
mkdir my-pos-app
cd my-pos-app

# Initialize project
npm init -y

# Install SDK
npm install ../pos-sdk-7220
```

#### **Step 3: Write Application Code**

```javascript
// app.js - Main POS application
const { POSSDK } = require('pos-sdk-7220');

class POSApplication {
    constructor() {
        this.sdk = new POSSDK({
            device: {
                deviceId: 'POS_7220_001',
                model: '7220'
            },
            network: {
                primaryConnection: 'wifi',
                wifi: {
                    ssid: 'YourWiFi',
                    password: 'YourPassword'
                }
            }
        });
        
        this.setupEventListeners();
    }
    
    async start() {
        try {
            console.log('🚀 Starting POS application...');
            await this.sdk.initialize();
            console.log('✅ Application started successfully');
            
            // Start main application loop
            this.mainLoop();
            
        } catch (error) {
            console.error('❌ Startup error:', error);
        }
    }
    
    // ... rest of the implementation
}

// Start application
const app = new POSApplication();
app.start().catch(error => {
    console.error('❌ Application failed:', error);
    process.exit(1);
});
```

#### **Step 4: Application Configuration**

```json
// config/app-config.json
{
  "app": {
    "name": "My POS App",
    "version": "1.0.0",
    "description": "Custom POS Application"
  },
  "device": {
    "deviceId": "POS_7220_001",
    "model": "7220",
    "firmware": "1.0.0"
  },
  "business": {
    "storeName": "My Store",
    "storeAddress": "Tehran, Valiasr Street",
    "phone": "021-12345678",
    "taxId": "1234567890"
  }
}
```

#### **Step 5: Test Application**

```bash
# Run in development mode
npm run dev

# Run in production mode
npm start

# Run tests
npm test
```

### 📱 Installation on POS Device

#### **Step 1: Device Preparation**

```bash
# 1. Connect device to computer
# 2. Enable development mode
# 3. Install drivers
# 4. Check connection
```

#### **Step 2: Transfer Application**

```bash
# Method 1: USB transfer
cp -r my-pos-app /media/usb/

# Method 2: Network transfer
scp -r my-pos-app user@pos-device:/home/user/

# Method 3: OTA transfer
# (if device supports OTA)
```

#### **Step 3: Install on Device**

```bash
# 1. Login to device
ssh user@pos-device

# 2. Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install dependencies
cd my-pos-app
npm install --production

# 4. Build application
npm run build

# 5. Set permissions
chmod +x start.sh
```

#### **Step 4: Auto-startup**

```bash
# Create systemd service
sudo nano /etc/systemd/system/pos-app.service
```

```ini
[Unit]
Description=POS Application
After=network.target

[Service]
Type=simple
User=pos-user
WorkingDirectory=/home/pos-user/my-pos-app
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable service
sudo systemctl enable pos-app
sudo systemctl start pos-app

# Check status
sudo systemctl status pos-app
```

### 🔧 Development Tools

#### **1. VS Code Extensions:**
- **Node.js Extension Pack**
- **ESLint**
- **Prettier**
- **GitLens**
- **Remote Development**

#### **2. Testing Tools:**
```bash
# Install testing tools
npm install --save-dev jest supertest

# Run tests
npm test

# Test with coverage
npm run test:coverage
```

#### **3. Monitoring Tools:**
```bash
# Install PM2 for process management
npm install -g pm2

# Start application with PM2
pm2 start app.js --name "pos-app"

# Monitor application
pm2 monit

# View logs
pm2 logs pos-app
```

### 📊 Error Handling and Logging

#### **1. Logging System:**
```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Use in application
logger.info('Application started');
logger.error('Card processing error', error);
```

#### **2. Error Handling:**
```javascript
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    // Send to monitoring server
    sendErrorReport(error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection:', reason);
});
```

### 🌐 Server Connection

#### **1. API Client:**
```javascript
class APIClient {
    constructor(baseURL, apiKey) {
        this.baseURL = baseURL;
        this.apiKey = apiKey;
    }
    
    async sendTransaction(transaction) {
        try {
            const response = await fetch(`${this.baseURL}/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(transaction)
            });
            
            return await response.json();
        } catch (error) {
            logger.error('Error sending transaction:', error);
            throw error;
        }
    }
}
```

#### **2. Data Synchronization:**
```javascript
class DataSync {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.syncInterval = 5 * 60 * 1000; // 5 minutes
    }
    
    startSync() {
        setInterval(async () => {
            try {
                await this.syncTransactions();
                await this.syncInventory();
            } catch (error) {
                logger.error('Sync error:', error);
            }
        }, this.syncInterval);
    }
    
    async syncTransactions() {
        const pendingTransactions = this.sdk.getTransactions().getPendingTransactions();
        
        for (const transaction of pendingTransactions) {
            try {
                await this.apiClient.sendTransaction(transaction);
                transaction.synced = true;
            } catch (error) {
                logger.error(`Error syncing transaction ${transaction.id}:`, error);
            }
        }
    }
}
```

### 📱 User Interface

#### **1. Console Interface:**
```javascript
const readline = require('readline');

class ConsoleUI {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    
    showMenu() {
        console.log('\n=== Main Menu ===');
        console.log('1. Read Card');
        console.log('2. Print Receipt');
        console.log('3. Reports');
        console.log('4. Settings');
        console.log('5. Exit');
        
        this.rl.question('Select: ', (answer) => {
            this.handleMenuChoice(answer);
        });
    }
    
    handleMenuChoice(choice) {
        switch (choice) {
            case '1':
                this.readCard();
                break;
            case '2':
                this.printReceipt();
                break;
            case '3':
                this.showReports();
                break;
            case '4':
                this.showSettings();
                break;
            case '5':
                this.exit();
                break;
            default:
                console.log('Invalid selection');
                this.showMenu();
        }
    }
}
```

#### **2. Web Interface (Optional):**
```javascript
const express = require('express');
const app = express();

app.get('/status', (req, res) => {
    const status = sdk.getStatus();
    res.json(status);
});

app.post('/card/read', async (req, res) => {
    try {
        const cardData = await sdk.getCardReader().autoReadCard();
        res.json(cardData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('Web interface active on port 3000');
});
```

### 🚀 Performance Optimization

#### **1. Memory Management:**
```javascript
// Periodic memory cleanup
setInterval(() => {
    if (global.gc) {
        global.gc();
    }
}, 30000);

// Run with --expose-gc
// node --expose-gc app.js
```

#### **2. Caching:**
```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

// Cache frequently accessed data
function getCachedData(key) {
    let data = cache.get(key);
    if (!data) {
        data = fetchDataFromDatabase(key);
        cache.set(key, data);
    }
    return data;
}
```

### 📋 Final Checklist

#### **Before Installation:**
- [ ] Code is tested
- [ ] All dependencies are installed
- [ ] Configuration is correct
- [ ] Logging is enabled

#### **After Installation:**
- [ ] Application starts
- [ ] Auto-service is enabled
- [ ] Card reader works
- [ ] Printer works
- [ ] Network connection is established

#### **Final Tests:**
- [ ] Read magnetic card
- [ ] Read smart card
- [ ] Read NFC card
- [ ] Print receipt
- [ ] Create transaction
- [ ] Sync with server

---

## 📞 Support & Contact

- **Email**: support@pos7220.com
- **Documentation**: https://docs.pos7220.com
- **Issues**: https://github.com/your-org/pos-sdk-7220/issues
- **Discussions**: https://github.com/your-org/pos-sdk-7220/discussions

## 🆘 پشتیبانی و تماس

- **ایمیل**: support@pos7220.com
- **مستندات**: https://docs.pos7220.com
- **مشکلات**: https://github.com/your-org/pos-sdk-7220/issues
- **گفتگوها**: https://github.com/your-org/pos-sdk-7220/discussions