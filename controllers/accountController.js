const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

// Create new account
const createAccount = async (req, res) => {
  try {
    const { accountType, currency } = req.body;
    const userId = req.user._id;

    // Check if user already has this type of account
    const existingAccount = await Account.findOne({
      userId,
      accountType,
      status: { $ne: 'بسته' }
    });

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: `شما قبلاً یک حساب ${accountType} دارید`
      });
    }

    const account = new Account({
      userId,
      accountType,
      currency: currency || 'IRR'
    });

    await account.save();

    res.status(201).json({
      success: true,
      message: 'حساب جدید با موفقیت ایجاد شد',
      data: { account }
    });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در ایجاد حساب',
      error: error.message
    });
  }
};

// Get user accounts
const getUserAccounts = async (req, res) => {
  try {
    const userId = req.user._id;
    const accounts = await Account.find({
      userId,
      status: { $ne: 'بسته' }
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { accounts }
    });
  } catch (error) {
    console.error('Get user accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت حساب‌ها',
      error: error.message
    });
  }
};

// Get account details
const getAccountDetails = async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user._id;

    const account = await Account.findOne({
      _id: accountId,
      userId,
      status: { $ne: 'بسته' }
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'حساب یافت نشد'
      });
    }

    res.json({
      success: true,
      data: { account }
    });
  } catch (error) {
    console.error('Get account details error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت جزئیات حساب',
      error: error.message
    });
  }
};

// Get account balance
const getAccountBalance = async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user._id;

    const account = await Account.findOne({
      _id: accountId,
      userId,
      status: { $ne: 'بسته' }
    }).select('balance currency accountType accountNumber');

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'حساب یافت نشد'
      });
    }

    res.json({
      success: true,
      data: {
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        balance: account.balance,
        currency: account.currency
      }
    });
  } catch (error) {
    console.error('Get account balance error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت موجودی حساب',
      error: error.message
    });
  }
};

// Transfer money between accounts
const transferMoney = async (req, res) => {
  try {
    const { fromAccountId, toAccountId, amount, description } = req.body;
    const userId = req.user._id;

    // Validate accounts
    const fromAccount = await Account.findOne({
      _id: fromAccountId,
      userId,
      status: 'فعال'
    });

    if (!fromAccount) {
      return res.status(404).json({
        success: false,
        message: 'حساب مبدا یافت نشد یا غیرفعال است'
      });
    }

    const toAccount = await Account.findById(toAccountId);
    if (!toAccount) {
      return res.status(404).json({
        success: false,
        message: 'حساب مقصد یافت نشد'
      });
    }

    // Check balance
    if (fromAccount.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'موجودی کافی نیست'
      });
    }

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTransactions = await Transaction.find({
      fromAccount: fromAccountId,
      createdAt: { $gte: today },
      status: 'موفق'
    });

    const todayTotal = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    if (todayTotal + amount > fromAccount.dailyLimit) {
      return res.status(400).json({
        success: false,
        message: 'مبلغ تراکنش از حد مجاز روزانه بیشتر است'
      });
    }

    // Create transaction
    const transaction = new Transaction({
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount,
      description,
      transactionType: 'انتقال',
      currency: fromAccount.currency
    });

    await transaction.save();

    // Update account balances
    fromAccount.balance -= amount;
    toAccount.balance += amount;

    fromAccount.lastTransactionDate = new Date();
    toAccount.lastTransactionDate = new Date();

    await Promise.all([fromAccount.save(), toAccount.save()]);

    // Update transaction status
    transaction.status = 'موفق';
    await transaction.save();

    res.json({
      success: true,
      message: 'انتقال با موفقیت انجام شد',
      data: {
        transaction: transaction,
        newBalance: fromAccount.balance
      }
    });
  } catch (error) {
    console.error('Transfer money error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در انتقال پول',
      error: error.message
    });
  }
};

// Get account transactions
const getAccountTransactions = async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    // Verify account ownership
    const account = await Account.findOne({
      _id: accountId,
      userId
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'حساب یافت نشد'
      });
    }

    const skip = (page - 1) * limit;
    
    const transactions = await Transaction.find({
      $or: [
        { fromAccount: accountId },
        { toAccount: accountId }
      ]
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('fromAccount', 'accountNumber accountType')
    .populate('toAccount', 'accountNumber accountType');

    const total = await Transaction.countDocuments({
      $or: [
        { fromAccount: accountId },
        { toAccount: accountId }
      ]
    });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTransactions: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get account transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت تراکنش‌ها',
      error: error.message
    });
  }
};

// Close account
const closeAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user._id;

    const account = await Account.findOne({
      _id: accountId,
      userId,
      status: { $ne: 'بسته' }
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'حساب یافت نشد'
      });
    }

    if (account.balance > 0) {
      return res.status(400).json({
        success: false,
        message: 'قبل از بستن حساب، موجودی آن را برداشت کنید'
      });
    }

    account.status = 'بسته';
    await account.save();

    res.json({
      success: true,
      message: 'حساب با موفقیت بسته شد'
    });
  } catch (error) {
    console.error('Close account error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در بستن حساب',
      error: error.message
    });
  }
};

module.exports = {
  createAccount,
  getUserAccounts,
  getAccountDetails,
  getAccountBalance,
  transferMoney,
  getAccountTransactions,
  closeAccount
};