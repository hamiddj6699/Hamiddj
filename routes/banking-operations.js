const express = require('express');
const { body, validationResult } = require('express-validator');
const CardManagement = require('../services/cardManagement');
const CardIssuance = require('../services/cardIssuance');
const BankConnection = require('../services/bankConnection');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

const router = express.Router();
const cardManagement = new CardManagement();
const cardIssuance = new CardIssuance();
const bankConnection = new BankConnection();

// Apply authentication middleware to all routes
router.use(auth);

// ========================================
// مدیریت کارت‌های موجود
// ========================================

// @route   GET /api/banking/customer-cards/:nationalId
// @desc    مشاهده کارت‌های مشتری
// @access  Private (Staff/Admin only)
router.get('/customer-cards/:nationalId', 
  requireRole(['staff', 'admin']), 
  async (req, res) => {
    try {
      const { nationalId } = req.params;
      const result = await cardManagement.getCustomerCards(nationalId, req.user.id);
      
      res.json(result);
    } catch (error) {
      console.error('Error getting customer cards:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// @route   POST /api/banking/block-card
// @desc    مسدود کردن کارت
// @access  Private (Staff/Admin only)
router.post('/block-card', [
  body('cardNumber', 'شماره کارت الزامی است').notEmpty(),
  body('reason', 'دلیل مسدود کردن الزامی است').notEmpty()
], requireRole(['staff', 'admin']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'داده‌های ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    const { cardNumber, reason } = req.body;
    const result = await cardManagement.blockCard(cardNumber, reason, req.user.id);
    
    res.json(result);
  } catch (error) {
    console.error('Error blocking card:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/banking/unblock-card
// @desc    باز کردن کارت مسدود
// @access  Private (Staff/Admin only)
router.post('/unblock-card', [
  body('cardNumber', 'شماره کارت الزامی است').notEmpty(),
  body('reason', 'دلیل باز کردن الزامی است').notEmpty()
], requireRole(['staff', 'admin']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'داده‌های ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    const { cardNumber, reason } = req.body;
    const result = await cardManagement.unblockCard(cardNumber, reason, req.user.id);
    
    res.json(result);
  } catch (error) {
    console.error('Error unblocking card:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/banking/change-pin
// @desc    تغییر رمز کارت
// @access  Private (Staff/Admin only)
router.post('/change-pin', [
  body('cardNumber', 'شماره کارت الزامی است').notEmpty(),
  body('newPin', 'رمز جدید الزامی است').isLength({ min: 4, max: 4 }).isNumeric()
], requireRole(['staff', 'admin']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'داده‌های ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    const { cardNumber, newPin } = req.body;
    const result = await cardManagement.changeCardPin(cardNumber, newPin, req.user.id);
    
    res.json(result);
  } catch (error) {
    console.error('Error changing card PIN:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/banking/reset-pin-attempts
// @desc    بازنشانی تلاش‌های ورود رمز
// @access  Private (Staff/Admin only)
router.post('/reset-pin-attempts', [
  body('cardNumber', 'شماره کارت الزامی است').notEmpty()
], requireRole(['staff', 'admin']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'داده‌های ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    const { cardNumber } = req.body;
    const result = await cardManagement.resetPinAttempts(cardNumber, req.user.id);
    
    res.json(result);
  } catch (error) {
    console.error('Error resetting PIN attempts:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/banking/update-card-limits
// @desc    تغییر محدودیت‌های کارت
// @access  Private (Staff/Admin only)
router.put('/update-card-limits', [
  body('cardNumber', 'شماره کارت الزامی است').notEmpty(),
  body('dailyLimit', 'حد روزانه باید عدد مثبت باشد').optional().isNumeric().isInt({ min: 0 }),
  body('monthlyLimit', 'حد ماهانه باید عدد مثبت باشد').optional().isNumeric().isInt({ min: 0 })
], requireRole(['staff', 'admin']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'داده‌های ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    const { cardNumber, dailyLimit, monthlyLimit } = req.body;
    const result = await cardManagement.updateCardLimits(
      cardNumber, 
      dailyLimit, 
      monthlyLimit, 
      req.user.id
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error updating card limits:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========================================
// صدور کارت جدید
// ========================================

// @route   POST /api/banking/issue-replacement-card
// @desc    صدور کارت جایگزین
// @access  Private (Staff/Admin only)
router.post('/issue-replacement-card', [
  body('blockedCardNumber', 'شماره کارت مسدود الزامی است').notEmpty(),
  body('reason', 'دلیل صدور کارت جایگزین الزامی است').notEmpty()
], requireRole(['staff', 'admin']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'داده‌های ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    const { blockedCardNumber, reason } = req.body;
    const result = await cardIssuance.issueReplacementCard(
      blockedCardNumber, 
      req.user.id, 
      reason
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error issuing replacement card:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/banking/issue-new-card
// @desc    صدور کارت جدید
// @access  Private (Staff/Admin only)
router.post('/issue-new-card', [
  body('customerData.firstName', 'نام مشتری الزامی است').notEmpty(),
  body('customerData.lastName', 'نام خانوادگی مشتری الزامی است').notEmpty(),
  body('customerData.nationalId', 'کد ملی مشتری الزامی است').isLength({ min: 10, max: 10 }),
  body('customerData.phone', 'شماره تلفن مشتری الزامی است').matches(/^09\d{9}$/),
  body('customerData.email', 'ایمیل مشتری الزامی است').isEmail(),
  body('accountData.accountNumber', 'شماره حساب الزامی است').notEmpty(),
  body('accountData.accountType', 'نوع حساب الزامی است').notEmpty(),
  body('cardType', 'نوع کارت الزامی است').notEmpty()
], requireRole(['staff', 'admin']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'داده‌های ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    const { customerData, accountData, cardType } = req.body;
    
    // اضافه کردن نام کامل
    customerData.fullName = `${customerData.firstName} ${customerData.lastName}`;
    
    const result = await cardIssuance.issueNewCard(
      customerData, 
      accountData, 
      cardType, 
      req.user.id
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error issuing new card:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/banking/issue-card-for-existing-account
// @desc    صدور کارت برای حساب موجود
// @access  Private (Staff/Admin only)
router.post('/issue-card-for-existing-account', [
  body('accountNumber', 'شماره حساب الزامی است').notEmpty(),
  body('nationalId', 'کد ملی مالک حساب الزامی است').isLength({ min: 10, max: 10 }),
  body('cardType', 'نوع کارت الزامی است').notEmpty()
], requireRole(['staff', 'admin']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'داده‌های ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    const { accountNumber, nationalId, cardType } = req.body;
    const result = await cardIssuance.issueCardForExistingAccount(
      accountNumber, 
      nationalId, 
      cardType, 
      req.user.id
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error issuing card for existing account:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/banking/issue-emergency-card
// @desc    صدور کارت اضطراری
// @access  Private (Admin only)
router.post('/issue-emergency-card', [
  body('accountNumber', 'شماره حساب الزامی است').notEmpty(),
  body('nationalId', 'کد ملی مشتری الزامی است').isLength({ min: 10, max: 10 }),
  body('cardType', 'نوع کارت الزامی است').notEmpty(),
  body('emergencyReason', 'دلیل اضطراری الزامی است').notEmpty()
], requireRole(['admin']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'داده‌های ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    const { accountNumber, nationalId, cardType, emergencyReason } = req.body;
    const result = await cardIssuance.issueEmergencyCard(
      accountNumber, 
      nationalId, 
      cardType, 
      req.user.id, 
      emergencyReason
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error issuing emergency card:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/banking/activate-issued-card
// @desc    فعال‌سازی کارت صادر شده
// @access  Private (Staff/Admin only)
router.post('/activate-issued-card', [
  body('cardNumber', 'شماره کارت الزامی است').notEmpty()
], requireRole(['staff', 'admin']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'داده‌های ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    const { cardNumber } = req.body;
    const result = await cardIssuance.activateIssuedCard(cardNumber, req.user.id);
    
    res.json(result);
  } catch (error) {
    console.error('Error activating issued card:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========================================
// عملیات شبکه بانکی
// ========================================

// @route   GET /api/banking/check-card-status/:cardNumber
// @desc    بررسی وضعیت کارت در شبکه شتاب
// @access  Private (Staff/Admin only)
router.get('/check-card-status/:cardNumber', 
  requireRole(['staff', 'admin']), 
  async (req, res) => {
    try {
      const { cardNumber } = req.params;
      const result = await cardManagement.checkCardStatusInShetab(cardNumber, req.user.id);
      
      res.json(result);
    } catch (error) {
      console.error('Error checking card status:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// @route   POST /api/banking/sync-card-status/:cardNumber
// @desc    همگام‌سازی وضعیت کارت با شبکه شتاب
// @access  Private (Staff/Admin only)
router.post('/sync-card-status/:cardNumber', 
  requireRole(['staff', 'admin']), 
  async (req, res) => {
    try {
      const { cardNumber } = req.params;
      const result = await cardManagement.syncCardStatusWithShetab(cardNumber, req.user.id);
      
      res.json(result);
    } catch (error) {
      console.error('Error syncing card status:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// @route   GET /api/banking/test-connections
// @desc    تست اتصال به شبکه‌های بانکی
// @access  Private (Admin only)
router.get('/test-connections', 
  requireRole(['admin']), 
  async (req, res) => {
    try {
      const results = await bankConnection.testConnections();
      
      res.json({
        success: true,
        connections: results
      });
    } catch (error) {
      console.error('Error testing connections:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// ========================================
// گزارش‌ها
// ========================================

// @route   GET /api/banking/blocked-cards-report
// @desc    گزارش کارت‌های مسدود
// @access  Private (Staff/Admin only)
router.get('/blocked-cards-report', 
  requireRole(['staff', 'admin']), 
  async (req, res) => {
    try {
      const filters = req.query;
      const result = await cardManagement.getBlockedCardsReport(req.user.id, filters);
      
      res.json(result);
    } catch (error) {
      console.error('Error getting blocked cards report:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// @route   GET /api/banking/issued-cards-report
// @desc    گزارش کارت‌های صادر شده
// @access  Private (Staff/Admin only)
router.get('/issued-cards-report', 
  requireRole(['staff', 'admin']), 
  async (req, res) => {
    try {
      const filters = req.query;
      const result = await cardIssuance.getIssuedCardsReport(req.user.id, filters);
      
      res.json(result);
    } catch (error) {
      console.error('Error getting issued cards report:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

module.exports = router;