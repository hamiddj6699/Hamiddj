const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'دسترسی غیرمجاز. توکن احراز هویت ارائه نشده است.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'کاربر یافت نشد.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'حساب کاربری شما غیرفعال شده است.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'توکن نامعتبر است.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'توکن منقضی شده است. لطفاً دوباره وارد شوید.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'خطا در احراز هویت.'
    });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {});
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'دسترسی غیرمجاز. فقط مدیران می‌توانند به این بخش دسترسی داشته باشند.'
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { auth, adminAuth };