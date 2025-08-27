/**
 * سرویس تولید شماره کارت بانکی
 * Banking Card Number Generator Service
 */

const crypto = require('crypto');

class CardNumberGenerator {
  constructor() {
    this.commonPINs = [
      '0000', '1111', '2222', '3333', '4444', '5555',
      '6666', '7777', '8888', '9999', '1234', '4321',
      '0123', '3210', '1111', '2222', '3333', '4444'
    ];
  }

  /**
   * تولید شماره کارت کامل
   * Generate complete card number
   */
  generateCardNumber(binProfile, options = {}) {
    try {
      // استخراج BIN از پروفایل
      const bin = this.extractBIN(binProfile.bin_range);
      
      // تولید شماره حساب
      const accountNumber = this.generateAccountNumber(options.accountNumber);
      
      // ترکیب BIN و شماره حساب
      const partialNumber = bin + accountNumber;
      
      // تولید رقم کنترل Luhn
      const checkDigit = this.calculateLuhnCheckDigit(partialNumber);
      
      // شماره کارت کامل
      const cardNumber = partialNumber + checkDigit;
      
      // اعتبارسنجی نهایی
      if (!this.validateLuhn(cardNumber)) {
        throw new Error('شماره کارت تولید شده معتبر نیست');
      }
      
      return {
        cardNumber: cardNumber,
        bin: bin,
        accountNumber: accountNumber,
        checkDigit: checkDigit,
        formatted: this.formatCardNumber(cardNumber),
        binProfile: binProfile
      };
      
    } catch (error) {
      console.error('خطا در تولید شماره کارت:', error);
      throw error;
    }
  }

  /**
   * استخراج BIN از محدوده
   * Extract BIN from range
   */
  extractBIN(binRange) {
    if (!binRange || typeof binRange !== 'string') {
      throw new Error('محدوده BIN نامعتبر است');
    }
    
    const parts = binRange.split('-');
    if (parts.length !== 2) {
      throw new Error('فرمت محدوده BIN نامعتبر است');
    }
    
    const bin = parts[0];
    if (bin.length !== 6) {
      throw new Error('طول BIN باید 6 رقم باشد');
    }
    
    if (!/^\d{6}$/.test(bin)) {
      throw new Error('BIN باید فقط شامل اعداد باشد');
    }
    
    return bin;
  }

  /**
   * تولید شماره حساب
   * Generate account number
   */
  generateAccountNumber(existingAccountNumber = null) {
    if (existingAccountNumber) {
      // استفاده از شماره حساب موجود
      return existingAccountNumber.toString().padStart(9, '0');
    }
    
    // تولید شماره حساب تصادفی 9 رقمی
    let accountNumber = '';
    for (let i = 0; i < 9; i++) {
      accountNumber += Math.floor(Math.random() * 10);
    }
    
    return accountNumber;
  }

  /**
   * محاسبه رقم کنترل Luhn
   * Calculate Luhn check digit
   */
  calculateLuhnCheckDigit(number) {
    if (!number || typeof number !== 'string') {
      throw new Error('شماره ورودی نامعتبر است');
    }
    
    let sum = 0;
    let isEven = false;
    
    // محاسبه از راست به چپ
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
  }

  /**
   * اعتبارسنجی شماره کارت با الگوریتم Luhn
   * Validate card number using Luhn algorithm
   */
  validateLuhn(cardNumber) {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return false;
    }
    
    if (!/^\d+$/.test(cardNumber)) {
      return false;
    }
    
    if (cardNumber.length < 13 || cardNumber.length > 19) {
      return false;
    }
    
    // حذف آخرین رقم (رقم کنترل)
    const numberWithoutCheckDigit = cardNumber.slice(0, -1);
    
    // محاسبه رقم کنترل
    const calculatedCheckDigit = this.calculateLuhnCheckDigit(numberWithoutCheckDigit);
    
    // مقایسه با رقم کنترل موجود
    const actualCheckDigit = parseInt(cardNumber.slice(-1));
    
