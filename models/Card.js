const mongoose = require('mongoose');
const crypto = require('crypto');

const cardSchema = new mongoose.Schema({
  // Basic card information
  cardNumber: {
    type: String,
    required: true,
    unique: true,
    length: [16, 'شماره کارت باید 16 رقم باشد'],
    match: [/^\d{16}$/, 'شماره کارت باید فقط شامل اعداد باشد']
  },
  
  // Card holder information
  cardholderName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [26, 'نام صاحب کارت نمی‌تواند بیشتر از 26 کاراکتر باشد']
  },
  
  // Security information
  pin: {
    type: String,
    required: true,
    length: [4, 'رمز کارت باید 4 رقم باشد'],
    match: [/^\d{4}$/, 'رمز کارت باید فقط شامل اعداد باشد'],
    select: false // Don't include in queries by default
  },
  
  cvv2: {
    type: String,
    required: true,
    length: [3, 'CVV2 باید 3 رقم باشد'],
    match: [/^\d{3}$/, 'CVV2 باید فقط شامل اعداد باشد'],
    select: false
  },
  
  // Expiration information
  expiryMonth: {
    type: Number,
    required: true,
    min: [1, 'ماه انقضا باید بین 1 تا 12 باشد'],
    max: [12, 'ماه انقضا باید بین 1 تا 12 باشد']
  },
  
  expiryYear: {
    type: Number,
    required: true,
    min: [new Date().getFullYear(), 'سال انقضا نمی‌تواند کمتر از سال جاری باشد'],
    max: [new Date().getFullYear() + 10, 'سال انقضا نمی‌تواند بیشتر از 10 سال آینده باشد']
  },
  
  // Track data (ISO 7813 format)
  track1: {
    type: String,
    required: true,
    select: false // Sensitive data
  },
  
  track2: {
    type: String,
    required: true,
    select: false // Sensitive data
  },
  
  // Card type and network
  cardType: {
    type: String,
    enum: ['شتاب', 'ملی', 'پارسیان', 'ملت', 'تجارت', 'سامان', 'پاسارگاد', 'سپه', 'کشاورزی', 'صنعت و معدن'],
    required: true
  },
  
  cardNetwork: {
    type: String,
    enum: ['Visa', 'MasterCard', 'American Express', 'Discover', 'UnionPay'],
    required: true
  },
  
  // Account association
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Card status and limits
  status: {
    type: String,
    enum: ['فعال', 'غیرفعال', 'مسدود', 'منقضی', 'مفقود', 'سرقت'],
    default: 'فعال'
  },
  
  dailyLimit: {
    type: Number,
    default: 5000000, // 5 million IRR
    min: [0, 'حد روزانه نمی‌تواند منفی باشد']
  },
  
  monthlyLimit: {
    type: Number,
    default: 50000000, // 50 million IRR
    min: [0, 'حد ماهانه نمی‌تواند منفی باشد']
  },
  
  // Security features
  isChipEnabled: {
    type: Boolean,
    default: true
  },
  
  isContactlessEnabled: {
    type: Boolean,
    default: true
  },
  
  // Activation and usage tracking
  activationDate: {
    type: Date,
    default: Date.now
  },
  
  lastUsedDate: {
    type: Date
  },
  
  // PIN attempts tracking
  pinAttempts: {
    type: Number,
    default: 0,
    max: [3, 'حداکثر تلاش برای ورود رمز 3 بار است']
  },
  
  lastPinAttempt: {
    type: Date
  },
  
  // Card generation metadata
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  generationDate: {
    type: Date,
    default: Date.now
  },
  
  // Magnetic stripe data
  magneticStripeData: {
    type: String,
    select: false
  }
}, {
  timestamps: true
});

// Indexes for performance
cardSchema.index({ cardNumber: 1 });
cardSchema.index({ userId: 1 });
cardSchema.index({ accountId: 1 });
cardSchema.index({ status: 1 });
cardSchema.index({ expiryYear: 1, expiryMonth: 1 });

// Virtual for formatted expiry date
cardSchema.virtual('expiryDate').get(function() {
  return `${this.expiryMonth.toString().padStart(2, '0')}/${this.expiryYear}`;
});

// Virtual for masked card number
cardSchema.virtual('maskedCardNumber').get(function() {
  if (!this.cardNumber) return '';
  return this.cardNumber.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4');
});

// Virtual for masked card number (last 4 digits only)
cardSchema.virtual('lastFourDigits').get(function() {
  if (!this.cardNumber) return '';
  return this.cardNumber.slice(-4);
});

// Method to check if card is expired
cardSchema.methods.isExpired = function() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (this.expiryYear < currentYear) return true;
  if (this.expiryYear === currentYear && this.expiryMonth < currentMonth) return true;
  
  return false;
};

// Method to check if card is active
cardSchema.methods.isActive = function() {
  return this.status === 'فعال' && !this.isExpired();
};

// Method to update PIN attempts
cardSchema.methods.updatePinAttempts = function(success) {
  if (success) {
    this.pinAttempts = 0;
    this.lastPinAttempt = new Date();
  } else {
    this.pinAttempts += 1;
    this.lastPinAttempt = new Date();
    
    // Block card after 3 failed attempts
    if (this.pinAttempts >= 3) {
      this.status = 'مسدود';
    }
  }
  
  return this.save();
};

// Method to reset PIN attempts
cardSchema.methods.resetPinAttempts = function() {
  this.pinAttempts = 0;
  this.lastPinAttempt = new Date();
  return this.save();
};

// Method to get public card info (without sensitive data)
cardSchema.methods.getPublicInfo = function() {
  const cardObject = this.toObject();
  delete cardObject.pin;
  delete cardObject.cvv2;
  delete cardObject.track1;
  delete cardObject.track2;
  delete cardObject.magneticStripeData;
  return cardObject;
};

// Method to get full card info (for authorized users)
cardSchema.methods.getFullInfo = function() {
  const cardObject = this.toObject();
  delete cardObject.pin; // Never expose PIN
  return cardObject;
};

// Pre-save middleware to hash sensitive data
cardSchema.pre('save', function(next) {
  if (this.isModified('pin')) {
    this.pin = crypto.createHash('sha256').update(this.pin).digest('hex');
  }
  
  if (this.isModified('cvv2')) {
    this.cvv2 = crypto.createHash('sha256').update(this.cvv2).digest('hex');
  }
  
  next();
});

// Pre-save middleware to update status based on expiry
cardSchema.pre('save', function(next) {
  if (this.isExpired() && this.status === 'فعال') {
    this.status = 'منقضی';
  }
  next();
});

module.exports = mongoose.model('Card', cardSchema);