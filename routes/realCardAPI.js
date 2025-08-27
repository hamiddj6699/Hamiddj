/**
 * API های واقعی کارت بانکی
 * Real Banking Card APIs
 */

const express = require('express');
const router = express.Router();
const RealCard = require('../models/RealCard');
const RealCardIssuanceService = require('../services/realCardIssuanceService');
const { body, validationResult } = require('express-validator');

// راه‌اندازی سرویس صدور کارت
let cardIssuanceService = null;

async function initializeService() {
  if (!cardIssuanceService) {
    const config = require('../config/system-config');
    cardIssuanceService = new RealCardIssuanceService(config);
    await cardIssuanceService.initialize();
  }
}

// میدلور اعتبارسنجی
const validateCardIssuance = [
  body('customerData.fullName').notEmpty().withMessage('نام کامل مشتری الزامی است'),
  body('customerData.nationalId').isLength({ min: 10, max: 10 }).withMessage('کد ملی باید 10 رقم باشد'),
  body('customerData.phone').notEmpty().withMessage('شماره تلفن الزامی است'),
  body('customerData.email').optional().isEmail().withMessage('ایمیل نامعتبر است'),
  body('accountData.accountNumber').notEmpty().withMessage('شماره حساب الزامی است'),
  body('accountData.bankCode').notEmpty().withMessage('کد بانک الزامی است'),
  body('accountData.balance').isNumeric().withMessage('موجودی باید عدد باشد'),
  body('cardType').isIn(['DEBIT', 'CREDIT', 'PREPAID', 'BUSINESS']).withMessage('نوع کارت نامعتبر است')
];

// میدلور بررسی خطاهای اعتبارسنجی
const checkValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'خطا در اعتبارسنجی ورودی',
      details: errors.array()
    });
  }
  next();
};

// میدلور لاگ درخواست
const logRequest = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
};

// اعمال میدلورها
router.use(logRequest);

// ==================== API های صدور کارت ====================

/**
 * POST /api/real-cards/issue
 * صدور کارت واقعی جدید
 */