    return calculatedCheckDigit === actualCheckDigit;
  }

  /**
   * فرمت کردن شماره کارت
   * Format card number
   */
  formatCardNumber(cardNumber) {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return cardNumber;
    }
    
    // حذف فاصله‌ها و خط‌ها
    const cleanNumber = cardNumber.replace(/[\s-]/g, '');
    
    // فرمت کردن به صورت XXXX-XXXX-XXXX-XXXX
    const formatted = cleanNumber.replace(/(\d{4})(?=\d)/g, '$1-');
    
    return formatted;
  }

  /**
   * تولید شماره کارت با محدودیت‌های خاص
   * Generate card number with specific constraints
   */
  generateCardNumberWithConstraints(binProfile, constraints = {}) {
    try {
      let attempts = 0;
      const maxAttempts = 1000;
      
      while (attempts < maxAttempts) {
        attempts++;
        
        // تولید شماره کارت
        const result = this.generateCardNumber(binProfile, constraints);
        
        // بررسی محدودیت‌ها
        if (this.checkConstraints(result, constraints)) {
          return result;
        }
      }
      
      throw new Error('نمی‌توان شماره کارت با محدودیت‌های مشخص شده تولید کرد');
      
    } catch (error) {
      console.error('خطا در تولید شماره کارت با محدودیت:', error);
      throw error;
    }
  }

  /**
   * بررسی محدودیت‌های شماره کارت
   * Check card number constraints
   */
  checkConstraints(cardResult, constraints) {
    // بررسی طول شماره کارت
    if (constraints.length && cardResult.cardNumber.length !== constraints.length) {
      return false;
    }
    
    // بررسی الگوهای خاص
    if (constraints.pattern && !constraints.pattern.test(cardResult.cardNumber)) {
      return false;
    }
    
    // بررسی اعداد ممنوع
    if (constraints.forbiddenNumbers && constraints.forbiddenNumbers.includes(cardResult.cardNumber)) {
      return false;
    }
    
    // بررسی محدودیت‌های BIN
    if (constraints.binConstraints) {
      if (constraints.binConstraints.issuer && cardResult.binProfile.issuer_name !== constraints.binConstraints.issuer) {
        return false;
      }
      
      if (constraints.binConstraints.network && cardResult.binProfile.domestic_network !== constraints.binConstraints.network) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * تولید شماره کارت برای بانک خاص
   * Generate card number for specific bank
   */
  generateBankCard(bankName, cardType = 'DEBIT', options = {}) {
    try {
      // یافتن پروفایل بانک
      const bankProfile = this.findBankProfile(bankName, cardType);
      
      if (!bankProfile) {
        throw new Error(`پروفایل برای بانک ${bankName} و نوع ${cardType} یافت نشد`);
      }
      
      // تولید شماره کارت
      const result = this.generateCardNumber(bankProfile, options);
      
      // اضافه کردن اطلاعات بانک
      result.bankName = bankName;
      result.cardType = cardType;
      result.bankCode = bankProfile.bank_code;
      
      return result;
      
    } catch (error) {
      console.error('خطا در تولید کارت بانک:', error);
      throw error;
    }
  }

  /**
   * یافتن پروفایل بانک
   * Find bank profile
   */
  findBankProfile(bankName, cardType) {
    // این تابع باید از فایل کانفیگ BIN خوانده شود
    // فعلاً برای تست، یک پروفایل نمونه برمی‌گردانیم
    
    const sampleProfiles = {
      'بانک ملی ایران': {
        bin_range: '603799-603799',
        bank_code: '010',
        product_type: 'DEBIT',
        domestic_network: 'SHETAB',
        international_scheme: 'VISA'
      },
      'بانک صادرات ایران': {
        bin_range: '603769-603769',
        bank_code: '020',
        product_type: 'DEBIT',
        domestic_network: 'SHETAB',
        international_scheme: 'MASTERCARD'
      },
      'بانک پارسیان': {
        bin_range: '622106-622106',
        bank_code: '054',
        product_type: 'DEBIT',
        domestic_network: 'SHETAB',
        international_scheme: 'VISA'
      }
    };
    
    return sampleProfiles[bankName];
  }

  /**
   * تولید شماره کارت تصادفی
   * Generate random card number
   */
  generateRandomCardNumber(length = 16) {
    try {
      if (length < 13 || length > 19) {
        throw new Error('طول شماره کارت باید بین 13 تا 19 رقم باشد');
      }
      
      // تولید اعداد تصادفی
      let cardNumber = '';
      for (let i = 0; i < length - 1; i++) {
        cardNumber += Math.floor(Math.random() * 10);
      }
      
      // اضافه کردن رقم کنترل Luhn
      const checkDigit = this.calculateLuhnCheckDigit(cardNumber);
      cardNumber += checkDigit;
      
      return {
        cardNumber: cardNumber,
        formatted: this.formatCardNumber(cardNumber),
        length: cardNumber.length,
        valid: this.validateLuhn(cardNumber)
      };
      
    } catch (error) {
      console.error('خطا در تولید شماره کارت تصادفی:', error);
      throw error;
    }
  }

  /**
   * تولید شماره کارت‌های متعدد
   * Generate multiple card numbers
   */
  generateMultipleCards(binProfile, count = 1, options = {}) {
    try {
      if (count < 1 || count > 1000) {
        throw new Error('تعداد کارت‌ها باید بین 1 تا 1000 باشد');
      }
      
      const cards = [];
      
      for (let i = 0; i < count; i++) {
        const card = this.generateCardNumber(binProfile, options);
        cards.push(card);
      }
      
      return {
        count: count,
        cards: cards,
        generatedAt: new Date()
      };
      
    } catch (error) {
      console.error('خطا در تولید کارت‌های متعدد:', error);
      throw error;
    }
  }

  /**
   * بررسی اعتبار شماره کارت
   * Validate card number
   */
  validateCard(cardNumber) {
    try {
      if (!cardNumber) {
        return { valid: false, error: 'شماره کارت خالی است' };
      }
      
      // پاک کردن شماره کارت
      const cleanNumber = cardNumber.toString().replace(/[\s-]/g, '');
      
      // بررسی طول
      if (cleanNumber.length < 13 || cleanNumber.length > 19) {
        return { valid: false, error: 'طول شماره کارت نامعتبر است' };
      }
      
      // بررسی فرمت
      if (!/^\d+$/.test(cleanNumber)) {
        return { valid: false, error: 'شماره کارت باید فقط شامل اعداد باشد' };
      }
      
      // اعتبارسنجی Luhn
      const luhnValid = this.validateLuhn(cleanNumber);
      
      if (!luhnValid) {
        return { valid: false, error: 'شماره کارت از نظر الگوریتم Luhn نامعتبر است' };
      }
      
      // استخراج اطلاعات
      const bin = cleanNumber.substring(0, 6);
      const accountNumber = cleanNumber.substring(6, cleanNumber.length - 1);
      const checkDigit = cleanNumber.substring(cleanNumber.length - 1);
      
      return {
        valid: true,
        cardNumber: cleanNumber,
        formatted: this.formatCardNumber(cleanNumber),
        bin: bin,
        accountNumber: accountNumber,
        checkDigit: checkDigit,
        length: cleanNumber.length
      };
      
    } catch (error) {
      console.error('خطا در اعتبارسنجی کارت:', error);
      return { valid: false, error: error.message };
    }
  }
}

module.exports = CardNumberGenerator;