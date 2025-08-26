const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    required: true,
    unique: true,
    length: [16, 'شماره حساب باید 16 رقم باشد'],
    match: [/^\d{16}$/, 'شماره حساب باید فقط شامل اعداد باشد']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountType: {
    type: String,
    enum: ['جاری', 'قرض‌الحسنه', 'سپرده', 'سرمایه‌گذاری'],
    required: true
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'موجودی نمی‌تواند منفی باشد']
  },
  currency: {
    type: String,
    enum: ['IRR', 'USD', 'EUR'],
    default: 'IRR'
  },
  status: {
    type: String,
    enum: ['فعال', 'غیرفعال', 'مسدود', 'بسته'],
    default: 'فعال'
  },
  interestRate: {
    type: Number,
    default: 0,
    min: [0, 'نرخ سود نمی‌تواند منفی باشد'],
    max: [100, 'نرخ سود نمی‌تواند بیشتر از 100% باشد']
  },
  openingDate: {
    type: Date,
    default: Date.now
  },
  lastTransactionDate: {
    type: Date
  },
  dailyLimit: {
    type: Number,
    default: 10000000 // 10 million IRR
  },
  monthlyLimit: {
    type: Number,
    default: 100000000 // 100 million IRR
  }
}, {
  timestamps: true
});

// Generate account number
accountSchema.pre('save', function(next) {
  if (this.isNew && !this.accountNumber) {
    // Generate 16-digit account number
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.accountNumber = timestamp.slice(-12) + random;
  }
  next();
});

// Update last transaction date
accountSchema.methods.updateLastTransaction = function() {
  this.lastTransactionDate = new Date();
  return this.save();
};

module.exports = mongoose.model('Account', accountSchema);