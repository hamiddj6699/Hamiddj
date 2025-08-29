/**
 * Card Reading and Receipt Printing Example
 * مثال خواندن کارت و چاپ رسید
 * 
 * This example demonstrates how to read cards and print receipts
 * این مثال نشان می‌دهد چگونه کارت‌ها را بخوانیم و رسید چاپ کنیم
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
    hardware: {
        cardReader: {
            port: '/dev/ttyUSB0',
            baudRate: 9600,
            timeout: 5000
        },
        printer: {
            port: '/dev/ttyUSB1',
            baudRate: 9600,
            paperWidth: 80,
            timeout: 10000
        }
    },
    network: {
        primaryConnection: 'wifi',
        wifi: {
            ssid: 'YourWiFiSSID',
            password: 'YourWiFiPassword'
        }
    },
    logging: {
        level: 'info',
        enableConsole: true
    }
};

// Create SDK instance
// ایجاد نمونه SDK
const sdk = new POSSDK(config);

// Store information
// اطلاعات فروشگاه
const storeInfo = {
    name: 'فروشگاه نمونه',
    address: 'خیابان ولیعصر، تهران',
    phone: '021-12345678',
    taxId: '1234567890'
};

// Main application function
// تابع اصلی برنامه
async function main() {
    try {
        console.log('🚀 Starting Card Reading and Printing Example...');
        
        // Initialize the SDK
        // راه‌اندازی SDK
        await sdk.initialize();
        console.log('✅ SDK initialized successfully');
        
        // Set up event listeners
        // تنظیم گوش‌دهندگان رویداد
        setupEventListeners();
        
        // Wait for hardware to be ready
        // انتظار برای آماده شدن سخت‌افزار
        await waitForHardware();
        
        // Start the interactive demo
        // شروع نمایش تعاملی
        await startInteractiveDemo();
        
    } catch (error) {
        console.error('❌ Application failed:', error);
        process.exit(1);
    }
}

// Set up event listeners
// تنظیم گوش‌دهندگان رویداد
function setupEventListeners() {
    // Card reader events
    sdk.getCardReader().on('card:inserted', () => {
        console.log('💳 Card inserted - ready to read');
    });
    
    sdk.getCardReader().on('card:removed', () => {
        console.log('💳 Card removed');
    });
    
    sdk.getCardReader().on('card:read', (cardData) => {
        console.log('📖 Card read successfully:', {
            type: cardData.type,
            timestamp: cardData.timestamp
        });
        
        // Process the card data
        processCardData(cardData);
    });
    
    // Printer events
    sdk.getPrinter().on('print:started', (job) => {
        console.log(`🖨️ Print job started: ${job.id}`);
    });
    
    sdk.getPrinter().on('print:completed', (job) => {
        console.log(`✅ Print job completed: ${job.id}`);
    });
    
    sdk.getPrinter().on('print:error', (error) => {
        console.error('❌ Print error:', error);
    });
}

// Wait for hardware to be ready
// انتظار برای آماده شدن سخت‌افزار
async function waitForHardware() {
    console.log('⏳ Waiting for hardware to be ready...');
    
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    while (attempts < maxAttempts) {
        const cardReaderStatus = sdk.getCardReader().getStatus();
        const printerStatus = sdk.getPrinter().getStatus();
        
        if (cardReaderStatus.ready && printerStatus.ready) {
            console.log('✅ Hardware is ready');
            return;
        }
        
        await sleep(1000);
        attempts++;
        
        if (attempts % 5 === 0) {
            console.log(`⏳ Still waiting... (${attempts}/${maxAttempts})`);
        }
    }
    
    throw new Error('Hardware not ready after 30 seconds');
}

// Start interactive demo
// شروع نمایش تعاملی
async function startInteractiveDemo() {
    console.log('\n🎯 Interactive Demo Started');
    console.log('Commands:');
    console.log('  read    - Read a card');
    console.log('  print   - Print a sample receipt');
    console.log('  status  - Show device status');
    console.log('  quit    - Exit the application');
    console.log('');
    
    // Set up command line interface
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const askCommand = () => {
        rl.question('Enter command: ', async (command) => {
            try {
                await processCommand(command.trim().toLowerCase());
                
                if (command.trim().toLowerCase() !== 'quit') {
                    askCommand();
                } else {
                    rl.close();
                    await shutdown();
                }
            } catch (error) {
                console.error('❌ Command error:', error);
                askCommand();
            }
        });
    };
    
    askCommand();
}

// Process user commands
// پردازش دستورات کاربر
async function processCommand(command) {
    switch (command) {
        case 'read':
            await readCard();
            break;
            
        case 'print':
            await printSampleReceipt();
            break;
            
        case 'status':
            showStatus();
            break;
            
        case 'quit':
            console.log('👋 Goodbye!');
            break;
            
        default:
            console.log('❓ Unknown command. Available commands: read, print, status, quit');
    }
}

// Read a card
// خواندن کارت
async function readCard() {
    try {
        console.log('💳 Reading card...');
        
        // Check if card is present
        const status = sdk.getCardReader().getStatus();
        if (!status.cardPresent) {
            console.log('❌ No card present. Please insert a card first.');
            return;
        }
        
        // Auto-detect and read card
        const cardData = await sdk.getCardReader().autoReadCard();
        
        console.log('✅ Card read successfully!');
        console.log('Card Type:', cardData.type);
        console.log('Timestamp:', cardData.timestamp);
        
        // Show card details based on type
        if (cardData.type === 'magnetic') {
            showMagneticCardDetails(cardData);
        } else if (cardData.type === 'ic') {
            showICCardDetails(cardData);
        } else if (cardData.type === 'nfc') {
            showNFCCardDetails(cardData);
        }
        
        // Ask if user wants to print receipt
        await askForReceiptPrint(cardData);
        
    } catch (error) {
        console.error('❌ Failed to read card:', error.message);
    }
}

// Show magnetic card details
// نمایش جزئیات کارت مغناطیسی
function showMagneticCardDetails(cardData) {
    console.log('\n📋 Magnetic Card Details:');
    
    if (cardData.data.tracks.track1) {
        const track1 = cardData.data.tracks.track1;
        console.log('Track 1:');
        console.log('  PAN:', track1.pan);
        console.log('  Cardholder:', track1.cardholder);
        console.log('  Expiry:', track1.expiry);
        console.log('  Service Code:', track1.serviceCode);
    }
    
    if (cardData.data.tracks.track2) {
        const track2 = cardData.data.tracks.track2;
        console.log('Track 2:');
        console.log('  PAN:', track2.pan);
        console.log('  Expiry:', track2.expiry);
        console.log('  Service Code:', track2.serviceCode);
    }
}

// Show IC card details
// نمایش جزئیات کارت هوشمند
function showICCardDetails(cardData) {
    console.log('\n📋 IC Card Details:');
    console.log('Format:', cardData.data.format);
    console.log('Encoding:', cardData.data.encoding);
    
    if (cardData.data.tlv) {
        console.log('TLV Data:');
        for (const [tag, value] of Object.entries(cardData.data.tlv)) {
            console.log(`  ${tag}: ${value.toString('hex')}`);
        }
    }
}

// Show NFC card details
// نمایش جزئیات کارت NFC
function showNFCCardDetails(cardData) {
    console.log('\n📋 NFC Card Details:');
    console.log('Format:', cardData.data.format);
    console.log('Encoding:', cardData.data.encoding);
    
    if (cardData.data.ndef) {
        const ndef = cardData.data.ndef;
        console.log('NDEF Data:');
        console.log('  Version:', ndef.version);
        console.log('  Type:', ndef.type);
        console.log('  Payload Length:', ndef.payloadLength);
    }
}

// Ask user if they want to print receipt
// پرسیدن از کاربر که آیا می‌خواهد رسید چاپ کند
async function askForReceiptPrint(cardData) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question('\n🖨️ Would you like to print a receipt? (y/n): ', async (answer) => {
            rl.close();
            
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                await printReceiptForCard(cardData);
            } else {
                console.log('📄 Receipt printing skipped');
            }
            
            resolve();
        });
    });
}

// Print receipt for card
// چاپ رسید برای کارت
async function printReceiptForCard(cardData) {
    try {
        console.log('🖨️ Printing receipt...');
        
        // Create receipt data
        const receiptData = {
            header: 'CARD READ RECEIPT',
            store: storeInfo,
            date: new Date().toLocaleString('fa-IR'),
            receiptNumber: `R${Date.now()}`,
            cashier: 'System',
            cardType: cardData.type.toUpperCase(),
            cardData: {
                type: cardData.type,
                timestamp: cardData.timestamp
            },
            items: [
                { name: 'Card Reading Service', quantity: 1, price: 0 }
            ],
            subtotal: 0,
            tax: 0,
            total: 0,
            footer: 'Thank you for using our POS system!',
            transactionId: `TXN_${Date.now()}`
        };
        
        // Print the receipt
        const printJob = await sdk.getPrinter().printReceipt(receiptData);
        console.log('✅ Receipt print job created:', printJob);
        
    } catch (error) {
        console.error('❌ Failed to print receipt:', error.message);
    }
}

// Print sample receipt
// چاپ رسید نمونه
async function printSampleReceipt() {
    try {
        console.log('🖨️ Printing sample receipt...');
        
        const receiptData = {
            header: 'SAMPLE RECEIPT',
            store: storeInfo,
            date: new Date().toLocaleString('fa-IR'),
            receiptNumber: `S${Date.now()}`,
            cashier: 'Demo User',
            items: [
                { name: 'محصول نمونه 1', quantity: 2, price: 50000 },
                { name: 'محصول نمونه 2', quantity: 1, price: 75000 },
                { name: 'خدمات اضافی', quantity: 1, price: 25000 }
            ],
            subtotal: 200000,
            tax: 18000,
            total: 218000,
            paymentMethod: 'کارت اعتباری',
            footer: 'از خرید شما متشکریم!',
            transactionId: `DEMO_${Date.now()}`
        };
        
        const printJob = await sdk.getPrinter().printReceipt(receiptData);
        console.log('✅ Sample receipt print job created:', printJob);
        
    } catch (error) {
        console.error('❌ Failed to print sample receipt:', error.message);
    }
}

// Show device status
// نمایش وضعیت دستگاه
function showStatus() {
    console.log('\n📊 Device Status:');
    
    const deviceStatus = sdk.getDevice().getStatus();
    const cardReaderStatus = sdk.getCardReader().getStatus();
    const printerStatus = sdk.getPrinter().getStatus();
    
    console.log('Device:');
    console.log('  Online:', deviceStatus.online);
    console.log('  Healthy:', deviceStatus.healthy);
    console.log('  Battery:', deviceStatus.battery + '%');
    console.log('  Temperature:', deviceStatus.temperature + '°C');
    
    console.log('\nCard Reader:');
    console.log('  Connected:', cardReaderStatus.connected);
    console.log('  Ready:', cardReaderStatus.ready);
    console.log('  Card Present:', cardReaderStatus.cardPresent);
    
    console.log('\nPrinter:');
    console.log('  Connected:', printerStatus.connected);
    console.log('  Ready:', printerStatus.ready);
    console.log('  Paper Status:', printerStatus.paperStatus);
    console.log('  Queue Length:', printerStatus.queueLength);
}

// Process card data (called when card is read)
// پردازش داده‌های کارت (فراخوانی شده وقتی کارت خوانده می‌شود)
function processCardData(cardData) {
    console.log('\n🔄 Processing card data...');
    
    // In a real application, you would:
    // در یک برنامه واقعی، شما:
    // 1. Validate the card data
    // 1. اعتبارسنجی داده‌های کارت
    // 2. Send to payment processor
    // 2. ارسال به پردازشگر پرداخت
    // 3. Create transaction record
    // 3. ایجاد رکورد تراکنش
    // 4. Update inventory
    // 4. به‌روزرسانی موجودی
    
    console.log('✅ Card data processed successfully');
}

// Utility function to sleep
// تابع کمکی برای خواب
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Shutdown function
// تابع خاموش کردن
async function shutdown() {
    console.log('\n🛑 Shutting down...');
    
    try {
        await sdk.shutdown();
        console.log('✅ Shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
// مدیریت خاموش کردن آرام
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down...');
    await shutdown();
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    await shutdown();
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