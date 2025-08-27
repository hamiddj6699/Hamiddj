/**
 * مدل واقعی کارت بانکی
 * Real Banking Card Model
 */

const mongoose = require('mongoose');

const realCardSchema = new mongoose.Schema({
  // اطلاعات اصلی کارت
  cardNumber: {
    type: String,
    required: true,
    unique: true,
    length: 16,
    validate: {
      validator: function(v) {
        return /^\d{16}$/.test(v);
      },
      message: 'شماره کارت باید 16 رقم باشد'
    }
  },
  
  // اطلاعات BIN
  bin: {
    code: {
      type: String,
      required: true,
      length: 6
    },
    bankName: {
      type: String,
      required: true
    },
    bankCode: {
      type: String,
      required: true
    },
    productType: {
      type: String,
      enum: ['DEBIT', 'CREDIT', 'PREPAID', 'BUSINESS'],
      required: true
    },
    network: {
      type: String,
      enum: ['SHETAB', 'VISA', 'MASTERCARD', 'AMEX'],
      required: true
    },
    cardLevel: {
      type: String,
      enum: ['CLASSIC', 'GOLD', 'PLATINUM', 'INFINITE', 'BLACK'],
      required: true
    }
  },

  // اطلاعات امنیتی
  security: {
    pin: {
      type: String,
      required: true,
      select: false, // عدم نمایش در کوئری‌های عادی
      length: [4, 6]
    },
    pinHash: {
      type: String,
      required: true,
      select: false
    },
    cvv2: {
      type: String,
      required: true,
      select: false,
      length: 3
    },
    cvv2Hash: {
      type: String,
      required: true,
      select: false
    },
    pinAttempts: {
      type: Number,
      default: 0,
      max: 3
    },
    pinLockoutUntil: {
      type: Date,
      default: null
    },
    lastPinChange: {
      type: Date,
      default: Date.now
    }
  },

  // اطلاعات EMV
  emv: {
    aid: {
      type: String,
      required: true,
      default: 'A0000002480200'
    },
    applicationLabel: {
      type: String,
      required: true,
      default: 'IRAN DEBIT'
    },
    chipData: {
      type: String,
      required: true,
      select: false
    },
    publicKey: {
      type: String,
      required: true,
      select: false
    },
    certificate: {
      type: String,
      required: true,
      select: false
    }
  },

  // اطلاعات Track
  trackData: {
    track1: {
      type: String,
      required: true,
      select: false
    },
    track2: {
      type: String,
      required: true,
      select: false
    },
    track3: {
      type: String,
      select: false
    }
  },

  // اطلاعات مشتری
  customer: {
    fullName: {
      type: String,
      required: true
    },
    nationalId: {
      type: String,
      required: true,
      length: 10
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: false
    },
    address: {
      street: String,
      city: String,
      postalCode: String,
      country: {
        type: String,
        default: 'IR'
      }
    },
    dateOfBirth: {
      type: Date,
      required: false
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE'],
      required: false
    }
  },

  // اطلاعات حساب
  account: {
    accountNumber: {
      type: String,
      required: true,
      unique: true
    },
    accountType: {
      type: String,
      enum: ['CURRENT', 'SAVINGS', 'BUSINESS', 'INVESTMENT'],
      required: true
    },
    balance: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'IRR'
    },
    branchCode: {
      type: String,
      required: true
    },
    branchName: {
      type: String,
      required: true
    }
  },

  // اطلاعات کارت
  cardInfo: {
    cardType: {
      type: String,
      enum: ['DEBIT', 'CREDIT', 'PREPAID', 'BUSINESS'],
      required: true
    },
    cardBrand: {
      type: String,
      enum: ['VISA', 'MASTERCARD', 'AMEX', 'LOCAL'],
      required: true
    },
    cardArtwork: {
      type: String,
      required: true
    },
    cardMaterial: {
      type: String,
      enum: ['PLASTIC', 'METAL', 'COMPOSITE'],
      default: 'PLASTIC'
    },
    contactless: {
      type: Boolean,
      default: true
    },
    chipEnabled: {
      type: Boolean,
      default: true
    },
    magneticStripe: {
      type: Boolean,
      default: true
    }
  },

  // تاریخ‌ها
  dates: {
    issuedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    validFrom: {
      type: Date,
      required: true,
      default: Date.now
    },
    validTo: {
      type: Date,
      required: true
    },
    activatedAt: {
      type: Date,
      default: null
    },
    lastUsed: {
      type: Date,
      default: null
    }
  },

  // وضعیت کارت
  status: {
    current: {
      type: String,
      enum: ['ISSUED', 'ACTIVE', 'BLOCKED', 'EXPIRED', 'CANCELLED', 'LOST', 'STOLEN'],
      default: 'ISSUED'
    },
    previous: [{
      status: String,
      changedAt: Date,
      reason: String,
      operator: String
    }],
    lastStatusChange: {
      type: Date,
      default: Date.now
    }
  },

  // محدودیت‌ها
  limits: {
    dailyATM: {
      type: Number,
      required: true,
      default: 5000000
    },
    dailyPOS: {
      type: Number,
      required: true,
      default: 10000000
    },
    monthlyTotal: {
      type: Number,
      required: true,
      default: 100000000
    },
    singleMax: {
      type: Number,
      required: true,
      default: 1000000
    },
    contactlessLimit: {
      type: Number,
      default: 500000
    }
  },

  // کلیدهای امنیتی
  keys: {
    encKey: {
      type: String,
      required: true,
      select: false
    },
    macKey: {
      type: String,
      required: true,
      select: false
    },
    kek: {
      type: String,
      required: true,
      select: false
    },
    keyVersion: {
      type: String,
      required: true
    },
    keyExpiry: {
      type: Date,
      required: true
    }
  },

  // امضای دیجیتال
  digitalSignature: {
    signature: {
      type: String,
      required: true
    },
    algorithm: {
      type: String,
      default: 'HMAC-SHA256'
    },
    keyLabel: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      required: true
    }
  },

  // اطلاعات شبکه
  network: {
    shetabEnabled: {
      type: Boolean,
      default: true
    },
    internationalEnabled: {
      type: Boolean,
      default: true
    },
    onlineRequired: {
      type: Boolean,
      default: true
    },
    offlineLimit: {
      type: Number,
      default: 100000
    },
    fallbackEnabled: {
      type: Boolean,
      default: true
    }
  },

  // اطلاعات 3D Secure
  threeDSecure: {
    enabled: {
      type: Boolean,
      default: true
    },
    version: {
      type: String,
      enum: ['1.0', '2.0', '2.1'],
      default: '2.1'
    },
    profileId: {
      type: String,
      required: true
    }
  },

  // اطلاعات ریسک
  risk: {
    riskProfile: {
      type: String,
      required: true
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    fraudFlags: [{
      flag: String,
      severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
      },
      description: String,
      flaggedAt: Date
    }]
  },

  // لاگ عملیات
  operations: [{
    type: {
      type: String,
      enum: ['ISSUED', 'ACTIVATED', 'BLOCKED', 'UNBLOCKED', 'PIN_CHANGED', 'LIMITS_UPDATED', 'STATUS_CHANGED']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    operator: {
      id: String,
      name: String,
      role: String
    },
    details: String,
    ipAddress: String,
    userAgent: String
  }],

  // متادیتا
  metadata: {
    generatedBy: {
      type: String,
      default: 'RealCardIssuance'
    },
    version: {
      type: String,
      default: '1.0.0'
    },
    source: {
      type: String,
      default: 'BANKING_SYSTEM'
    },
    tags: [String],
    notes: String
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      // حذف فیلدهای حساس در JSON
      delete ret.security.pin;
      delete ret.security.pinHash;
      delete ret.security.cvv2;
      delete ret.security.cvv2Hash;
      delete ret.emv.chipData;
      delete ret.emv.publicKey;
      delete ret.emv.certificate;
      delete ret.trackData;
      delete ret.keys;
      return ret;
    }
  }
});

