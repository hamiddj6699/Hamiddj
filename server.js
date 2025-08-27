/**
 * سرور اصلی سیستم صدور کارت بانکی
 * Main Banking Card Issuance System Server
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// سرویس‌های سیستم
const CompleteCardIssuance = require('./services/completeCardIssuance');

// تنظیمات
const config = require('./config/system-config');

// ایجاد اپلیکیشن Express
const app = express();

// تنظیمات امنیتی
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

// تنظیمات CORS
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
    credentials: true
}));

// تنظیمات Rate Limiting
const limiter = rateLimit({
    windowMs: config.security.rateLimit.windowMs,
    max: config.security.rateLimit.maxRequests,
    message: {
        error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.',
        retryAfter: Math.ceil(config.security.rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// فشرده‌سازی
app.use(compression());

// پارسر JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// سرو فایل‌های استاتیک
app.use(express.static(path.join(__dirname, 'public')));

// میدلور لاگ
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// راه‌اندازی سرویس صدور کارت
let cardIssuanceService = null;

async function initializeServices() {
    try {
        console.log('🚀 راه‌اندازی سرویس‌های سیستم...');
        
        cardIssuanceService = new CompleteCardIssuance(config);
        await cardIssuanceService.initialize();
        
        console.log('✅ سرویس‌های سیستم راه‌اندازی شدند');
    } catch (error) {
        console.error('❌ خطا در راه‌اندازی سرویس‌ها:', error);
        process.exit(1);
    }
}

// API Routes

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// صدور کارت
app.post('/api/cards/issue', async (req, res) => {
    try {
        if (!cardIssuanceService) {
            return res.status(503).json({
                success: false,
                error: 'سرویس صدور کارت در دسترس نیست'
            });
        }

        const { customerData, accountData, cardType, options } = req.body;

        // اعتبارسنجی ورودی
        if (!customerData || !accountData || !cardType) {
            return res.status(400).json({
                success: false,
                error: 'اطلاعات مشتری، حساب و نوع کارت الزامی است'
            });
        }

        // صدور کارت
        const card = await cardIssuanceService.issueCompleteCard(
            customerData,
            accountData,
            cardType,
            options
        );

        res.json({
            success: true,
            message: 'کارت با موفقیت صادر شد',
            card: {
                cardNumber: card.formattedCardNumber,
                pin: card.pin,
                cvv2: card.cvv2,
                expiryDate: card.expiryDate,
                track1: card.track1,
                track2: card.track2,
                status: card.status,
                issuedAt: card.issuedAt
            }
        });

    } catch (error) {
        console.error('خطا در صدور کارت:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'خطا در صدور کارت'
        });
    }
});

// دریافت لیست کارت‌ها
app.get('/api/cards', async (req, res) => {
    try {
        if (!cardIssuanceService) {
            return res.status(503).json({
                success: false,
                error: 'سرویس صدور کارت در دسترس نیست'
            });
        }

        const cards = await cardIssuanceService.getAllCards();
        
        // حذف اطلاعات حساس
        const safeCards = cards.map(card => ({
            cardNumber: card.formattedCardNumber,
            customerName: card.customerData.fullName,
            cardType: card.cardType,
            bankCode: card.accountData.bankCode,
            status: card.status,
            issuedAt: card.issuedAt,
            expiryDate: card.expiryDate
        }));

        res.json({
            success: true,
            cards: safeCards,
            total: safeCards.length
        });

    } catch (error) {
        console.error('خطا در دریافت کارت‌ها:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'خطا در دریافت کارت‌ها'
        });
    }
});

// دریافت کارت خاص
app.get('/api/cards/:cardNumber', async (req, res) => {
    try {
        if (!cardIssuanceService) {
            return res.status(503).json({
                success: false,
                error: 'سرویس صدور کارت در دسترس نیست'
            });
        }

        const { cardNumber } = req.params;
        const card = await cardIssuanceService.getCard(cardNumber);

        if (!card) {
            return res.status(404).json({
                success: false,
                error: 'کارت یافت نشد'
            });
        }

        // حذف اطلاعات حساس
        const safeCard = {
            cardNumber: card.formattedCardNumber,
            customerData: {
                fullName: card.customerData.fullName,
                nationalId: card.customerData.nationalId,
                phone: card.customerData.phone,
                email: card.customerData.email
            },
            accountData: {
                accountNumber: card.accountData.accountNumber,
                bankCode: card.accountData.bankCode,
                accountType: card.accountData.accountType
            },
            cardType: card.cardType,
            status: card.status,
            issuedAt: card.issuedAt,
            expiryDate: card.expiryDate
        };

        res.json({
            success: true,
            card: safeCard
        });

    } catch (error) {
        console.error('خطا در دریافت کارت:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'خطا در دریافت کارت'
        });
    }
});

// دریافت لاگ عملیات
app.get('/api/operations/log', async (req, res) => {
    try {
        if (!cardIssuanceService) {
            return res.status(503).json({
                success: false,
                error: 'سرویس صدور کارت در دسترس نیست'
            });
        }

        const log = await cardIssuanceService.getOperationLog();
        
        res.json({
            success: true,
            log: log,
            total: log.length
        });

    } catch (error) {
        console.error('خطا در دریافت لاگ عملیات:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'خطا در دریافت لاگ عملیات'
        });
    }
});

// آمار سیستم
app.get('/api/stats', async (req, res) => {
    try {
        if (!cardIssuanceService) {
            return res.status(503).json({
                success: false,
                error: 'سرویس صدور کارت در دسترس نیست'
            });
        }

        const cards = await cardIssuanceService.getAllCards();
        const log = await cardIssuanceService.getOperationLog();

        const stats = {
            totalCards: cards.length,
            activeCards: cards.filter(card => card.status === 'ACTIVE').length,
            todayIssued: cards.filter(card => {
                const today = new Date().toDateString();
                return card.issuedAt.toDateString() === today;
            }).length,
            totalOperations: log.length,
            cardTypes: {
                DEBIT: cards.filter(card => card.cardType === 'DEBIT').length,
                CREDIT: cards.filter(card => card.cardType === 'CREDIT').length,
                BUSINESS: cards.filter(card => card.cardType === 'BUSINESS').length
            },
            banks: {
                '010': cards.filter(card => card.accountData.bankCode === '010').length,
                '020': cards.filter(card => card.accountData.bankCode === '020').length,
                '054': cards.filter(card => card.accountData.bankCode === '054').length
            }
        };

        res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        console.error('خطا در دریافت آمار:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'خطا در دریافت آمار'
        });
    }
});

// Route برای SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error Handler
app.use((error, req, res, next) => {
    console.error('خطای سرور:', error);
    res.status(500).json({
        success: false,
        error: 'خطای داخلی سرور'
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'مسیر یافت نشد'
    });
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
    console.log('📋 دریافت سیگنال SIGTERM، در حال بستن سرور...');
    
    if (cardIssuanceService) {
        await cardIssuanceService.closeService();
    }
    
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('📋 دریافت سیگنال SIGINT، در حال بستن سرور...');
    
    if (cardIssuanceService) {
        await cardIssuanceService.closeService();
    }
    
    process.exit(0);
});

// راه‌اندازی سرور
async function startServer() {
    try {
        // راه‌اندازی سرویس‌ها
        await initializeServices();
        
        // شروع سرور
        const port = config.server.port;
        const host = config.server.host;
        
        app.listen(port, host, () => {
            console.log('🚀 سرور سیستم صدور کارت بانکی راه‌اندازی شد');
            console.log(`📍 آدرس: http://${host}:${port}`);
            console.log(`🌍 محیط: ${config.server.environment}`);
            console.log(`⏰ زمان راه‌اندازی: ${new Date().toLocaleString('fa-IR')}`);
        });
        
    } catch (error) {
        console.error('❌ خطا در راه‌اندازی سرور:', error);
        process.exit(1);
    }
}

// شروع سرور
startServer();