const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'خطا در اعتبارسنجی داده‌ها',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('نام باید بین 2 تا 50 کاراکتر باشد'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('نام خانوادگی باید بین 2 تا 50 کاراکتر باشد'),
  body('nationalId')
    .isLength({ min: 10, max: 10 })
    .matches(/^\d{10}$/)
    .withMessage('کد ملی باید دقیقاً 10 رقم باشد'),
  body('phone')
    .matches(/^09\d{9}$/)
    .withMessage('شماره تلفن باید با 09 شروع شود و 11 رقم باشد'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('ایمیل معتبر نیست'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('رمز عبور باید حداقل 8 کاراکتر و شامل حروف بزرگ، کوچک، اعداد و کاراکترهای خاص باشد'),
  body('dateOfBirth')
    .isISO8601()
    .withMessage('تاریخ تولد معتبر نیست'),
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('ایمیل معتبر نیست'),
  body('password')
    .notEmpty()
    .withMessage('رمز عبور الزامی است'),
  handleValidationErrors
];

// Account creation validation
const validateAccountCreation = [
  body('accountType')
    .isIn(['جاری', 'قرض‌الحسنه', 'سپرده', 'سرمایه‌گذاری'])
    .withMessage('نوع حساب معتبر نیست'),
  body('currency')
    .optional()
    .isIn(['IRR', 'USD', 'EUR'])
    .withMessage('ارز معتبر نیست'),
  handleValidationErrors
];

// Transaction validation
const validateTransaction = [
  body('toAccount')
    .isMongoId()
    .withMessage('شناسه حساب مقصد معتبر نیست'),
  body('amount')
    .isFloat({ min: 1000 })
    .withMessage('مبلغ باید حداقل 1000 ریال باشد'),
  body('transactionType')
    .isIn(['انتقال', 'برداشت', 'واریز', 'پرداخت قبوض', 'خرید شارژ'])
    .withMessage('نوع تراکنش معتبر نیست'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('توضیحات نمی‌تواند بیشتر از 200 کاراکتر باشد'),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateAccountCreation,
  validateTransaction,
  handleValidationErrors
};