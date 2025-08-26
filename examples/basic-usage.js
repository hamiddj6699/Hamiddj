/**
 * Basic Usage Example for POS SDK 7220
 * مثال استفاده پایه برای SDK POS 7220
 * 
 * This example demonstrates the basic setup and usage of the POS SDK
 * این مثال راه‌اندازی و استفاده پایه از SDK POS را نشان می‌دهد
 */

const { POSSDK } = require('../src/index');

// Configuration for the POS device
// پیکربندی برای دستگاه POS
const config = {
    device: {
        deviceId: 'POS_7220_001',
        model: '7220',
        firmware: '1.0.0'
    },
    network: {
        primaryConnection: 'wifi',
        wifi: {
            ssid: 'YourWiFiSSID',
            password: 'YourWiFiPassword',
            security: 'WPA2'
        },
        server: {
            host: 'api.pos7220.com',
            port: 443,
            secure: true
        }
    },
    security: {
        enabled: true,
        pciCompliance: {
            enabled: true
        }
    },
    logging: {
        level: 'info',
        enableConsole: true,
        enableFile: true
    }
};

// Create SDK instance
// ایجاد نمونه SDK
const sdk = new POSSDK(config);

// Main application function
// تابع اصلی برنامه
async function main() {
    try {
        console.log('🚀 Starting POS SDK 7220...');
        
        // Initialize the SDK
        // راه‌اندازی SDK
        await sdk.initialize();
        console.log('✅ SDK initialized successfully');
        
        // Get initial status
        // دریافت وضعیت اولیه
        const status = sdk.getStatus();
        console.log('📊 SDK Status:', JSON.stringify(status, null, 2));
        
        // Set up event listeners
        // تنظیم گوش‌دهندگان رویداد
        setupEventListeners();
        
        // Demonstrate basic operations
        // نمایش عملیات پایه
        await demonstrateBasicOperations();
        
        // Keep the application running
        // نگه داشتن برنامه در حال اجرا
        console.log('🔄 SDK is running. Press Ctrl+C to exit.');
        
    } catch (error) {
        console.error('❌ Failed to start SDK:', error);
        process.exit(1);
    }
}

// Set up event listeners for SDK events
// تنظیم گوش‌دهندگان رویداد برای رویدادهای SDK
function setupEventListeners() {
    // Device events
    sdk.getDevice().on('device:ready', () => {
        console.log('🎯 Device is ready');
    });
    
    sdk.getDevice().on('device:health-changed', (healthy) => {
        console.log(`💚 Device health changed: ${healthy ? 'Healthy' : 'Unhealthy'}`);
    });
    
    // Card reader events
    sdk.getCardReader().on('card:inserted', () => {
        console.log('💳 Card inserted');
    });
    
    sdk.getCardReader().on('card:removed', () => {
        console.log('💳 Card removed');
    });
    
    sdk.getCardReader().on('card:read', (cardData) => {
        console.log('📖 Card read successfully:', {
            type: cardData.type,
            timestamp: cardData.timestamp
        });
    });
    
    // Printer events
    sdk.getPrinter().on('print:started', (job) => {
        console.log(`🖨️ Print job started: ${job.id}`);
    });
    
    sdk.getPrinter().on('print:completed', (job) => {
        console.log(`✅ Print job completed: ${job.id}`);
    });
    
    // Network events
    sdk.getNetwork().on('network:connected', (connection) => {
        console.log(`🌐 Network connected: ${connection.type}`);
    });
    
    sdk.getNetwork().on('network:disconnected', () => {
        console.log('❌ Network disconnected');
    });
    
    // Transaction events
    sdk.getTransactions().on('transaction:created', (transaction) => {
        console.log(`💰 Transaction created: ${transaction.id}`);
    });
    
    sdk.getTransactions().on('transaction:completed', (transaction) => {
        console.log(`✅ Transaction completed: ${transaction.id}`);
    });
    
    // OTA update events
    sdk.getNetwork().on('ota:update-available', (update) => {
        console.log(`🔄 OTA update available: ${update.version}`);
    });
}

// Demonstrate basic SDK operations
// نمایش عملیات پایه SDK
async function demonstrateBasicOperations() {
    try {
        console.log('\n🔧 Demonstrating basic operations...');
        
        // Wait a bit for everything to initialize
        await sleep(2000);
        
        // 1. Check device health
        console.log('\n1️⃣ Checking device health...');
        const deviceStatus = sdk.getDevice().getStatus();
        console.log('Device Status:', deviceStatus);
        
        // 2. Check network connectivity
        console.log('\n2️⃣ Checking network connectivity...');
        const networkStatus = sdk.getNetwork().getStatus();
        console.log('Network Status:', networkStatus);
        
        // 3. Check card reader status
        console.log('\n3️⃣ Checking card reader status...');
        const cardReaderStatus = sdk.getCardReader().getStatus();
        console.log('Card Reader Status:', cardReaderStatus);
        
        // 4. Check printer status
        console.log('\n4️⃣ Checking printer status...');
        const printerStatus = sdk.getPrinter().getStatus();
        console.log('Printer Status:', printerStatus);
        
        // 5. Check transaction manager status
        console.log('\n5️⃣ Checking transaction manager status...');
        const transactionStatus = sdk.getTransactions().getStatus();
        console.log('Transaction Manager Status:', transactionStatus);
        
        // 6. Check security status
        console.log('\n6️⃣ Checking security status...');
        const securityStatus = sdk.getSecurity().getStatus();
        console.log('Security Status:', securityStatus);
        
        console.log('\n✅ Basic operations demonstration completed');
        
    } catch (error) {
        console.error('❌ Error during basic operations:', error);
    }
}

// Utility function to sleep
// تابع کمکی برای خواب
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle graceful shutdown
// مدیریت خاموش کردن آرام
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down SDK...');
    
    try {
        await sdk.shutdown();
        console.log('✅ SDK shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down SDK...');
    
    try {
        await sdk.shutdown();
        console.log('✅ SDK shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

// Handle uncaught exceptions
// مدیریت استثناهای گرفته نشده
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the application
// شروع برنامه
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Application failed:', error);
        process.exit(1);
    });
}

module.exports = { main, sdk };