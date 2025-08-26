const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  fromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [1000, 'مبلغ تراکنش باید حداقل 1000 ریال باشد']
  },
  currency: {
    type: String,
    enum: ['IRR', 'USD', 'EUR'],
    default: 'IRR'
  },
  transactionType: {
    type: String,
    enum: ['انتقال', 'برداشت', 'واریز', 'پرداخت قبوض', 'خرید شارژ'],
    required: true
  },
  status: {
    type: String,
    enum: ['در حال پردازش', 'موفق', 'ناموفق', 'لغو شده'],
    default: 'در حال پردازش'
  },
  description: {
    type: String,
    maxlength: [200, 'توضیحات نمی‌تواند بیشتر از 200 کاراکتر باشد']
  },
  fee: {
    type: Number,
    default: 0
  },
  referenceNumber: {
    type: String,
    unique: true
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate transaction ID
transactionSchema.pre('save', function(next) {
  if (this.isNew && !this.transactionId) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    this.transactionId = `TXN${timestamp.slice(-8)}${random}`;
  }
  
  if (this.isNew && !this.referenceNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.referenceNumber = `REF${timestamp.slice(-6)}${random}`;
  }
  
  next();
});

// Update processed time when status changes to successful
transactionSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'موفق' && !this.processedAt) {
    this.processedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);