// ایندکس‌ها
realCardSchema.index({ cardNumber: 1 });
realCardSchema.index({ 'customer.nationalId': 1 });
realCardSchema.index({ 'account.accountNumber': 1 });
realCardSchema.index({ 'bin.bankCode': 1 });
realCardSchema.index({ status: 1 });
realCardSchema.index({ 'dates.validTo': 1 });
realCardSchema.index({ createdAt: 1 });

// متدهای استاتیک
realCardSchema.statics.findByCardNumber = function(cardNumber) {
  return this.findOne({ cardNumber: cardNumber });
};

realCardSchema.statics.findByNationalId = function(nationalId) {
  return this.find({ 'customer.nationalId': nationalId });
};

realCardSchema.statics.findByAccountNumber = function(accountNumber) {
  return this.findOne({ 'account.accountNumber': accountNumber });
};

realCardSchema.statics.findByBankCode = function(bankCode) {
  return this.find({ 'bin.bankCode': bankCode });
};

realCardSchema.statics.findActiveCards = function() {
  return this.find({ 'status.current': 'ACTIVE' });
};

realCardSchema.statics.findExpiredCards = function() {
  return this.find({ 'dates.validTo': { $lt: new Date() } });
};

// متدهای نمونه
realCardSchema.methods.isActive = function() {
  return this.status.current === 'ACTIVE';
};

