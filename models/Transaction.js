const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'transfer', 'payment', 'refund', 'fee', 'interest'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'reversed'],
    default: 'pending'
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Amount must be greater than 0']
  },
  currency: {
    type: String,
    default: 'IRR',
    enum: ['IRR', 'USD', 'EUR', 'GBP']
  },
  fee: {
    type: Number,
    default: 0,
    min: [0, 'Fee cannot be negative']
  },
  description: {
    type: String,
    required: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  reference: {
    type: String,
    maxlength: [100, 'Reference cannot exceed 100 characters']
  },
  fromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: function() {
      return ['withdrawal', 'transfer', 'payment'].includes(this.type);
    }
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: function() {
      return ['deposit', 'transfer', 'refund'].includes(this.type);
    }
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  category: {
    type: String,
    enum: ['food', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    maxlength: [20, 'Tag cannot exceed 20 characters']
  }],
  metadata: {
    ipAddress: String,
    userAgent: String,
    location: String,
    device: String
  },
  scheduledDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for net amount (amount - fee)
transactionSchema.virtual('netAmount').get(function() {
  return this.amount - this.fee;
});

// Virtual for transaction age in minutes
transactionSchema.virtual('ageInMinutes').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60));
});

// Virtual for is pending
transactionSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

// Indexes
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ fromAccount: 1 });
transactionSchema.index({ toAccount: 1 });
transactionSchema.index({ fromUser: 1 });
transactionSchema.index({ toUser: 1 });
transactionSchema.index({ initiatedBy: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ amount: 1 });
transactionSchema.index({ category: 1 });

// Pre-save middleware to generate transaction ID if not provided
transactionSchema.pre('save', function(next) {
  if (!this.transactionId) {
    // Generate a unique transaction ID
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    this.transactionId = `TXN${timestamp.slice(-8)}${random}`;
  }
  
  // Set completed date if status is completed
  if (this.status === 'completed' && !this.completedDate) {
    this.completedDate = new Date();
  }
  
  next();
});

// Instance method to mark as completed
transactionSchema.methods.markCompleted = function() {
  this.status = 'completed';
  this.completedDate = new Date();
  return this.save();
};

// Instance method to mark as failed
transactionSchema.methods.markFailed = function(reason) {
  this.status = 'failed';
  this.notes = reason;
  return this.save();
};

// Instance method to reverse transaction
transactionSchema.methods.reverse = function(reason) {
  this.status = 'reversed';
  this.notes = `Reversed: ${reason}`;
  return this.save();
};

// Static method to find by transaction ID
transactionSchema.statics.findByTransactionId = function(transactionId) {
  return this.findOne({ transactionId });
};

// Static method to find transactions by account
transactionSchema.statics.findByAccount = function(accountId, limit = 50) {
  return this.find({
    $or: [{ fromAccount: accountId }, { toAccount: accountId }]
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('fromAccount', 'accountNumber accountType')
  .populate('toAccount', 'accountNumber accountType');
};

// Static method to find transactions by user
transactionSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({
    $or: [{ fromUser: userId }, { toUser: userId }]
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('fromAccount', 'accountNumber accountType')
  .populate('toAccount', 'accountNumber accountType');
};

// Static method to calculate total amount by type and date range
transactionSchema.statics.calculateTotalByType = async function(type, startDate, endDate, accountId = null) {
  const query = { type, status: 'completed' };
  
  if (startDate && endDate) {
    query.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  if (accountId) {
    query.$or = [{ fromAccount: accountId }, { toAccount: accountId }];
  }
  
  const result = await this.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  return result.length > 0 ? result[0].total : 0;
};

module.exports = mongoose.model('Transaction', transactionSchema);