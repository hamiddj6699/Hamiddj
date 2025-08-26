const express = require('express');
const { body, validationResult } = require('express-validator');
const Account = require('../models/Account');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createAccountValidation = [
  body('accountType').isIn(['savings', 'checking', 'current', 'investment', 'loan']).withMessage('Invalid account type'),
  body('currency').optional().isIn(['IRR', 'USD', 'EUR', 'GBP']).withMessage('Invalid currency'),
  body('branch').trim().notEmpty().withMessage('Branch is required'),
  body('initialDeposit').optional().isFloat({ min: 0 }).withMessage('Initial deposit must be a positive number')
];

const updateAccountValidation = [
  body('status').optional().isIn(['active', 'suspended', 'closed', 'frozen']).withMessage('Invalid status'),
  body('interestRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Interest rate must be between 0 and 100'),
  body('monthlyFee').optional().isFloat({ min: 0 }).withMessage('Monthly fee must be a positive number'),
  body('minimumBalance').optional().isFloat({ min: 0 }).withMessage('Minimum balance must be a positive number'),
  body('dailyLimit').optional().isFloat({ min: 0 }).withMessage('Daily limit must be a positive number'),
  body('monthlyLimit').optional().isFloat({ min: 0 }).withMessage('Monthly limit must be a positive number')
];

// @route   POST /api/accounts
// @desc    Create a new bank account
// @access  Private
router.post('/', [authenticateToken, createAccountValidation], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      accountType,
      currency = 'IRR',
      branch,
      initialDeposit = 0,
      notes
    } = req.body;

    // Check if user already has an account of this type
    const existingAccount = await Account.findOne({
      owner: req.user._id,
      accountType,
      status: { $ne: 'closed' }
    });

    if (existingAccount) {
      return res.status(400).json({
        error: 'Account creation failed',
        message: `You already have a ${accountType} account`
      });
    }

    // Create new account
    const account = new Account({
      accountType,
      owner: req.user._id,
      currency,
      branch,
      balance: initialDeposit,
      notes
    });

    await account.save();

    // Populate owner details
    await account.populate('owner', 'firstName lastName email');

    res.status(201).json({
      message: 'Account created successfully',
      account
    });

  } catch (error) {
    console.error('Account creation error:', error);
    res.status(500).json({
      error: 'Account creation failed',
      message: 'Internal server error during account creation'
    });
  }
});

// @route   GET /api/accounts
// @desc    Get user's accounts
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    
    const query = { owner: req.user._id };
    if (status !== 'all') {
      query.status = status;
    }

    const accounts = await Account.find(query)
      .populate('owner', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      accounts,
      totalBalance: accounts.reduce((sum, acc) => sum + acc.balance, 0)
    });

  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      error: 'Account retrieval failed',
      message: 'Internal server error while retrieving accounts'
    });
  }
});

// @route   GET /api/accounts/:id
// @desc    Get account by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const account = await Account.findById(req.params.id)
      .populate('owner', 'firstName lastName email')
      .populate('accountManager', 'firstName lastName email');

    if (!account) {
      return res.status(404).json({
        error: 'Account not found',
        message: 'Account with this ID does not exist'
      });
    }

    // Check if user owns this account or is admin/manager
    if (account.owner._id.toString() !== req.user._id.toString() && 
        !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own accounts'
      });
    }

    res.json({
      account
    });

  } catch (error) {
    console.error('Get account error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid account ID',
        message: 'Please provide a valid account ID'
      });
    }
    
    res.status(500).json({
      error: 'Account retrieval failed',
      message: 'Internal server error while retrieving account'
    });
  }
});

// @route   PUT /api/accounts/:id
// @desc    Update account details (Admin/Manager only)
// @access  Private (Admin/Manager)
router.put('/:id', [
  authenticateToken, 
  requireRole(['admin', 'manager']),
  updateAccountValidation
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

    const updateFields = {};
    const allowedFields = ['status', 'interestRate', 'monthlyFee', 'minimumBalance', 'dailyLimit', 'monthlyLimit', 'notes'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        message: 'Please provide at least one field to update'
      });
    }

    const account = await Account.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate('owner', 'firstName lastName email');

    if (!account) {
      return res.status(404).json({
        error: 'Account not found',
        message: 'Account with this ID does not exist'
      });
    }

    res.json({
      message: 'Account updated successfully',
      account
    });

  } catch (error) {
    console.error('Account update error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid account ID',
        message: 'Please provide a valid account ID'
      });
    }
    
    res.status(500).json({
      error: 'Account update failed',
      message: 'Internal server error during account update'
    });
  }
});

// @route   DELETE /api/accounts/:id
// @desc    Close account (Admin only)
// @access  Private (Admin)
router.delete('/:id', [authenticateToken, requireRole(['admin'])], async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        error: 'Account not found',
        message: 'Account with this ID does not exist'
      });
    }

    // Check if account has balance
    if (account.balance > 0) {
      return res.status(400).json({
        error: 'Account closure failed',
        message: 'Cannot close account with remaining balance. Please withdraw all funds first.'
      });
    }

    // Close account
    account.status = 'closed';
    account.closedDate = new Date();
    await account.save();

    res.json({
      message: 'Account closed successfully'
    });

  } catch (error) {
    console.error('Account closure error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid account ID',
        message: 'Please provide a valid account ID'
      });
    }
    
    res.status(500).json({
      error: 'Account closure failed',
      message: 'Internal server error during account closure'
    });
  }
});

// @route   GET /api/accounts/:id/balance
// @desc    Get account balance
// @access  Private
router.get('/:id/balance', authenticateToken, async (req, res) => {
  try {
    const account = await Account.findById(req.params.id).select('balance currency status owner');
    
    if (!account) {
      return res.status(404).json({
        error: 'Account not found',
        message: 'Account with this ID does not exist'
      });
    }

    // Check if user owns this account
    if (account.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own account balance'
      });
    }

    res.json({
      accountId: account._id,
      balance: account.balance,
      currency: account.currency,
      status: account.status,
      availableBalance: account.availableBalance
    });

  } catch (error) {
    console.error('Get balance error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid account ID',
        message: 'Please provide a valid account ID'
      });
    }
    
    res.status(500).json({
      error: 'Balance retrieval failed',
      message: 'Internal server error while retrieving balance'
    });
  }
});

// @route   GET /api/accounts/all
// @desc    Get all accounts (Admin/Manager only)
// @access  Private (Admin/Manager)
router.get('/admin/all', [authenticateToken, requireRole(['admin', 'manager'])], async (req, res) => {
  try {
    const { page = 1, limit = 10, status, accountType, branch } = req.query;
    
    const query = {};
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter by account type
    if (accountType) {
      query.accountType = accountType;
    }
    
    // Filter by branch
    if (branch) {
      query.branch = { $regex: branch, $options: 'i' };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'owner', select: 'firstName lastName email' },
        { path: 'accountManager', select: 'firstName lastName email' }
      ],
      sort: { createdAt: -1 }
    };

    const accounts = await Account.paginate(query, options);

    res.json({
      accounts: accounts.docs,
      pagination: {
        page: accounts.page,
        limit: accounts.limit,
        totalDocs: accounts.totalDocs,
        totalPages: accounts.totalPages,
        hasNextPage: accounts.hasNextPage,
        hasPrevPage: accounts.hasPrevPage
      }
    });

  } catch (error) {
    console.error('Get all accounts error:', error);
    res.status(500).json({
      error: 'Account retrieval failed',
      message: 'Internal server error while retrieving accounts'
    });
  }
});

module.exports = router;