const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const updateProfileValidation = [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid phone number'),
  body('address.street').optional().trim().notEmpty().withMessage('Street address cannot be empty'),
  body('address.city').optional().trim().notEmpty().withMessage('City cannot be empty'),
  body('address.state').optional().trim().notEmpty().withMessage('State cannot be empty'),
  body('address.postalCode').optional().trim().notEmpty().withMessage('Postal code cannot be empty')
];

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    res.json({
      user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Profile retrieval failed',
      message: 'Internal server error while retrieving profile'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [authenticateToken, updateProfileValidation], async (req, res) => {
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
    const allowedFields = ['firstName', 'lastName', 'phone', 'address'];
    
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

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Profile update failed',
      message: 'Internal server error during profile update'
    });
  }
});

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get('/', [authenticateToken, requireRole(['admin', 'manager'])], async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;
    
    const query = {};
    
    // Search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { nationalId: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by role
    if (role) {
      query.role = role;
    }
    
    // Filter by status
    if (status) {
      query.isActive = status === 'active';
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      select: '-password',
      sort: { createdAt: -1 }
    };

    const users = await User.paginate(query, options);

    res.json({
      users: users.docs,
      pagination: {
        page: users.page,
        limit: users.limit,
        totalDocs: users.totalDocs,
        totalPages: users.totalPages,
        hasNextPage: users.hasNextPage,
        hasPrevPage: users.hasPrevPage
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'User retrieval failed',
      message: 'Internal server error while retrieving users'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (Admin only)
// @access  Private (Admin)
router.get('/:id', [authenticateToken, requireRole(['admin', 'manager'])], async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User with this ID does not exist'
      });
    }

    res.json({
      user
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'Please provide a valid user ID'
      });
    }
    
    res.status(500).json({
      error: 'User retrieval failed',
      message: 'Internal server error while retrieving user'
    });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Update user status (Admin only)
// @access  Private (Admin)
router.put('/:id/status', [
  authenticateToken, 
  requireRole(['admin']),
  body('isActive').isBoolean().withMessage('isActive must be a boolean value')
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

    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { isActive },
        ...(isActive && { $unset: { lockUntil: 1, loginAttempts: 1 } })
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User with this ID does not exist'
      });
    }

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });

  } catch (error) {
    console.error('Update user status error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'Please provide a valid user ID'
      });
    }
    
    res.status(500).json({
      error: 'Status update failed',
      message: 'Internal server error during status update'
    });
  }
});

// @route   PUT /api/users/:id/role
// @desc    Update user role (Admin only)
// @access  Private (Admin)
router.put('/:id/role', [
  authenticateToken, 
  requireRole(['admin']),
  body('role').isIn(['customer', 'admin', 'manager']).withMessage('Invalid role specified')
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

    const { role } = req.body;

    // Prevent admin from changing their own role
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        error: 'Role update failed',
        message: 'You cannot change your own role'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User with this ID does not exist'
      });
    }

    res.json({
      message: 'User role updated successfully',
      user
    });

  } catch (error) {
    console.error('Update user role error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'Please provide a valid user ID'
      });
    }
    
    res.status(500).json({
      error: 'Role update failed',
      message: 'Internal server error during role update'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (Admin only)
// @access  Private (Admin)
router.delete('/:id', [authenticateToken, requireRole(['admin'])], async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        error: 'User deletion failed',
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User with this ID does not exist'
      });
    }

    res.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'Please provide a valid user ID'
      });
    }
    
    res.status(500).json({
      error: 'User deletion failed',
      message: 'Internal server error during user deletion'
    });
  }
});

module.exports = router;