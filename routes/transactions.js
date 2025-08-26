const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const transactionValidation = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').optional().isIn(['food', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other']).withMessage('Invalid category'),
  body('reference').optional().trim().isLength({ max: 100 }).withMessage('Reference cannot exceed 100 characters')
];

const transferValidation = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('fromAccount').isMongoId().withMessage('Valid from account ID is required'),
  body('toAccount').isMongoId().withMessage('Valid to account ID is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('reference').optional().trim().isLength({ max: 100 }).withMessage('Reference cannot exceed 100 characters')
];

// @route   POST /api/transactions/deposit
// @desc    Make a deposit to an account
// @access  Private
router.post('/deposit', [authenticateToken, transactionValidation], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { amount, description, category, reference, toAccount } = req.body;

    // Find the account to deposit to
    const account = await Account.findById(toAccount);
    if (!account) {
      return res.status(404).json({
        error: 'Account not found',
        message: 'Account with this ID does not exist'
      });
    }

    // Check if account is active
    if (account.status !== 'active') {
      return res.status(400).json({
        error: 'Deposit failed',
        message: 'Cannot deposit to inactive account'
      });
    }

    // Check if user owns the account or is admin/manager
    if (account.owner.toString() !== req.user._id.toString() && 
        !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only deposit to your own accounts'
      });
    }

    // Create transaction
    const transaction = new Transaction({
      type: 'deposit',
      amount,
      description,
      category,
      reference,
      toAccount: account._id,
      toUser: account.owner,
      initiatedBy: req.user._id,
      status: 'completed',
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        device: req.get('User-Agent')
      }
    });

    await transaction.save();

    // Update account balance
    await account.updateBalance(amount);

    // Populate account details
    await transaction.populate([
      { path: 'toAccount', select: 'accountNumber accountType' },
      { path: 'toUser', select: 'firstName lastName' },
      { path: 'initiatedBy', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      message: 'Deposit successful',
      transaction,
      newBalance: account.balance
    });

  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({
      error: 'Deposit failed',
      message: 'Internal server error during deposit'
    });
  }
});

// @route   POST /api/transactions/withdrawal
// @desc    Make a withdrawal from an account
// @access  Private
router.post('/withdrawal', [authenticateToken, transactionValidation], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { amount, description, category, reference, fromAccount } = req.body;

    // Find the account to withdraw from
    const account = await Account.findById(fromAccount);
    if (!account) {
      return res.status(404).json({
        error: 'Account not found',
        message: 'Account with this ID does not exist'
      });
    }

    // Check if account is active
    if (account.status !== 'active') {
      return res.status(400).json({
        error: 'Withdrawal failed',
        message: 'Cannot withdraw from inactive account'
      });
    }

    // Check if user owns the account
    if (account.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only withdraw from your own accounts'
      });
    }

    // Check if withdrawal is allowed
    const canWithdraw = account.canTransact(-amount);
    if (!canWithdraw.allowed) {
      return res.status(400).json({
        error: 'Withdrawal failed',
        message: canWithdraw.reason
      });
    }

    // Check daily and monthly limits
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const dailyTotal = await Transaction.calculateTotalByType('withdrawal', today, new Date(), account._id);
    const monthlyTotal = await Transaction.calculateTotalByType('withdrawal', monthStart, new Date(), account._id);

    if (dailyTotal + amount > account.dailyLimit) {
      return res.status(400).json({
        error: 'Withdrawal failed',
        message: 'Daily withdrawal limit exceeded'
      });
    }

    if (monthlyTotal + amount > account.monthlyLimit) {
      return res.status(400).json({
        error: 'Withdrawal failed',
        message: 'Monthly withdrawal limit exceeded'
      });
    }

    // Create transaction
    const transaction = new Transaction({
      type: 'withdrawal',
      amount: -amount, // Negative amount for withdrawal
      description,
      category,
      reference,
      fromAccount: account._id,
      fromUser: account.owner,
      initiatedBy: req.user._id,
      status: 'completed',
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        device: req.get('User-Agent')
      }
    });

    await transaction.save();

    // Update account balance
    await account.updateBalance(-amount);

    // Populate account details
    await transaction.populate([
      { path: 'fromAccount', select: 'accountNumber accountType' },
      { path: 'fromUser', select: 'firstName lastName' },
      { path: 'initiatedBy', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      message: 'Withdrawal successful',
      transaction,
      newBalance: account.balance
    });

  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({
      error: 'Withdrawal failed',
      message: 'Internal server error during withdrawal'
    });
  }
});

