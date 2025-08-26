const Card = require('../models/Card');
const BankConnection = require('./bankConnection');
const OperationLog = require('../models/OperationLog');

/**
 * سرویس مدیریت کارت‌های موجود
 * Existing Card Management Service
 */
class CardManagement {
  constructor() {
    this.bankConnection = new BankConnection();
  }

  /**
   * مشاهده کارت‌های مشتری
   */
  async getCustomerCards(nationalId, operatorId) {
    try {
      const cards = await Card.find({ 
        'customer.nationalId': nationalId 
      }).populate('account').populate('customer');

      // لاگ عملیات
      await this.logOperation('VIEW_CUSTOMER_CARDS', {
        operatorId,
        nationalId,
        cardCount: cards.length
      });

      return {
        success: true,
        cards: cards.map(card => ({
          id: card._id,
          cardNumber: card.maskedCardNumber,
          lastFourDigits: card.lastFourDigits,
          status: card.status,
          expiryDate: card.expiryDate,
          cardType: card.cardType,
          dailyLimit: card.dailyLimit,
          monthlyLimit: card.monthlyLimit,
          isActive: card.isActive(),
          isExpired: card.isExpired(),
          pinAttempts: card.pinAttempts,
          lastUsedDate: card.lastUsedDate,
          generationDate: card.generationDate
        }))
      };

    } catch (error) {
      console.error('خطا در دریافت کارت‌های مشتری:', error);
      throw new Error(`خطا در دریافت کارت‌های مشتری: ${error.message}`);
    }
  }

  /**
   * مسدود کردن کارت
   */
  async blockCard(cardNumber, reason, operatorId) {
    try {
      // 1. بررسی وجود کارت
      const card = await Card.findOne({ cardNumber });
      if (!card) {
        throw new Error('کارت یافت نشد');
      }

      if (card.status === 'مسدود') {
        throw new Error('کارت قبلاً مسدود شده است');
      }

      // 2. مسدود کردن در شبکه شتاب
      const shetabResponse = await this.bankConnection.blockCardInShetab(
        cardNumber, 
        reason, 
        operatorId
      );

      // 3. به‌روزرسانی وضعیت در دیتابیس محلی
      card.status = 'مسدود';
      card.blockReason = reason;
      card.blockedBy = operatorId;
      card.blockedAt = new Date();
      card.lastModifiedBy = operatorId;
      card.lastModifiedAt = new Date();

      await card.save();

      // 4. لاگ عملیات
      await this.logOperation('BLOCK_CARD', {
        operatorId,
        cardNumber: card.maskedCardNumber,
        reason,
        shetabRequestId: shetabResponse.requestId,
        previousStatus: card.status
      });

      return {
        success: true,
        message: 'کارت با موفقیت مسدود شد',
        card: {
          cardNumber: card.maskedCardNumber,
          status: card.status,
          blockReason: card.blockReason,
          blockedAt: card.blockedAt,
          shetabRequestId: shetabResponse.requestId
        }
      };

    } catch (error) {
      console.error('خطا در مسدود کردن کارت:', error);
      throw new Error(`خطا در مسدود کردن کارت: ${error.message}`);
    }
  }

  /**
   * باز کردن کارت مسدود
   */
  async unblockCard(cardNumber, reason, operatorId) {
    try {
      // 1. بررسی وجود کارت
      const card = await Card.findOne({ cardNumber });
      if (!card) {
        throw new Error('کارت یافت نشد');
      }

      if (card.status !== 'مسدود') {
        throw new Error('کارت مسدود نیست');
      }

      // 2. فعال‌سازی در شبکه شتاب
      const shetabResponse = await this.bankConnection.activateCardInShetab(
        cardNumber, 
        operatorId
      );

      // 3. به‌روزرسانی وضعیت در دیتابیس محلی
      card.status = 'فعال';
      card.blockReason = null;
      card.blockedBy = null;
      card.blockedAt = null;
      card.pinAttempts = 0; // بازنشانی تلاش‌های رمز
      card.lastModifiedBy = operatorId;
      card.lastModifiedAt = new Date();

      await card.save();

      // 4. لاگ عملیات
      await this.logOperation('UNBLOCK_CARD', {
        operatorId,
        cardNumber: card.maskedCardNumber,
        reason,
        shetabRequestId: shetabResponse.requestId,
        previousStatus: 'مسدود'
      });

      return {
        success: true,
        message: 'کارت با موفقیت باز شد',
        card: {
          cardNumber: card.maskedCardNumber,
          status: card.status,
          unblockReason: reason,
          unblockedAt: card.lastModifiedAt,
          shetabRequestId: shetabResponse.requestId
        }
      };

    } catch (error) {
      console.error('خطا در باز کردن کارت:', error);
      throw new Error(`خطا در باز کردن کارت: ${error.message}`);
    }
  }