router.post('/issue', validateCardIssuance, checkValidationErrors, async (req, res) => {
  try {
    await initializeService();
    
    const { customerData, accountData, cardType, options } = req.body;
    
    // صدور کارت
    const realCard = await cardIssuanceService.issueRealCard(
      customerData,
      accountData,
      cardType,
      {
        ...options,
        operator: {
          id: req.headers['x-operator-id'] || 'API_USER',
          name: req.headers['x-operator-name'] || 'کاربر API',
          role: req.headers['x-operator-role'] || 'OPERATOR'
        }
      }
    );
    
    res.status(201).json({
      success: true,
      message: 'کارت واقعی با موفقیت صادر شد',
      card: {
        cardNumber: realCard.cardNumber,
        bin: realCard.bin,
        customer: {
          fullName: realCard.customer.fullName,
          nationalId: realCard.customer.nationalId
        },
        account: {
          accountNumber: realCard.account.accountNumber,
          bankCode: realCard.account.bankCode
        },
        cardInfo: realCard.cardInfo,
        status: realCard.status.current,
        issuedAt: realCard.dates.issuedAt,
        validTo: realCard.dates.validTo
      },
      metadata: {
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('خطا در صدور کارت واقعی:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'خطا در صدور کارت',
      metadata: {
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ==================== API های مدیریت کارت ====================

/**
 * GET /api/real-cards
 * دریافت لیست کارت‌های واقعی
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      bankCode, 
      cardType, 
      customerName,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // فیلترها
    const filters = {};
    if (status) filters.status = status;
    if (bankCode) filters.bankCode = bankCode;
    if (cardType) filters.cardType = cardType;
    if (customerName) filters.customerName = customerName;
    
    // دریافت کارت‌ها
    const cards = await cardIssuanceService.getAllCards(filters);
    
    // صفحه‌بندی
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedCards = cards.slice(startIndex, endIndex);
    
    // مرتب‌سازی
    paginatedCards.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'createdAt' || sortBy === 'dates.issuedAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    res.json({
      success: true,
      cards: paginatedCards,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(cards.length / limit),
        totalCards: cards.length,
        hasNextPage: endIndex < cards.length,
        hasPrevPage: page > 1
      },
      metadata: {
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('خطا در دریافت کارت‌ها:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'خطا در دریافت کارت‌ها'
    });
  }
});

/**
 * GET /api/real-cards/:cardNumber
 * دریافت کارت واقعی خاص
 */
router.get('/:cardNumber', async (req, res) => {
  try {
    const { cardNumber } = req.params;
    
    const card = await cardIssuanceService.getCard(cardNumber);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'کارت یافت نشد'
      });
    }
    
    res.json({
      success: true,
      card: card,
      metadata: {
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('خطا در دریافت کارت:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'خطا در دریافت کارت'
    });
  }
});

/**
 * PUT /api/real-cards/:cardNumber/activate
 * فعال‌سازی کارت
 */
router.put('/:cardNumber/activate', async (req, res) => {
  try {
    const { cardNumber } = req.params;
    const { reason } = req.body;
    
    const card = await cardIssuanceService.getCard(cardNumber);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'کارت یافت نشد'
      });
    }
    
    if (card.status.current === 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: 'کارت قبلاً فعال است'
      });
    }
    
    // فعال‌سازی کارت
    card.status.previous.push({
      status: card.status.current,
      changedAt: new Date(),
      reason: 'Status change',
      operator: 'System'
    });
    
    card.status.current = 'ACTIVE';
    card.status.lastStatusChange = new Date();
    card.dates.activatedAt = new Date();
    
    card.operations.push({
      type: 'ACTIVATED',
      operator: {
        id: req.headers['x-operator-id'] || 'API_USER',
        name: req.headers['x-operator-name'] || 'کاربر API',
        role: req.headers['x-operator-role'] || 'OPERATOR'
      },
      details: reason || 'کارت فعال شد',
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    await card.save();
    
    res.json({
      success: true,
      message: 'کارت با موفقیت فعال شد',
      card: {
        cardNumber: card.cardNumber,
        status: card.status.current,
        activatedAt: card.dates.activatedAt
      },
      metadata: {
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('خطا در فعال‌سازی کارت:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'خطا در فعال‌سازی کارت'
    });
  }
});

/**
 * PUT /api/real-cards/:cardNumber/block
 * مسدود کردن کارت
 */
router.put('/:cardNumber/block', async (req, res) => {
  try {
    const { cardNumber } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'دلیل مسدود کردن کارت الزامی است'
      });
    }
    
    const card = await cardIssuanceService.getCard(cardNumber);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'کارت یافت نشد'
      });
    }
    
    if (card.status.current === 'BLOCKED') {
      return res.status(400).json({
        success: false,
        error: 'کارت قبلاً مسدود است'
      });
    }
    
    // مسدود کردن کارت
    await card.blockCard(reason, {
      id: req.headers['x-operator-id'] || 'API_USER',
      name: req.headers['x-operator-name'] || 'کاربر API',
      role: req.headers['x-operator-role'] || 'OPERATOR'
    });
    
    res.json({
      success: true,
      message: 'کارت با موفقیت مسدود شد',
      card: {
        cardNumber: card.cardNumber,
        status: card.status.current,
        blockedAt: card.status.lastStatusChange
      },
      metadata: {
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('خطا در مسدود کردن کارت:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'خطا در مسدود کردن کارت'
    });
  }
});

/**
 * PUT /api/real-cards/:cardNumber/unblock
 * آزاد کردن کارت
 */
router.put('/:cardNumber/unblock', async (req, res) => {
  try {
    const { cardNumber } = req.params;
    
    const card = await cardIssuanceService.getCard(cardNumber);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'کارت یافت نشد'
      });
    }
    
    if (card.status.current !== 'BLOCKED') {
      return res.status(400).json({
        success: false,
        error: 'کارت مسدود نیست'
      });
    }
    
    // آزاد کردن کارت
    await card.unblockCard({
      id: req.headers['x-operator-id'] || 'API_USER',
      name: req.headers['x-operator-name'] || 'کاربر API',
      role: req.headers['x-operator-role'] || 'OPERATOR'
    });
    
    res.json({
      success: true,
      message: 'کارت با موفقیت آزاد شد',
      card: {
        cardNumber: card.cardNumber,
        status: card.status.current,
        unblockedAt: card.status.lastStatusChange
      },
      metadata: {
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('خطا در آزاد کردن کارت:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'خطا در آزاد کردن کارت'
    });
  }
});

/**
 * PUT /api/real-cards/:cardNumber/change-pin
 * تغییر PIN کارت
 */
router.put('/:cardNumber/change-pin', async (req, res) => {
  try {
    const { cardNumber } = req.params;
    const { newPin } = req.body;
    
    if (!newPin || newPin.length < 4 || newPin.length > 6) {
      return res.status(400).json({
        success: false,
        error: 'PIN جدید باید 4 تا 6 رقم باشد'
      });
    }
    
    const card = await cardIssuanceService.getCard(cardNumber);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'کارت یافت نشد'
      });
    }
    
    if (card.status.current !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: 'کارت باید فعال باشد'
      });
    }
    
    // تغییر PIN
    await card.changePin(newPin, {
      id: req.headers['x-operator-id'] || 'API_USER',
      name: req.headers['x-operator-name'] || 'کاربر API',
      role: req.headers['x-operator-role'] || 'OPERATOR'
    });
    
    res.json({
      success: true,
      message: 'PIN کارت با موفقیت تغییر کرد',
      card: {
        cardNumber: card.cardNumber,
        lastPinChange: card.security.lastPinChange
      },
      metadata: {
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('خطا در تغییر PIN:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'خطا در تغییر PIN'
    });
  }
});

