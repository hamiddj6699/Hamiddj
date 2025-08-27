/**
 * سرویس تولید PIN امن برای کارت‌های بانکی
 * Secure PIN Generator for Banking Cards
 */

const crypto = require('crypto');

class SecurePINGenerator {
  constructor(pinPolicy = {}) {
    // سیاست‌های پیش‌فرض PIN
    this.defaultPolicy = {
      length: 4,
      allowRepeatedDigits: false,
      allowSequentialDigits: false,
      allowCommonPINs: false,
      maxAttempts: 3,
      lockoutDuration: 24, // ساعت
      requireComplexity: true,
      minComplexity: 2 // حداقل 2 نوع کاراکتر مختلف
    };
    
    // ترکیب سیاست‌های ورودی با پیش‌فرض
    this.policy = { ...this.defaultPolicy, ...pinPolicy };
    
    // PIN های رایج که باید اجتناب شوند
    this.commonPINs = [
      '0000', '1111', '2222', '3333', '4444', '5555',
      '6666', '7777', '8888', '9999', '1234', '4321',
      '0123', '3210', '1010', '2020', '3030', '4040',
      '5050', '6060', '7070', '8080', '9090', '1100',
      '2200', '3300', '4400', '5500', '6600', '7700',
      '8800', '9900', '0011', '0022', '0033', '0044',
      '0055', '0066', '0077', '0088', '0099', '1001',
      '2002', '3003', '4004', '5005', '6006', '7007',
      '8008', '9009', '1122', '2233', '3344', '4455',
      '5566', '6677', '7788', '8899', '9988', '8877',
      '7766', '6655', '5544', '4433', '3322', '2211'
    ];
    
    // الگوهای ترتیبی
    this.sequentialPatterns = [
      '0123', '1234', '2345', '3456', '4567', '5678', '6789',
      '3210', '4321', '5432', '6543', '7654', '8765', '9876',
      '0987', '1098', '2109', '3210', '4321', '5432', '6543'
    ];
  }

  /**
   * تولید PIN امن
   * Generate secure PIN
   */
  generateSecurePIN(options = {}) {
    try {
      // ترکیب گزینه‌های ورودی با سیاست
      const finalPolicy = { ...this.policy, ...options };
      
      let attempts = 0;
      const maxAttempts = 1000;
      
      while (attempts < maxAttempts) {
        attempts++;
        
        // تولید PIN تصادفی
        const pin = this.generateRandomPIN(finalPolicy);
        
        // اعتبارسنجی PIN
        if (this.isValidPIN(pin, finalPolicy)) {
          return {
            pin: pin,
            maskedPin: this.maskPIN(pin),
            policy: finalPolicy,
            generatedAt: new Date(),
            attempts: attempts
          };
        }
      }
      
      throw new Error('نمی‌توان PIN امن با سیاست‌های مشخص شده تولید کرد');
      
    } catch (error) {
      console.error('خطا در تولید PIN امن:', error);
      throw error;
    }
  }

  /**
   * تولید PIN تصادفی
   * Generate random PIN
   */
  generateRandomPIN(policy) {
    let pin = '';
    const length = policy.length || 4;
    
    // تولید اعداد تصادفی
    for (let i = 0; i < length; i++) {
      pin += Math.floor(Math.random() * 10);
    }
    
    return pin;
  }