  /**
   * تغییر رمز کارت
   */
  async changeCardPin(cardNumber, newPin, operatorId) {
    try {
      // 1. بررسی وجود کارت
      const card = await Card.findOne({ cardNumber });
      if (!card) {
        throw new Error('کارت یافت نشد');
      }

      if (!card.isActive()) {
        throw new Error('کارت فعال نیست');
      }

      // 2. تغییر رمز در شبکه شتاب
      const shetabResponse = await this.bankConnection.changePinInShetab(
        cardNumber, 
        newPin, 
        operatorId
      );

      // 3. به‌روزرسانی در دیتابیس محلی
      card.pin = newPin; // رمز جدید (قبل از ذخیره رمزنگاری می‌شود)
      card.pinAttempts = 0; // بازنشانی تلاش‌های رمز
      card.lastPinChange = new Date();
      card.lastModifiedBy = operatorId;
      card.lastModifiedAt = new Date();

      await card.save();

      // 4. لاگ عملیات
      await this.logOperation('CHANGE_CARD_PIN', {
        operatorId,
        cardNumber: card.maskedCardNumber,
        shetabRequestId: shetabResponse.requestId
      });

      return {
        success: true,
        message: 'رمز کارت با موفقیت تغییر یافت',
        card: {
          cardNumber: card.maskedCardNumber,
          pinChangedAt: card.lastPinChange,
          shetabRequestId: shetabResponse.requestId
        }
      };

    } catch (error) {
      console.error('خطا در تغییر رمز کارت:', error);
      throw new Error(`خطا در تغییر رمز کارت: ${error.message}`);
    }
  }

  /**
   * بازنشانی تلاش‌های ورود رمز
   */
  async resetPinAttempts(cardNumber, operatorId) {
    try {
      // 1. بررسی وجود کارت
      const card = await Card.findOne({ cardNumber });
      if (!card) {
        throw new Error('کارت یافت نشد');
      }

      // 2. بازنشانی تلاش‌ها
      card.pinAttempts = 0;
      card.lastPinAttempt = null;
      card.lastModifiedBy = operatorId;
      card.lastModifiedAt = new Date();

      await card.save();

      // 3. لاگ عملیات
      await this.logOperation('RESET_PIN_ATTEMPTS', {
        operatorId,
        cardNumber: card.maskedCardNumber,
        previousAttempts: card.pinAttempts
      });

      return {
        success: true,
        message: 'تلاش‌های ورود رمز بازنشانی شد',
        card: {
          cardNumber: card.maskedCardNumber,
          pinAttempts: card.pinAttempts,
          resetAt: card.lastModifiedAt
        }
      };

    } catch (error) {
      console.error('خطا در بازنشانی تلاش‌های رمز:', error);
      throw new Error(`خطا در بازنشانی تلاش‌های رمز: ${error.message}`);
    }
  }

  /**
   * تغییر محدودیت‌های کارت
   */
  async updateCardLimits(cardNumber, dailyLimit, monthlyLimit, operatorId) {
    try {
      // 1. بررسی وجود کارت
      const card = await Card.findOne({ cardNumber });
      if (!card) {
        throw new Error('کارت یافت نشد');
      }

      // 2. اعتبارسنجی محدودیت‌ها
      if (dailyLimit && dailyLimit < 0) {
        throw new Error('حد روزانه نمی‌تواند منفی باشد');
      }

      if (monthlyLimit && monthlyLimit < 0) {
        throw new Error('حد ماهانه نمی‌تواند منفی باشد');
      }

      // 3. به‌روزرسانی محدودیت‌ها
      if (dailyLimit !== undefined) {
        card.dailyLimit = dailyLimit;
      }

      if (monthlyLimit !== undefined) {
        card.monthlyLimit = monthlyLimit;
      }

      card.lastModifiedBy = operatorId;
      card.lastModifiedAt = new Date();

      await card.save();

      // 4. لاگ عملیات
      await this.logOperation('UPDATE_CARD_LIMITS', {
        operatorId,
        cardNumber: card.maskedCardNumber,
        dailyLimit: card.dailyLimit,
        monthlyLimit: card.monthlyLimit
      });

      return {
        success: true,
        message: 'محدودیت‌های کارت با موفقیت به‌روزرسانی شد',
        card: {
          cardNumber: card.maskedCardNumber,
          dailyLimit: card.dailyLimit,
          monthlyLimit: card.monthlyLimit,
          updatedAt: card.lastModifiedAt
        }
      };

    } catch (error) {
      console.error('خطا در به‌روزرسانی محدودیت‌های کارت:', error);
      throw new Error(`خطا در به‌روزرسانی محدودیت‌های کارت: ${error.message}`);
    }
  }

