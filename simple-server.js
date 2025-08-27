/**
 * سرور ساده با API واقعی کارت
 * Simple Server with Real Card API
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// Import simple real card API
const simpleRealCardAPI = require('./routes/simpleRealCardAPI');

// Create Express app
const app = express();

// Security middleware
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

// CORS
app.use(cors({
    origin: ['http://localhost:3000'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.'
    }
});
app.use('/api/', limiter);

// Compression
app.use(compression());

// JSON parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static('public'));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// API Routes

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        service: 'Simple Real Card Server'
    });
});

// Simple Real Card API
app.use('/api/simple-real-cards', simpleRealCardAPI);

// SPA Route
app.get('*', (req, res) => {
    res.sendFile('public/index.html', { root: __dirname });
});

// Error Handler
app.use((error, req, res, next) => {
    console.error('Server Error:', error);
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

// Start server
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log('🚀 سرور ساده با API واقعی کارت راه‌اندازی شد');
    console.log(`📍 آدرس: http://${HOST}:${PORT}`);
    console.log(`⏰ زمان راه‌اندازی: ${new Date().toLocaleString('fa-IR')}`);
    console.log('✅ مسیرهای API ساده واقعی کارت تعریف شدند');
});