realCardSchema.methods.isExpired = function() {
  return new Date() > this.dates.validTo;
};

realCardSchema.methods.canUse = function() {
  return this.isActive() && !this.isExpired() && this.security.pinAttempts < 3;
};

realCardSchema.methods.blockCard = function(reason, operator) {
  this.status.previous.push({
    status: this.status.current,
    changedAt: new Date(),
    reason: 'Status change',
    operator: 'System'
  });
  
  this.status.current = 'BLOCKED';
  this.status.lastStatusChange = new Date();
  
  this.operations.push({
    type: 'BLOCKED',
    operator: operator,
    details: reason,
    timestamp: new Date()
  });
  
  return this.save();
};

realCardSchema.methods.unblockCard = function(operator) {
  this.status.previous.push({
    status: this.status.current,
    changedAt: new Date(),
    reason: 'Status change',
    operator: 'System'
  });
  
  this.status.current = 'ACTIVE';
  this.status.lastStatusChange = new Date();
  
  this.operations.push({
    type: 'UNBLOCKED',
    operator: operator,
    details: 'Card unblocked',
    timestamp: new Date()
  });
  
  return this.save();
};

realCardSchema.methods.changePin = function(newPin, operator) {
  this.security.pin = newPin;
  this.security.pinHash = require('crypto').createHash('sha256').update(newPin).digest('hex');
  this.security.lastPinChange = new Date();
  this.security.pinAttempts = 0;
  this.security.pinLockoutUntil = null;
  
  this.operations.push({
    type: 'PIN_CHANGED',
    operator: operator,
    details: 'PIN changed successfully',
    timestamp: new Date()
  });
  
  return this.save();
};

realCardSchema.methods.recordPinAttempt = function(success) {
  if (success) {
    this.security.pinAttempts = 0;
    this.security.pinLockoutUntil = null;
  } else {
    this.security.pinAttempts += 1;
    if (this.security.pinAttempts >= 3) {
      this.security.pinLockoutUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ساعت
      this.status.current = 'BLOCKED';
    }
  }
  
  return this.save();
};

// Pre-save middleware
realCardSchema.pre('save', function(next) {
  // تولید شماره کارت اگر وجود نداشته باشد
  if (!this.cardNumber) {
    this.generateCardNumber();
  }
  
  // تولید تاریخ انقضا اگر وجود نداشته باشد
  if (!this.dates.validTo) {
    this.dates.validTo = new Date(Date.now() + 4 * 365 * 24 * 60 * 60 * 1000); // 4 سال
  }
  
  // تولید کلیدهای امنیتی اگر وجود نداشته باشند
  if (!this.keys.encKey) {
    this.generateSecurityKeys();
  }
  
  next();
});

// متد تولید شماره کارت
realCardSchema.methods.generateCardNumber = function() {
  const bin = this.bin.code;
  const accountNumber = Math.random().toString().slice(2, 11);
  const checkDigit = this.calculateLuhnCheckDigit(bin + accountNumber);
  this.cardNumber = bin + accountNumber + checkDigit;
};

// متد محاسبه رقم کنترل Luhn
realCardSchema.methods.calculateLuhnCheckDigit = function(number) {
  let sum = 0;
  let isEven = false;
  
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return (10 - (sum % 10)) % 10;
};

// متد تولید کلیدهای امنیتی
realCardSchema.methods.generateSecurityKeys = function() {
  const crypto = require('crypto');
  
  this.keys.encKey = crypto.randomBytes(32).toString('hex');
  this.keys.macKey = crypto.randomBytes(32).toString('hex');
  this.keys.kek = crypto.randomBytes(32).toString('hex');
  this.keys.keyVersion = '1.0';
  this.keys.keyExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 سال
};

module.exports = mongoose.model('RealCard', realCardSchema);