// ==================== API های گزارش‌گیری ====================

/**
 * GET /api/real-cards/stats/overview
 * آمار کلی کارت‌ها
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await cardIssuanceService.getCardStats();
    
    res.json({
      success: true,
      stats: stats,
      metadata: {
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('خطا در دریافت آمار:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'خطا در دریافت آمار'
    });
  }
});

/**
 * GET /api/real-cards/stats/by-bank
 * آمار کارت‌ها بر اساس بانک
 */
router.get('/stats/by-bank', async (req, res) => {
  try {
    const stats = await RealCard.aggregate([
      {
        $group: {
          _id: '$bin.bankCode',
          bankName: { $first: '$bin.bankName' },
          totalCards: { $sum: 1 },
          activeCards: {
            $sum: { $cond: [{ $eq: ['$status.current', 'ACTIVE'] }, 1, 0] }
          },
          blockedCards: {
            $sum: { $cond: [{ $eq: ['$status.current', 'BLOCKED'] }, 1, 0] }
          },
          expiredCards: {
            $sum: { $cond: [{ $lt: ['$dates.validTo', new Date()] }, 1, 0] }
          }
        }
      },
      { $sort: { totalCards: -1 } }
    ]);
    
    res.json({
      success: true,
      stats: stats,
      metadata: {
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('خطا در دریافت آمار بانک‌ها:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'خطا در دریافت آمار بانک‌ها'
    });
  }
});

/**
 * GET /api/real-cards/stats/by-type
 * آمار کارت‌ها بر اساس نوع
 */
router.get('/stats/by-type', async (req, res) => {
  try {
    const stats = await RealCard.aggregate([
      {
        $group: {
          _id: '$cardInfo.cardType',
          totalCards: { $sum: 1 },
          activeCards: {
            $sum: { $cond: [{ $eq: ['$status.current', 'ACTIVE'] }, 1, 0] }
          },
          blockedCards: {
            $sum: { $cond: [{ $eq: ['$status.current', 'BLOCKED'] }, 1, 0] }
          },
          expiredCards: {
            $sum: { $cond: [{ $lt: ['$dates.validTo', new Date()] }, 1, 0] }
          }
        }
      },
      { $sort: { totalCards: -1 } }
    ]);
    
    res.json({
      success: true,
      stats: stats,
      metadata: {
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('خطا در دریافت آمار انواع کارت:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'خطا در دریافت آمار انواع کارت'
    });
  }
});

// ==================== API های جستجو ====================

/**
 * GET /api/real-cards/search
 * جستجوی پیشرفته کارت‌ها
 */
router.get('/search', async (req, res) => {
  try {
    const { 
      query, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'عبارت جستجو الزامی است'
      });
    }
    
    // جستجو در فیلدهای مختلف
    const searchQuery = {
      $or: [
        { cardNumber: { $regex: query, $options: 'i' } },
        { 'customer.fullName': { $regex: query, $options: 'i' } },
        { 'customer.nationalId': { $regex: query, $options: 'i' } },
        { 'account.accountNumber': { $regex: query, $options: 'i' } },
        { 'bin.bankName': { $regex: query, $options: 'i' } }
      ]
    };
    
    const cards = await RealCard.find(searchQuery);
    
    // صفحه‌بندی
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedCards = cards.slice(startIndex, endIndex);
    
    // مرتب‌سازی
    paginatedCards.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'createdAt' || sortBy === 'dates.issuedAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    res.json({
      success: true,
      cards: paginatedCards,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(cards.length / limit),
        totalResults: cards.length,
        hasNextPage: endIndex < cards.length,
        hasPrevPage: page > 1
      },
      metadata: {
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('خطا در جستجو:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'خطا در جستجو'
    });
  }
});

// ==================== API های عملیات ====================

/**
 * GET /api/real-cards/:cardNumber/operations
 * دریافت لاگ عملیات کارت
 */
router.get('/:cardNumber/operations', async (req, res) => {
  try {
    const { cardNumber } = req.params;
    const { limit = 50 } = req.query;
    
    const card = await cardIssuanceService.getCard(cardNumber);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'کارت یافت نشد'
      });
    }
    
    const operations = card.operations
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));
    
    res.json({
      success: true,
      cardNumber: cardNumber,
      operations: operations,
      total: card.operations.length,
      metadata: {
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('خطا در دریافت عملیات:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'خطا در دریافت عملیات'
    });
  }
});

// ==================== API های سلامت سیستم ====================

/**
 * GET /api/real-cards/health
 * بررسی سلامت سرویس
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      service: 'RealCardIssuanceService',
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'Connected',
      hsm: 'Connected',
      version: '1.0.0'
    };
    
    // بررسی اتصال به پایگاه داده
    try {
      await RealCard.findOne().limit(1);
      health.database = 'Connected';
    } catch (error) {
      health.database = 'Disconnected';
      health.status = 'WARNING';
    }
    
    // بررسی اتصال به HSM
    try {
      if (cardIssuanceService) {
        const hsmHealth = await cardIssuanceService.hsmClient.healthCheck();
        health.hsm = hsmHealth.status;
      } else {
        health.hsm = 'Not Initialized';
        health.status = 'WARNING';
      }
    } catch (error) {
      health.hsm = 'Error';
      health.status = 'ERROR';
    }
    
    const statusCode = health.status === 'OK' ? 200 : 
                      health.status === 'WARNING' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      health: health,
      metadata: {
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('خطا در بررسی سلامت:', error);
    res.status(503).json({
      success: false,
      error: error.message || 'خطا در بررسی سلامت',
      health: {
        service: 'RealCardIssuanceService',
        status: 'ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;