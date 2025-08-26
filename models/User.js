const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'نام الزامی است'],
    trim: true,
    maxlength: [50, 'نام نمی‌تواند بیشتر از 50 کاراکتر باشد']
  },
  lastName: {
    type: String,
    required: [true, 'نام خانوادگی الزامی است'],
    trim: true,
    maxlength: [50, 'نام خانوادگی نمی‌تواند بیشتر از 50 کاراکتر باشد']
  },
  nationalId: {
    type: String,
    required: [true, 'کد ملی الزامی است'],
    unique: true,
    length: [10, 'کد ملی باید 10 رقم باشد'],
    match: [/^\d{10}$/, 'کد ملی باید فقط شامل اعداد باشد']
  },
  phone: {
    type: String,
    required: [true, 'شماره تلفن الزامی است'],
    unique: true,
    match: [/^09\d{9}$/, 'شماره تلفن باید با 09 شروع شود و 11 رقم باشد']
  },
  email: {
    type: String,
    required: [true, 'ایمیل الزامی است'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'ایمیل معتبر نیست']
  },
  password: {
    type: String,
    required: [true, 'رمز عبور الزامی است'],
    minlength: [8, 'رمز عبور باید حداقل 8 کاراکتر باشد'],
    select: false
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'تاریخ تولد الزامی است']
  },
  address: {
    street: String,
    city: String,
    postalCode: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get user info without sensitive data
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);