/**
 * API ساده واقعی کارت بانکی (بدون پایگاه داده)
 * Simple Real Banking Card APIs (No Database)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// ذخیره‌سازی موقت کارت‌ها
let cards = [];
let cardCounter = 1;

// میدلور لاگ درخواست
const logRequest = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
};

// اعمال میدلورها
router.use(logRequest);

// ==================== API های صدور کارت ====================

/**
 * POST /api/simple-real-cards/issue
 * صدور کارت واقعی ساده
 */
router.post('/issue', async (req, res) => {
  try {
    const { customerData, accountData, cardType, options } = req.body;
    
    // اعتبارسنجی ورودی
    if (!customerData?.fullName || !customerData?.nationalId || !customerData?.phone) {
      return res.status(400).json({
        success: false,
        error: 'اطلاعات مشتری ناقص است'
      });
    }
    
    if (!accountData?.accountNumber || !accountData?.bankCode || !accountData?.balance) {
      return res.status(400).json({
        success: false,
        error: 'اطلاعات حساب ناقص است'
      });
    }
    
    if (!['DEBIT', 'CREDIT', 'PREPAID', 'BUSINESS'].includes(cardType)) {
      return res.status(400).json({
        success: false,
        error: 'نوع کارت نامعتبر است'
      });
    }
    
    // تولید شماره کارت
    const bin = getBinForBank(accountData.bankCode);
    const accountNumber = Math.random().toString().slice(2, 11);
    const checkDigit = calculateLuhnCheckDigit(bin + accountNumber);
    const cardNumber = bin + accountNumber + checkDigit;
    
    // تولید PIN
    const pin = generatePIN(options?.pin?.length || 4);
    
    // تولید CVV2
    const cvv2 = generateCVV2();
    
    // تولید تاریخ انقضا
    const expiryDate = options?.expiryDate || generateExpiryDate();
    
    // تولید Track Data
    const trackData = generateTrackData(cardNumber, customerData, expiryDate);
    
    // ایجاد کارت
    const card = {
      id: cardCounter++,
      cardNumber: cardNumber,
      bin: {
        code: bin,
        bankName: getBankName(accountData.bankCode),
        bankCode: accountData.bankCode,
        productType: cardType,
        network: 'SHETAB',
        cardLevel: 'CLASSIC'
      },
      security: {
        pin: pin,
        cvv2: cvv2
      },
      customer: {
        fullName: customerData.fullName,
        nationalId: customerData.nationalId,
        phone: customerData.phone,
        email: customerData.email
      },
      account: {
        accountNumber: accountData.accountNumber,
        accountType: accountData.accountType,
        balance: accountData.balance,
        currency: 'IRR'
      },
      cardInfo: {
        cardType: cardType,
        cardBrand: 'LOCAL',
        contactless: true,
        chipEnabled: true
      },
      dates: {
        issuedAt: new Date(),
        validFrom: new Date(),
        validTo: new Date(expiryDate)
      },
      status: {
        current: 'ISSUED'
      },
      limits: {
        dailyATM: 5000000,
        dailyPOS: 10000000,
        monthlyTotal: 100000000,
        singleMax: 1000000
      },
      operations: [{
        type: 'ISSUED',
        timestamp: new Date(),
        operator: {
          id: req.headers['x-operator-id'] || 'API_USER',
          name: req.headers['x-operator-name'] || 'کاربر API',
          role: req.headers['x-operator-role'] || 'OPERATOR'
        },
        details: 'کارت صادر شد'
      }]
    };
    
    // ذخیره کارت
    cards.push(card);
    
    res.status(201).json({
      success: true,
      message: 'کارت واقعی با موفقیت صادر شد',
      card: {
        cardNumber: card.cardNumber,
        bin: card.bin,
        customer: {
          fullName: card.customer.fullName,
          nationalId: card.customer.nationalId
        },
        account: {
          accountNumber: card.account.accountNumber,
          bankCode: card.account.bankCode
        },
        cardInfo: card.cardInfo,
        status: card.status.current,
        issuedAt: card.dates.issuedAt,
        validTo: card.dates.validTo
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

// ==================== API های مدیریت کارت ====================

/**
 * GET /api/simple-real-cards
 * دریافت لیست کارت‌ها
 */
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 20, status, bankCode, cardType } = req.query;
    
    let filteredCards = [...cards];
    
    if (status) {
      filteredCards = filteredCards.filter(card => card.status.current === status);
    }
    
    if (bankCode) {
      filteredCards = filteredCards.filter(card => card.bin.bankCode === bankCode);
    }
    
    if (cardType) {
      filteredCards = filteredCards.filter(card => card.cardInfo.cardType === cardType);
    }
    
    // صفحه‌بندی
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedCards = filteredCards.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      cards: paginatedCards,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(filteredCards.length / limit),
        totalCards: filteredCards.length,
        hasNextPage: endIndex < filteredCards.length,
        hasPrevPage: page > 1
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
 * GET /api/simple-real-cards/:cardNumber
 * دریافت کارت خاص
 */
router.get('/:cardNumber', (req, res) => {
  try {
    const { cardNumber } = req.params;
    
    const card = cards.find(c => c.cardNumber === cardNumber);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'کارت یافت نشد'
      });
    }
    
    res.json({
      success: true,
      card: card
    });
    
  } catch (error) {
    console.error('خطا در دریافت کارت:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'خطا در دریافت کارت'
    });
  }
});

// ==================== API های عملیات ====================

/**
 * PUT /api/simple-real-cards/:cardNumber/activate
 * فعال‌سازی کارت
 */
router.put('/:cardNumber/activate', (req, res) => {
  try {
    const { cardNumber } = req.params;
    const { reason } = req.body;
    
    const card = cards.find(c => c.cardNumber === cardNumber);
    
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
    
    card.status.current = 'ACTIVE';
    card.dates.activatedAt = new Date();
    
    card.operations.push({
      type: 'ACTIVATED',
      timestamp: new Date(),
      operator: {
        id: req.headers['x-operator-id'] || 'API_USER',
        name: req.headers['x-operator-name'] || 'کاربر API',
        role: req.headers['x-operator-role'] || 'OPERATOR'
      },
      details: reason || 'کارت فعال شد'
    });
    
    res.json({
      success: true,
      message: 'کارت با موفقیت فعال شد',
      card: {
        cardNumber: card.cardNumber,
        status: card.status.current,
        activatedAt: card.dates.activatedAt
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

// ==================== API های گزارش‌گیری ====================

/**
 * GET /api/simple-real-cards/stats/overview
 * آمار کلی کارت‌ها
 */
router.get('/stats/overview', (req, res) => {
  try {
    const totalCards = cards.length;
    const activeCards = cards.filter(card => card.status.current === 'ACTIVE').length;
    const issuedCards = cards.filter(card => card.status.current === 'ISSUED').length;
    
    const cardTypes = {};
    const bankDistribution = {};
    
    cards.forEach(card => {
      // آمار انواع کارت
      const type = card.cardInfo.cardType;
      cardTypes[type] = (cardTypes[type] || 0) + 1;
      
      // آمار بانک‌ها
      const bank = card.bin.bankCode;
      bankDistribution[bank] = (bankDistribution[bank] || 0) + 1;
    });
    
    const stats = {
      total: totalCards,
      active: activeCards,
      issued: issuedCards,
      byType: Object.entries(cardTypes).map(([type, count]) => ({ type, count })),
      byBank: Object.entries(bankDistribution).map(([bank, count]) => ({ bank, count }))
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

// ==================== API های سلامت سیستم ====================

/**
 * GET /api/simple-real-cards/health
 * بررسی سلامت سرویس
 */
router.get('/health', (req, res) => {
  try {
    const health = {
      service: 'SimpleRealCardIssuanceService',
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'In-Memory',
      totalCards: cards.length,
      version: '1.0.0'
    };
    
    res.json({
      success: true,
      health: health
    });
    
  } catch (error) {
    console.error('خطا در بررسی سلامت:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'خطا در بررسی سلامت'
    });
  }
});

// ==================== توابع کمکی ====================

function getBinForBank(bankCode) {
  const bins = {
    '010': '603799', // بانک ملی ایران
    '020': '603769', // بانک صادرات ایران
    '054': '622106', // بانک پارسیان
    '012': '610433', // بانک ملت
    '018': '627353'  // بانک تجارت
  };
  return bins[bankCode] || '603799';
}

function getBankName(bankCode) {
  const banks = {
    '010': 'بانک ملی ایران',
    '020': 'بانک صادرات ایران',
    '054': 'بانک پارسیان',
    '012': 'بانک ملت',
    '018': 'بانک تجارت'
  };
  return banks[bankCode] || 'بانک نامشخص';
}

function calculateLuhnCheckDigit(number) {
  let sum = 0;
  let isEven = false;
  
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return (10 - (sum % 10)) % 10;
}

function generatePIN(length = 4) {
  let pin = '';
  for (let i = 0; i < length; i++) {
    pin += Math.floor(Math.random() * 10);
  }
  return pin;
}

function generateCVV2() {
  return Math.floor(Math.random() * 900) + 100;
}

function generateExpiryDate() {
  const now = new Date();
  const expiryYear = now.getFullYear() + 4;
  const expiryMonth = now.getMonth() + 1;
  return `${expiryMonth.toString().padStart(2, '0')}/${expiryYear}`;
}

function generateTrackData(cardNumber, customerData, expiryDate) {
  const expiry = expiryDate.replace('/', '');
  const serviceCode = '000';
  
  const track1 = `B${cardNumber}^${customerData.fullName}^${expiry}${serviceCode}`;
  const track2 = `${cardNumber}=${expiry}${serviceCode}`;
  
  return { track1, track2, expiryDate, serviceCode };
}

module.exports = router;