// @route   POST /api/transactions/transfer
// @desc    Transfer money between accounts
// @access  Private
router.post('/transfer', [authenticateToken, transferValidation], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { amount, fromAccount, toAccount, description, reference } = req.body;

    // Find both accounts
    const [sourceAccount, targetAccount] = await Promise.all([
      Account.findById(fromAccount),
      Account.findById(toAccount)
    ]);

    if (!sourceAccount || !targetAccount) {
      return res.status(404).json({
        error: 'Account not found',
        message: 'One or both accounts not found'
      });
    }

    // Check if accounts are active
    if (sourceAccount.status !== 'active' || targetAccount.status !== 'active') {
      return res.status(400).json({
        error: 'Transfer failed',
        message: 'Cannot transfer to/from inactive accounts'
      });
    }

    // Check if user owns the source account
    if (sourceAccount.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only transfer from your own accounts'
      });
    }

    // Check if transfer is allowed from source account
    const canTransfer = sourceAccount.canTransact(-amount);
    if (!canTransfer.allowed) {
      return res.status(400).json({
        error: 'Transfer failed',
        message: canTransfer.reason
      });
    }

    // Check daily and monthly limits
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const dailyTotal = await Transaction.calculateTotalByType('transfer', today, new Date(), sourceAccount._id);
    const monthlyTotal = await Transaction.calculateTotalByType('transfer', monthStart, new Date(), sourceAccount._id);

    if (dailyTotal + amount > sourceAccount.dailyLimit) {
      return res.status(400).json({
        error: 'Transfer failed',
        message: 'Daily transfer limit exceeded'
      });
    }

    if (monthlyTotal + amount > sourceAccount.monthlyLimit) {
      return res.status(400).json({
        error: 'Transfer failed',
        message: 'Monthly transfer limit exceeded'
      });
    }

    // Create transfer transaction
    const transaction = new Transaction({
      type: 'transfer',
      amount,
      description,
      reference,
      fromAccount: sourceAccount._id,
      toAccount: targetAccount._id,
      fromUser: sourceAccount.owner,
      toUser: targetAccount.owner,
      initiatedBy: req.user._id,
      status: 'completed',
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        device: req.get('User-Agent')
      }
    });

    await transaction.save();

    // Update both account balances
    await Promise.all([
      sourceAccount.updateBalance(-amount),
      targetAccount.updateBalance(amount)
    ]);

    // Populate account details
    await transaction.populate([
      { path: 'fromAccount', select: 'accountNumber accountType' },
      { path: 'toAccount', select: 'accountNumber accountType' },
      { path: 'fromUser', select: 'firstName lastName' },
      { path: 'toUser', select: 'firstName lastName' },
      { path: 'initiatedBy', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      message: 'Transfer successful',
      transaction,
      sourceAccountBalance: sourceAccount.balance,
      targetAccountBalance: targetAccount.balance
    });

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({
      error: 'Transfer failed',
      message: 'Internal server error during transfer'
    });
  }
});