  /**
   * اعتبارسنجی PIN
   * Validate PIN
   */
  isValidPIN(pin, policy) {
    try {
      if (!pin || typeof pin !== 'string') {
        return false;
      }
      
      const length = policy.length || 4;
      
      // بررسی طول
      if (pin.length !== length) {
        return false;
      }
      
      // بررسی فرمت (فقط اعداد)
      if (!/^\d+$/.test(pin)) {
        return false;
      }
      
      // بررسی تکرار اعداد
      if (!policy.allowRepeatedDigits) {
        const digits = new Set(pin);
        if (digits.size !== pin.length) {
          return false;
        }
      }
      
      // بررسی ترتیب اعداد
      if (!policy.allowSequentialDigits) {
        if (this.isSequential(pin)) {
          return false;
        }
      }
      
      // بررسی PIN های رایج
      if (!policy.allowCommonPINs) {
        if (this.commonPINs.includes(pin)) {
          return false;
        }
      }
      
      // بررسی پیچیدگی
      if (policy.requireComplexity) {
        if (!this.hasComplexity(pin, policy.minComplexity)) {
          return false;
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('خطا در اعتبارسنجی PIN:', error);
      return false;
    }
  }

  /**
   * بررسی ترتیبی بودن PIN
   * Check if PIN is sequential
   */
  isSequential(pin) {
    // بررسی الگوهای ترتیبی مستقیم
    for (const pattern of this.sequentialPatterns) {
      if (pin.includes(pattern)) {
        return true;
      }
    }
    
    // بررسی ترتیب صعودی
    let ascending = true;
    for (let i = 1; i < pin.length; i++) {
      if (parseInt(pin[i]) !== parseInt(pin[i-1]) + 1) {
        ascending = false;
        break;
      }
    }
    
    // بررسی ترتیب نزولی
    let descending = true;
    for (let i = 1; i < pin.length; i++) {
      if (parseInt(pin[i]) !== parseInt(pin[i-1]) - 1) {
        descending = false;
        break;
      }
    }
    
    return ascending || descending;
  }

  /**
   * بررسی پیچیدگی PIN
   * Check PIN complexity
   */
  hasComplexity(pin, minComplexity = 2) {
    const digits = pin.split('');
    const uniqueDigits = new Set(digits);
    
    // بررسی تنوع اعداد
    if (uniqueDigits.size < minComplexity) {
      return false;
    }
    
    // بررسی الگوهای پیچیده
    let complexity = 0;
    
    // تنوع اعداد
    if (uniqueDigits.size >= 3) complexity++;
    
    // عدم تکرار
    if (uniqueDigits.size === pin.length) complexity++;
    
    // عدم ترتیب
    if (!this.isSequential(pin)) complexity++;
    
    // اعداد مختلف
    const hasLow = digits.some(d => parseInt(d) < 5);
    const hasHigh = digits.some(d => parseInt(d) >= 5);
    if (hasLow && hasHigh) complexity++;
    
    return complexity >= minComplexity;
  }

  /**
   * ماسک کردن PIN
   * Mask PIN
   */
  maskPIN(pin) {
    if (!pin) return pin;
    
    const length = pin.length;
    if (length <= 2) {
      return '*'.repeat(length);
    }
    
    // نمایش اولین و آخرین رقم
    return pin[0] + '*'.repeat(length - 2) + pin[length - 1];
  }

  /**
   * تولید PIN با الگوریتم خاص
   * Generate PIN with specific algorithm
   */
  generatePINWithAlgorithm(algorithm, cardNumber, options = {}) {
    try {
      switch (algorithm.toLowerCase()) {
        case 'random':
          return this.generateSecurePIN(options);
          
        case 'hash_based':
          return this.generateHashBasedPIN(cardNumber, options);
          
        case 'pattern_based':
          return this.generatePatternBasedPIN(cardNumber, options);
          
        case 'time_based':
          return this.generateTimeBasedPIN(options);
          
        default:
          throw new Error(`الگوریتم ${algorithm} پشتیبانی نمی‌شود`);
      }
    } catch (error) {
      console.error('خطا در تولید PIN با الگوریتم:', error);
      throw error;
    }
  }

  /**
   * تولید PIN بر اساس هش
   * Generate hash-based PIN
   */
  generateHashBasedPIN(cardNumber, options = {}) {
    try {
      if (!cardNumber) {
        throw new Error('شماره کارت الزامی است');
      }
      
      // تولید هش از شماره کارت
      const hash = crypto.createHash('sha256').update(cardNumber).digest('hex');
      
      // استخراج اعداد از هش
      const numbers = hash.replace(/[^0-9]/g, '');
      
      // تولید PIN از اعداد هش
      const length = options.length || 4;
      let pin = '';
      
      for (let i = 0; i < length && i < numbers.length; i++) {
        pin += numbers[i];
      }
      
      // تکمیل PIN اگر کوتاه باشد
      while (pin.length < length) {
        pin += Math.floor(Math.random() * 10);
      }
      
      // اعتبارسنجی و تولید مجدد اگر نامعتبر باشد
      if (!this.isValidPIN(pin, options)) {
        return this.generateSecurePIN(options);
      }
      
      return {
        pin: pin,
        maskedPin: this.maskPIN(pin),
        algorithm: 'hash_based',
        source: 'card_number_hash',
        generatedAt: new Date()
      };
      
    } catch (error) {
      console.error('خطا در تولید PIN بر اساس هش:', error);
      throw error;
    }
  }

  /**
   * تولید PIN بر اساس الگو
   * Generate pattern-based PIN
   */
  generatePatternBasedPIN(cardNumber, options = {}) {
    try {
      if (!cardNumber) {
        throw new Error('شماره کارت الزامی است');
      }
      
      const length = options.length || 4;
      let pin = '';
      
      // استفاده از ارقام خاص شماره کارت
      const lastDigits = cardNumber.slice(-length);
      
      // تولید PIN بر اساس الگوی خاص
      for (let i = 0; i < length; i++) {
        const digit = parseInt(lastDigits[i]);
        let newDigit;
        
        // الگوی خاص: جمع با 5 و باقیمانده 10
        newDigit = (digit + 5) % 10;
        
        pin += newDigit;
      }
      
      // اعتبارسنجی و تولید مجدد اگر نامعتبر باشد
      if (!this.isValidPIN(pin, options)) {
        return this.generateSecurePIN(options);
      }
      
      return {
        pin: pin,
        maskedPin: this.maskPIN(pin),
        algorithm: 'pattern_based',
        source: 'card_number_pattern',
        generatedAt: new Date()
      };
      
    } catch (error) {
      console.error('خطا در تولید PIN بر اساس الگو:', error);
      throw error;
    }
  }

  /**
   * تولید PIN بر اساس زمان
   * Generate time-based PIN
   */
  generateTimeBasedPIN(options = {}) {
    try {
      const length = options.length || 4;
      const now = new Date();
      
      // استفاده از ثانیه و میلی‌ثانیه
      const seconds = now.getSeconds();
      const milliseconds = now.getMilliseconds();
      
      // تولید PIN از زمان
      let pin = '';
      const timeString = seconds.toString().padStart(2, '0') + 
                        (milliseconds % 100).toString().padStart(2, '0');
      
      for (let i = 0; i < length && i < timeString.length; i++) {
        pin += timeString[i];
      }
      
      // تکمیل PIN اگر کوتاه باشد
      while (pin.length < length) {
        pin += Math.floor(Math.random() * 10);
      }
      
      // اعتبارسنجی و تولید مجدد اگر نامعتبر باشد
      if (!this.isValidPIN(pin, options)) {
        return this.generateSecurePIN(options);
      }
      
      return {
        pin: pin,
        maskedPin: this.maskPIN(pin),
        algorithm: 'time_based',
        source: 'current_time',
        generatedAt: now
      };
      
    } catch (error) {
      console.error('خطا در تولید PIN بر اساس زمان:', error);
      throw error;
    }
  }

  /**
   * تولید PIN های متعدد
   * Generate multiple PINs
   */
  generateMultiplePINs(count = 1, options = {}) {
    try {
      if (count < 1 || count > 100) {
        throw new Error('تعداد PIN ها باید بین 1 تا 100 باشد');
      }
      
      const pins = [];
      
      for (let i = 0; i < count; i++) {
        const pin = this.generateSecurePIN(options);
        pins.push(pin);
      }
      
      return {
        count: count,
        pins: pins,
        generatedAt: new Date()
      };
      
    } catch (error) {
      console.error('خطا در تولید PIN های متعدد:', error);
      throw error;
    }
  }

  /**
   * بررسی امنیت PIN
   * Check PIN security
   */
  checkPINSecurity(pin) {
    try {
      if (!pin) {
        return { secure: false, score: 0, issues: ['PIN خالی است'] };
      }
      
      let score = 0;
      const issues = [];
      
      // بررسی طول
      if (pin.length >= 4) score += 10;
      if (pin.length >= 6) score += 10;
      if (pin.length >= 8) score += 10;
      
      // بررسی تنوع اعداد
      const uniqueDigits = new Set(pin);
      if (uniqueDigits.size >= 3) score += 15;
      if (uniqueDigits.size >= 5) score += 15;
      if (uniqueDigits.size === pin.length) score += 20;
      
      // بررسی عدم تکرار
      if (!this.isSequential(pin)) score += 15;
      
      // بررسی عدم ترتیب
      if (!this.commonPINs.includes(pin)) score += 15;
      
      // بررسی پیچیدگی
      if (this.hasComplexity(pin, 3)) score += 20;
      
      // تعیین سطح امنیت
      let securityLevel = 'ضعیف';
      if (score >= 80) securityLevel = 'عالی';
      else if (score >= 60) securityLevel = 'خوب';
      else if (score >= 40) securityLevel = 'متوسط';
      else if (score >= 20) securityLevel = 'ضعیف';
      
      return {
        secure: score >= 60,
        score: score,
        securityLevel: securityLevel,
        issues: issues,
        recommendations: this.getSecurityRecommendations(score)
      };
      
    } catch (error) {
      console.error('خطا در بررسی امنیت PIN:', error);
      return { secure: false, score: 0, issues: [error.message] };
    }
  }

  /**
   * دریافت توصیه‌های امنیتی
   * Get security recommendations
   */
  getSecurityRecommendations(score) {
    const recommendations = [];
    
    if (score < 40) {
      recommendations.push('PIN را طولانی‌تر کنید');
      recommendations.push('از اعداد تکراری استفاده نکنید');
      recommendations.push('از الگوهای ترتیبی اجتناب کنید');
    }
    
    if (score < 60) {
      recommendations.push('از اعداد مختلف استفاده کنید');
      recommendations.push('PIN های رایج را انتخاب نکنید');
    }
    
    if (score < 80) {
      recommendations.push('PIN را به 6 رقم افزایش دهید');
      recommendations.push('از ترکیب اعداد مختلف استفاده کنید');
    }
    
    return recommendations;
  }

  /**
   * تولید PIN برای کارت خاص
   * Generate PIN for specific card
   */
  generateCardPIN(cardNumber, cardType = 'DEBIT', options = {}) {
    try {
      if (!cardNumber) {
        throw new Error('شماره کارت الزامی است');
      }
      
      // تنظیم سیاست بر اساس نوع کارت
      const cardPolicy = this.getCardTypePolicy(cardType);
      const finalPolicy = { ...this.policy, ...cardPolicy, ...options };
      
      // تولید PIN
      const pin = this.generateSecurePIN(finalPolicy);
      
      // اضافه کردن اطلاعات کارت
      pin.cardNumber = cardNumber;
      pin.cardType = cardType;
      pin.policy = finalPolicy;
      
      return pin;
      
    } catch (error) {
      console.error('خطا در تولید PIN کارت:', error);
      throw error;
    }
  }

  /**
   * دریافت سیاست نوع کارت
   * Get card type policy
   */
  getCardTypePolicy(cardType) {
    const policies = {
      'DEBIT': {
        length: 4,
        maxAttempts: 3,
        lockoutDuration: 24
      },
      'CREDIT': {
        length: 4,
        maxAttempts: 3,
        lockoutDuration: 48
      },
      'PREPAID': {
        length: 4,
        maxAttempts: 2,
        lockoutDuration: 12
      },
      'BUSINESS': {
        length: 6,
        maxAttempts: 3,
        lockoutDuration: 24
      }
    };
    
    return policies[cardType] || policies['DEBIT'];
  }
}

module.exports = SecurePINGenerator;