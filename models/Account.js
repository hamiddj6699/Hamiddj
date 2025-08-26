const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  accountType: {
    type: String,
    enum: ['savings', 'checking', 'current', 'investment', 'loan'],
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative']
  },
  currency: {
    type: String,
    default: 'IRR',
    enum: ['IRR', 'USD', 'EUR', 'GBP']
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'closed', 'frozen'],
    default: 'active'
  },
  interestRate: {
    type: Number,
    default: 0,
    min: [0, 'Interest rate cannot be negative'],
    max: [100, 'Interest rate cannot exceed 100%']
  },
  monthlyFee: {
    type: Number,
    default: 0,
    min: [0, 'Monthly fee cannot be negative']
  },
  minimumBalance: {
    type: Number,
    default: 0,
    min: [0, 'Minimum balance cannot be negative']
  },
  dailyLimit: {
    type: Number,
    default: 10000000, // 10 million IRR
    min: [0, 'Daily limit cannot be negative']
  },
  monthlyLimit: {
    type: Number,
    default: 100000000, // 100 million IRR
    min: [0, 'Monthly limit cannot be negative']
  },
  lastTransactionDate: {
    type: Date
  },
  openedDate: {
    type: Date,
    default: Date.now
  },
  closedDate: {
    type: Date
  },
  branch: {
    type: String,
    required: true
  },
  accountManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Virtual for account status
accountSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Virtual for available balance (considering minimum balance)
accountSchema.virtual('availableBalance').get(function() {
  return Math.max(0, this.balance - this.minimumBalance);
});

// Virtual for account age in days
accountSchema.virtual('accountAge').get(function() {
  return Math.floor((Date.now() - this.openedDate) / (1000 * 60 * 60 * 24));
});

// Indexes
accountSchema.index({ accountNumber: 1 });
accountSchema.index({ owner: 1 });
accountSchema.index({ accountType: 1 });
accountSchema.index({ status: 1 });
accountSchema.index({ branch: 1 });

// Pre-save middleware to generate account number if not provided
accountSchema.pre('save', function(next) {
  if (!this.accountNumber) {
    // Generate a unique 16-digit account number
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.accountNumber = `IR${timestamp.slice(-8)}${random}`;
  }
  next();
});

// Instance method to check if transaction is allowed
accountSchema.methods.canTransact = function(amount) {
  if (this.status !== 'active') {
    return { allowed: false, reason: 'Account is not active' };
  }
  
  if (this.balance + amount < this.minimumBalance) {
    return { allowed: false, reason: 'Transaction would violate minimum balance requirement' };
  }
  
  return { allowed: true };
};

// Instance method to update balance
accountSchema.methods.updateBalance = function(amount) {
  this.balance += amount;
  this.lastTransactionDate = new Date();
  return this.save();
};

// Static method to find by account number
accountSchema.statics.findByAccountNumber = function(accountNumber) {
  return this.findOne({ accountNumber });
};

// Static method to find active accounts by owner
accountSchema.statics.findActiveByOwner = function(ownerId) {
  return this.find({ owner: ownerId, status: 'active' });
};

// Static method to calculate total balance for a user
accountSchema.statics.calculateTotalBalance = async function(ownerId) {
  const accounts = await this.find({ owner: ownerId, status: 'active' });
  return accounts.reduce((total, account) => total + account.balance, 0);
};

module.exports = mongoose.model('Account', accountSchema);