// @route   GET /api/transactions
// @desc    Get user's transaction history
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      status, 
      category, 
      startDate, 
      endDate,
      accountId 
    } = req.query;
    
    const query = {
      $or: [
        { fromUser: req.user._id },
        { toUser: req.user._id }
      ]
    };
    
    // Filter by type
    if (type) {
      query.type = type;
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filter by date range
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Filter by account
    if (accountId) {
      query.$or = [
        { fromAccount: accountId },
        { toAccount: accountId }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'fromAccount', select: 'accountNumber accountType' },
        { path: 'toAccount', select: 'accountNumber accountType' },
        { path: 'fromUser', select: 'firstName lastName' },
        { path: 'toUser', select: 'firstName lastName' }
      ],
      sort: { createdAt: -1 }
    };

    const transactions = await Transaction.paginate(query, options);

    res.json({
      transactions: transactions.docs,
      pagination: {
        page: transactions.page,
        limit: transactions.limit,
        totalDocs: transactions.totalDocs,
        totalPages: transactions.totalPages,
        hasNextPage: transactions.hasNextPage,
        hasPrevPage: transactions.hasPrevPage
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      error: 'Transaction retrieval failed',
      message: 'Internal server error while retrieving transactions'
    });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get transaction by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('fromAccount', 'accountNumber accountType')
      .populate('toAccount', 'accountNumber accountType')
      .populate('fromUser', 'firstName lastName')
      .populate('toUser', 'firstName lastName')
      .populate('initiatedBy', 'firstName lastName');

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: 'Transaction with this ID does not exist'
      });
    }

    // Check if user is involved in this transaction or is admin/manager
    if ((transaction.fromUser?._id.toString() !== req.user._id.toString() && 
         transaction.toUser?._id.toString() !== req.user._id.toString()) &&
        !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own transactions'
      });
    }

    res.json({
      transaction
    });

  } catch (error) {
    console.error('Get transaction error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid transaction ID',
        message: 'Please provide a valid transaction ID'
      });
    }
    
    res.status(500).json({
      error: 'Transaction retrieval failed',
      message: 'Internal server error while retrieving transaction'
    });
  }
});

// @route   GET /api/transactions/admin/all
// @desc    Get all transactions (Admin/Manager only)
// @access  Private (Admin/Manager)
router.get('/admin/all', [authenticateToken, requireRole(['admin', 'manager'])], async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      status, 
      category, 
      startDate, 
      endDate,
      userId,
      accountId 
    } = req.query;
    
    const query = {};
    
    // Filter by type
    if (type) {
      query.type = type;
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filter by date range
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Filter by user
    if (userId) {
      query.$or = [
        { fromUser: userId },
        { toUser: userId }
      ];
    }
    
    // Filter by account
    if (accountId) {
      query.$or = [
        { fromAccount: accountId },
        { toAccount: accountId }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'fromAccount', select: 'accountNumber accountType' },
        { path: 'toAccount', select: 'accountNumber accountType' },
        { path: 'fromUser', select: 'firstName lastName email' },
        { path: 'toUser', select: 'firstName lastName email' },
        { path: 'initiatedBy', select: 'firstName lastName email' }
      ],
      sort: { createdAt: -1 }
    };

    const transactions = await Transaction.paginate(query, options);

    res.json({
      transactions: transactions.docs,
      pagination: {
        page: transactions.page,
        limit: transactions.limit,
        totalDocs: transactions.totalDocs,
        totalPages: transactions.totalPages,
        hasNextPage: transactions.hasNextPage,
        hasPrevPage: transactions.hasPrevPage
      }
    });

  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({
      error: 'Transaction retrieval failed',
      message: 'Internal server error while retrieving transactions'
    });
  }
});

// @route   PUT /api/transactions/:id/status
// @desc    Update transaction status (Admin only)
// @access  Private (Admin)
router.put('/:id/status', [
  authenticateToken, 
  requireRole(['admin']),
  body('status').isIn(['pending', 'completed', 'failed', 'cancelled', 'reversed']).withMessage('Invalid status'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { status, notes } = req.body;

    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: 'Transaction with this ID does not exist'
      });
    }

    // Update transaction status
    transaction.status = status;
    if (notes) {
      transaction.notes = notes;
    }
    
    if (status === 'completed') {
      transaction.completedDate = new Date();
    }

    await transaction.save();

    res.json({
      message: 'Transaction status updated successfully',
      transaction
    });

  } catch (error) {
    console.error('Update transaction status error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid transaction ID',
        message: 'Please provide a valid transaction ID'
      });
    }
    
    res.status(500).json({
      error: 'Status update failed',
      message: 'Internal server error during status update'
    });
  }
});

module.exports = router;