const express = require('express');
const { body, validationResult } = require('express-validator');
const Card = require('../models/Card');
const User = require('../models/User');
const Account = require('../models/Account');
const CardGenerator = require('../utils/cardGenerator');
const auth = require('../middleware/auth');

const router = express.Router();
const cardGenerator = new CardGenerator();

// Apply authentication middleware to all card routes
router.use(auth);

// @route   POST /api/cards/generate
// @desc    Generate a new bank card
// @access  Private (Admin/Staff only)
router.post('/generate', [
  body('cardholderName', 'نام صاحب کارت الزامی است').notEmpty().trim(),
  body('accountId', 'شناسه حساب الزامی است').isMongoId(),
  body('bankType', 'نوع بانک الزامی است').isIn(['شتاب', 'ملی', 'پارسیان', 'ملت', 'تجارت', 'سامان', 'پاسارگاد', 'سپه', 'کشاورزی', 'صنعت و معدن']),
  body('networkType', 'نوع شبکه کارت الزامی است').isIn(['Visa', 'MasterCard', 'American Express', 'Discover', 'UnionPay']),
  body('dailyLimit', 'حد روزانه باید عدد باشد').optional().isNumeric(),
  body('monthlyLimit', 'حد ماهانه باید عدد باشد').optional().isNumeric()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'داده‌های ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    const {
      cardholderName,
      accountId,
      bankType,
      networkType,
      dailyLimit,
      monthlyLimit
    } = req.body;

    // Check if user has admin/staff role
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'شما مجوز تولید کارت بانکی را ندارید'
      });
    }

    // Verify account exists and is active
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'حساب بانکی یافت نشد'
      });
    }

    if (account.status !== 'فعال') {
      return res.status(400).json({
        success: false,
        message: 'حساب بانکی فعال نیست'
      });
    }

    // Get account owner
    const accountOwner = await User.findById(account.userId);
    if (!accountOwner) {
      return res.status(404).json({
        success: false,
        message: 'صاحب حساب یافت نشد'
      });
    }

    // Generate card
    const cardData = cardGenerator.generateCompleteCard(
      bankType,
      networkType,
      cardholderName,
      accountId,
      account.userId,
      req.user.id
    );

    // Set custom limits if provided
    if (dailyLimit) cardData.dailyLimit = dailyLimit;
    if (monthlyLimit) cardData.monthlyLimit = monthlyLimit;

    // Create card in database
    const card = new Card(cardData);
    await card.save();

    // Get verification data (for staff use only)
    const verificationData = cardGenerator.generateVerificationData(cardData);

    res.status(201).json({
      success: true,
      message: 'کارت بانکی با موفقیت تولید شد',
      card: {
        id: card._id,
        cardNumber: card.cardNumber,
        maskedCardNumber: card.maskedCardNumber,
        cardholderName: card.cardholderName,
        expiryDate: card.expiryDate,
        cardType: card.cardType,
        cardNetwork: card.cardNetwork,
        status: card.status,
        dailyLimit: card.dailyLimit,
        monthlyLimit: card.monthlyLimit,
        generationDate: card.generationDate
      },
      verificationData: req.user.role === 'admin' ? verificationData : undefined
    });

  } catch (error) {
    console.error('Card generation error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در تولید کارت بانکی',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/cards/generate-iranian
// @desc    Generate Iranian bank card
// @access  Private (Admin/Staff only)
router.post('/generate-iranian', [
  body('cardholderName', 'نام صاحب کارت الزامی است').notEmpty().trim(),
  body('accountId', 'شناسه حساب الزامی است').isMongoId(),
  body('bankType', 'نوع بانک الزامی است').isIn(['شتاب', 'ملی', 'پارسیان', 'ملت', 'تجارت', 'سامان', 'پاسارگاد', 'سپه', 'کشاورزی', 'صنعت و معدن'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'داده‌های ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    const { cardholderName, accountId, bankType } = req.body;

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'شما مجوز تولید کارت بانکی را ندارید'
      });
    }

    // Verify account
    const account = await Account.findById(accountId);
    if (!account || account.status !== 'فعال') {
      return res.status(400).json({
        success: false,
        message: 'حساب بانکی فعال یافت نشد'
      });
    }

    // Generate Iranian bank card
    const cardData = cardGenerator.generateIranianBankCard(
      bankType,
      cardholderName,
      accountId,
      account.userId,
      req.user.id
    );

    const card = new Card(cardData);
    await card.save();

    const verificationData = cardGenerator.generateVerificationData(cardData);

    res.status(201).json({
      success: true,
      message: 'کارت بانکی ایرانی با موفقیت تولید شد',
      card: {
        id: card._id,
        cardNumber: card.cardNumber,
        maskedCardNumber: card.maskedCardNumber,
        cardholderName: card.cardholderName,
        expiryDate: card.expiryDate,
        cardType: card.cardType,
        cardNetwork: card.cardNetwork,
        status: card.status,
        generationDate: card.generationDate
      },
      verificationData: req.user.role === 'admin' ? verificationData : undefined
    });

  } catch (error) {
    console.error('Iranian card generation error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در تولید کارت بانکی ایرانی',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/cards
// @desc    Get all cards (with pagination and filters)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      cardType,
      cardNetwork,
      userId,
      accountId
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (cardType) filter.cardType = cardType;
    if (cardNetwork) filter.cardNetwork = cardNetwork;
    if (userId) filter.userId = userId;
    if (accountId) filter.accountId = accountId;

    // Regular users can only see their own cards
    if (req.user.role === 'user') {
      filter.userId = req.user.id;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'userId', select: 'firstName lastName nationalId' },
        { path: 'accountId', select: 'accountNumber accountType' }
      ]
    };

    // Use pagination
    const skip = (options.page - 1) * options.limit;
    const cards = await Card.find(filter)
      .populate(options.populate)
      .skip(skip)
      .limit(options.limit)
      .sort(options.sort)
      .select('-pin -cvv2 -track1 -track2 -magneticStripeData');

    const total = await Card.countDocuments(filter);

    res.json({
      success: true,
      cards: cards.map(card => card.getPublicInfo()),
      pagination: {
        currentPage: options.page,
        totalPages: Math.ceil(total / options.limit),
        totalCards: total,
        hasNext: options.page * options.limit < total,
        hasPrev: options.page > 1
      }
    });

  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت لیست کارت‌ها',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/cards/:id
// @desc    Get card by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const card = await Card.findById(req.params.id)
      .populate('userId', 'firstName lastName nationalId')
      .populate('accountId', 'accountNumber accountType balance');

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'کارت بانکی یافت نشد'
      });
    }

    // Check if user can access this card
    if (req.user.role === 'user' && card.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'شما مجوز دسترسی به این کارت را ندارید'
      });
    }

    res.json({
      success: true,
      card: req.user.role === 'admin' ? card.getFullInfo() : card.getPublicInfo()
    });

  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت اطلاعات کارت',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/cards/:id/activate