  /**
   * بررسی وضعیت کارت در شبکه شتاب
   */
  async checkCardStatusInShetab(cardNumber, operatorId) {
    try {
      // 1. بررسی وجود کارت در دیتابیس محلی
      const localCard = await Card.findOne({ cardNumber });
      if (!localCard) {
        throw new Error('کارت در سیستم محلی یافت نشد');
      }

      // 2. بررسی وضعیت در شبکه شتاب
      const shetabStatus = await this.bankConnection.getCardStatusInShetab(cardNumber);

      // 3. مقایسه وضعیت‌ها
      const statusComparison = {
        localStatus: localCard.status,
        shetabStatus: shetabStatus.cardStatus.status,
        isSynchronized: localCard.status === shetabStatus.cardStatus.status,
        lastSync: new Date()
      };

      // 4. لاگ عملیات
      await this.logOperation('CHECK_CARD_STATUS', {
        operatorId,
        cardNumber: localCard.maskedCardNumber,
        statusComparison,
        shetabRequestId: shetabStatus.requestId
      });

      return {
        success: true,
        statusComparison,
        shetabRequestId: shetabStatus.requestId
      };

    } catch (error) {
      console.error('خطا در بررسی وضعیت کارت در شبکه شتاب:', error);
      throw new Error(`خطا در بررسی وضعیت کارت در شبکه شتاب: ${error.message}`);
    }
  }

  /**
   * همگام‌سازی وضعیت کارت با شبکه شتاب
   */
  async syncCardStatusWithShetab(cardNumber, operatorId) {
    try {
      // 1. بررسی وجود کارت
      const card = await Card.findOne({ cardNumber });
      if (!card) {
        throw new Error('کارت یافت نشد');
      }

      // 2. دریافت وضعیت از شبکه شتاب
      const shetabStatus = await this.bankConnection.getCardStatusInShetab(cardNumber);

      // 3. به‌روزرسانی وضعیت محلی
      const previousStatus = card.status;
      card.status = shetabStatus.cardStatus.status;
      card.lastSyncWithShetab = new Date();
      card.lastModifiedBy = operatorId;
      card.lastModifiedAt = new Date();

      await card.save();

      // 4. لاگ عملیات
      await this.logOperation('SYNC_CARD_STATUS', {
        operatorId,
        cardNumber: card.maskedCardNumber,
        previousStatus,
        newStatus: card.status,
        shetabRequestId: shetabStatus.requestId
      });

      return {
        success: true,
        message: 'وضعیت کارت با شبکه شتاب همگام شد',
        card: {
          cardNumber: card.maskedCardNumber,
          previousStatus,
          newStatus: card.status,
          syncedAt: card.lastSyncWithShetab,
          shetabRequestId: shetabStatus.requestId
        }
      };

    } catch (error) {
      console.error('خطا در همگام‌سازی وضعیت کارت:', error);
      throw new Error(`خطا در همگام‌سازی وضعیت کارت: ${error.message}`);
    }
  }

  /**
   * دریافت گزارش کارت‌های مسدود
   */
  async getBlockedCardsReport(operatorId, filters = {}) {
    try {
      const query = { status: 'مسدود' };

      // اعمال فیلترها
      if (filters.bankType) {
        query.cardType = filters.bankType;
      }

      if (filters.dateFrom) {
        query.blockedAt = { $gte: new Date(filters.dateFrom) };
      }

      if (filters.dateTo) {
        query.blockedAt = { ...query.blockedAt, $lte: new Date(filters.dateTo) };
      }

      const blockedCards = await Card.find(query)
        .populate('customer', 'firstName lastName nationalId phone')
        .populate('account', 'accountNumber accountType')
        .sort({ blockedAt: -1 });

      // لاگ عملیات
      await this.logOperation('GET_BLOCKED_CARDS_REPORT', {
        operatorId,
        filters,
        resultCount: blockedCards.length
      });

      return {
        success: true,
        blockedCards: blockedCards.map(card => ({
          id: card._id,
          cardNumber: card.maskedCardNumber,
          customerName: `${card.customer.firstName} ${card.customer.lastName}`,
          nationalId: card.customer.nationalId,
          phone: card.customer.phone,
          accountNumber: card.account.accountNumber,
          accountType: card.account.accountType,
          cardType: card.cardType,
          blockReason: card.blockReason,
          blockedAt: card.blockedAt,
          blockedBy: card.blockedBy
        })),
        totalCount: blockedCards.length
      };

    } catch (error) {
      console.error('خطا در دریافت گزارش کارت‌های مسدود:', error);
      throw new Error(`خطا در دریافت گزارش کارت‌های مسدود: ${error.message}`);
    }
  }

  /**
   * لاگ عملیات
   */
  async logOperation(operationType, data) {
    try {
      const log = new OperationLog({
        operationType,
        data,
        timestamp: new Date()
      });
      await log.save();
    } catch (error) {
      console.error('خطا در ثبت لاگ عملیات:', error);
    }
  }
}

module.exports = CardManagement;