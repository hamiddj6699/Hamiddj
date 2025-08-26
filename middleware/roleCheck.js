/**
 * میدلور بررسی نقش کاربر
 * Role Checking Middleware
 */

/**
 * بررسی نقش کاربر
 * @param {string[]} allowedRoles - نقش‌های مجاز
 * @returns {Function} میدلور Express
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // بررسی وجود کاربر
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'احراز هویت الزامی است'
        });
      }

      // بررسی نقش کاربر
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'شما مجوز دسترسی به این عملیات را ندارید',
          requiredRoles: allowedRoles,
          userRole: req.user.role
        });
      }

      // بررسی فعال بودن کاربر
      if (!req.user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'حساب کاربری شما غیرفعال است'
        });
      }

      // بررسی انقضای جلسه
      if (req.user.lastLogin && req.user.lastLogin < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        return res.status(401).json({
          success: false,
          message: 'جلسه شما منقضی شده است. لطفاً مجدداً وارد شوید'
        });
      }

      next();
    } catch (error) {
      console.error('Error in role checking middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'خطا در بررسی مجوزها'
      });
    }
  };
};

/**
 * بررسی نقش مدیر
 */
const requireAdmin = requireRole(['admin']);

/**
 * بررسی نقش کارمند یا مدیر
 */
const requireStaff = requireRole(['staff', 'admin']);

/**
 * بررسی نقش کاربر عادی
 */
const requireUser = requireRole(['user', 'staff', 'admin']);

/**
 * بررسی نقش خاص
 */
const requireSpecificRole = (role) => requireRole([role]);

/**
 * بررسی دسترسی به شعبه خاص
 */
const requireBranchAccess = (branchId) => {
  return (req, res, next) => {
    try {
      // بررسی وجود کاربر
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'احراز هویت الزامی است'
        });
      }

      // مدیران به تمام شعب دسترسی دارند
      if (req.user.role === 'admin') {
        return next();
      }

      // بررسی دسترسی کارمند به شعبه
      if (req.user.role === 'staff') {
        if (req.user.branch && req.user.branch.toString() === branchId.toString()) {
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        message: 'شما مجوز دسترسی به این شعبه را ندارید'
      });

    } catch (error) {
      console.error('Error in branch access middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'خطا در بررسی دسترسی به شعبه'
      });
    }
  };
};

/**
 * بررسی دسترسی به عملیات حساس
 */
const requireSensitiveOperationAccess = () => {
  return (req, res, next) => {
    try {
      // بررسی وجود کاربر
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'احراز هویت الزامی است'
        });
      }

      // بررسی نقش کاربر
      if (!['admin', 'staff'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'شما مجوز انجام این عملیات حساس را ندارید'
        });
      }

      // بررسی تایید دو مرحله‌ای برای عملیات حساس
      if (req.user.requireTwoFactor && !req.body.twoFactorCode) {
        return res.status(403).json({
          success: false,
          message: 'کد تایید دو مرحله‌ای الزامی است'
        });
      }

      // بررسی محدودیت زمانی برای عملیات حساس
      const now = new Date();
      const hour = now.getHours();
      
      // عملیات حساس فقط در ساعات کاری (8 صبح تا 6 عصر)
      if (hour < 8 || hour >= 18) {
        if (req.user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'عملیات حساس فقط در ساعات کاری مجاز است'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Error in sensitive operation middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'خطا در بررسی دسترسی به عملیات حساس'
      });
    }
  };
};

/**
 * بررسی دسترسی به عملیات اضطراری
 */
const requireEmergencyAccess = () => {
  return (req, res, next) => {
    try {
      // بررسی وجود کاربر
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'احراز هویت الزامی است'
        });
      }

      // فقط مدیران می‌توانند عملیات اضطراری انجام دهند
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'فقط مدیران می‌توانند عملیات اضطراری انجام دهند'
        });
      }

      // بررسی دلیل اضطراری
      if (!req.body.emergencyReason || req.body.emergencyReason.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'دلیل اضطراری باید حداقل 10 کاراکتر باشد'
        });
      }

      // ثبت عملیات اضطراری
      console.log(`EMERGENCY OPERATION: ${req.user.nationalId} - ${req.body.emergencyReason}`);

      next();
    } catch (error) {
      console.error('Error in emergency access middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'خطا در بررسی دسترسی به عملیات اضطراری'
      });
    }
  };
};

/**
 * بررسی دسترسی به گزارش‌ها
 */
const requireReportAccess = (reportType) => {
  return (req, res, next) => {
    try {
      // بررسی وجود کاربر
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'احراز هویت الزامی است'
        });
      }

      // بررسی نقش کاربر
      if (!['admin', 'staff'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'شما مجوز مشاهده گزارش‌ها را ندارید'
        });
      }

      // بررسی نوع گزارش
      const allowedReports = {
        'admin': ['all', 'security', 'financial', 'operational', 'audit'],
        'staff': ['operational', 'customer']
      };

      const userAllowedReports = allowedReports[req.user.role] || [];
      
      if (!userAllowedReports.includes('all') && !userAllowedReports.includes(reportType)) {
        return res.status(403).json({
          success: false,
          message: `شما مجوز مشاهده گزارش ${reportType} را ندارید`
        });
      }

      next();
    } catch (error) {
      console.error('Error in report access middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'خطا در بررسی دسترسی به گزارش'
      });
    }
  };
};

module.exports = {
  requireRole,
  requireAdmin,
  requireStaff,
  requireUser,
  requireSpecificRole,
  requireBranchAccess,
  requireSensitiveOperationAccess,
  requireEmergencyAccess,
  requireReportAccess
};