// @desc    Activate a card
// @access  Private (Admin/Staff only)
router.put('/:id/activate', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'شما مجوز فعال‌سازی کارت را ندارید'
      });
    }

    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'کارت بانکی یافت نشد'
      });
    }

    card.status = 'فعال';
    card.activationDate = new Date();
    await card.save();

    res.json({
      success: true,
      message: 'کارت بانکی با موفقیت فعال شد',
      card: card.getPublicInfo()
    });

  } catch (error) {
    console.error('Card activation error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در فعال‌سازی کارت',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/cards/:id/block
// @desc    Block a card
// @access  Private (Admin/Staff only)
router.put('/:id/block', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'شما مجوز مسدود کردن کارت را ندارید'
      });
    }

    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'کارت بانکی یافت نشد'
      });
    }

    card.status = 'مسدود';
    await card.save();

    res.json({
      success: true,
      message: 'کارت بانکی با موفقیت مسدود شد',
      card: card.getPublicInfo()
    });

  } catch (error) {
    console.error('Card blocking error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در مسدود کردن کارت',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/cards/:id/reset-pin
// @desc    Reset PIN attempts
// @access  Private (Admin/Staff only)
router.put('/:id/reset-pin', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'شما مجوز بازنشانی تلاش‌های رمز را ندارید'
      });
    }

    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'کارت بانکی یافت نشد'
      });
    }

    await card.resetPinAttempts();

    res.json({
      success: true,
      message: 'تلاش‌های رمز با موفقیت بازنشانی شد',
      card: card.getPublicInfo()
    });

  } catch (error) {
    console.error('PIN reset error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در بازنشانی تلاش‌های رمز',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/cards/:id/limits
// @desc    Update card limits
// @access  Private (Admin/Staff only)
router.put('/:id/limits', [
  body('dailyLimit', 'حد روزانه باید عدد مثبت باشد').optional().isNumeric().isInt({ min: 0 }),
  body('monthlyLimit', 'حد ماهانه باید عدد مثبت باشد').optional().isNumeric().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'داده‌های ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'شما مجوز تغییر محدودیت‌های کارت را ندارید'
      });
    }

    const { dailyLimit, monthlyLimit } = req.body;
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'کارت بانکی یافت نشد'
      });
    }

    if (dailyLimit !== undefined) card.dailyLimit = dailyLimit;
    if (monthlyLimit !== undefined) card.monthlyLimit = monthlyLimit;

    await card.save();

    res.json({
      success: true,
      message: 'محدودیت‌های کارت با موفقیت به‌روزرسانی شد',
      card: card.getPublicInfo()
    });

  } catch (error) {
    console.error('Update limits error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در به‌روزرسانی محدودیت‌ها',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/cards/:id
// @desc    Delete a card (soft delete - change status to closed)
// @access  Private (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'فقط مدیران می‌توانند کارت‌ها را حذف کنند'
      });
    }

    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'کارت بانکی یافت نشد'
      });
    }

    // Soft delete - change status to closed
    card.status = 'بسته';
    await card.save();

    res.json({
      success: true,
      message: 'کارت بانکی با موفقیت بسته شد',
      card: card.getPublicInfo()
    });

  } catch (error) {
    console.error('Card deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در حذف کارت',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/cards/stats/summary
// @desc    Get card statistics summary
// @access  Private (Admin/Staff only)
router.get('/stats/summary', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'شما مجوز مشاهده آمار را ندارید'
      });
    }

    const stats = await Card.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalCards = await Card.countDocuments();
    const activeCards = await Card.countDocuments({ status: 'فعال' });
    const expiredCards = await Card.countDocuments({ 
      expiryYear: { $lt: new Date().getFullYear() },
      status: 'فعال'
    });

    res.json({
      success: true,
      stats: {
        total: totalCards,
        active: activeCards,
        expired: expiredCards,
        byStatus: stats
      }
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت آمار',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;