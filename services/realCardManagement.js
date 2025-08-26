const RealShetabIntegration = require('./realShetabIntegration');
const RealAccountManagement = require('./realAccountManagement');
const RealIdentityVerification = require('./realIdentityVerification');
const Card = require('../models/Card');
const OperationLog = require('../models/OperationLog');

/**
 * سرویس مدیریت واقعی کارت‌های موجود
 * Real Existing Card Management Service
 */
class RealCardManagement {
  constructor() {
    this.shetabIntegration = new RealShetabIntegration();
    this.accountManagement = new RealAccountManagement();
    this.identityVerification = new RealIdentityVerification();
  }

  /**
   * مشاهده کارت‌های مشتری با تایید واقعی
   */
  async getCustomerCardsWithRealVerification(nationalId, operatorId, branchCode) {
    try {
      // 1. تایید هویت مشتری از سیستم‌های واقعی
      const identityVerification = await this.identityVerification.comprehensiveIdentityVerification(
        nationalId,
        null, // بدون تلفن برای این عملیات
        operatorId
      );

      if (!identityVerification.success) {
        throw new Error(`هویت مشتری تایید نشد. امتیاز: ${identityVerification.verificationScore}%`);
      }

      // 2. دریافت کارت‌های مشتری از دیتابیس محلی
      const localCards = await Card.find({ 
        'customer.nationalId': nationalId 
      }).populate('account').populate('customer');

      // 3. تایید وضعیت کارت‌ها از شبکه شتاب
      const verifiedCards = [];
      for (const card of localCards) {
        try {
          const shetabStatus = await this.shetabIntegration.getCardStatusInShetab(
            card.cardNumber,
            operatorId,
            branchCode
          );

          if (shetabStatus.success) {
            // به‌روزرسانی وضعیت محلی با اطلاعات شبکه شتاب
            card.status = shetabStatus.cardStatus.status;
            card.lastSyncWithShetab = new Date();
            card.lastModifiedBy = operatorId;
            card.lastModifiedAt = new Date();
            await card.save();

            verifiedCards.push({
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
              generationDate: card.generationDate,
              shetabStatus: shetabStatus.cardStatus,
              isVerified: true
            });
          }
        } catch (error) {
          console.error(`خطا در تایید کارت ${card.cardNumber}:`, error);
          // اضافه کردن کارت با وضعیت تایید نشده
          verifiedCards.push({
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
            generationDate: card.generationDate,
            isVerified: false,
            verificationError: error.message
          });
        }
      }

      // 4. لاگ عملیات
      await this.logOperation('VIEW_CUSTOMER_CARDS_WITH_VERIFICATION', {
        operatorId,
        nationalId,
        cardCount: verifiedCards.length,
        verificationScore: identityVerification.verificationScore,
        verificationLevel: identityVerification.verificationLevel
      });

      return {
        success: true,
        customerInfo: {
          nationalId: nationalId,
          verificationScore: identityVerification.verificationScore,
          verificationLevel: identityVerification.verificationLevel,
          verificationDetails: identityVerification.results
        },
        cards: verifiedCards,
        totalCount: verifiedCards.length,
        verifiedCount: verifiedCards.filter(c => c.isVerified).length
      };

    } catch (error) {
      console.error('❌ خطا در دریافت کارت‌های مشتری با تایید واقعی:', error);
      throw new Error(`خطا در دریافت کارت‌های مشتری: ${error.message}`);
    }
  }

  /**
   * مسدود کردن کارت با تایید واقعی
   */
  async blockCardWithRealVerification(cardNumber, reason, operatorId, branchCode) {
    try {
      // 1. بررسی وجود کارت در دیتابیس محلی
      const localCard = await Card.findOne({ cardNumber });
      if (!localCard) {
        throw new Error('کارت در سیستم محلی یافت نشد');
      }

      if (localCard.status === 'مسدود') {
        throw new Error('کارت قبلاً مسدود شده است');
      }

      // 2. تایید هویت مشتری
      const customerNationalId = localCard.customer?.nationalId;
      if (customerNationalId) {
        const identityVerification = await this.identityVerification.verifyIdentityFromCentralBank(
          customerNationalId,
          localCard.customer?.phone,
          operatorId
        );

        if (!identityVerification.success) {
          throw new Error('هویت مشتری تایید نشد');
        }
      }

      // 3. مسدود کردن کارت در شبکه شتاب
      const shetabResponse = await this.shetabIntegration.blockCardInShetab(
        cardNumber,
        reason,
        operatorId,
        branchCode
      );

      // 4. به‌روزرسانی وضعیت در دیتابیس محلی
      localCard.status = 'مسدود';
      localCard.blockReason = reason;
      localCard.blockedBy = operatorId;
      localCard.blockedAt = new Date();
      localCard.lastModifiedBy = operatorId;
      localCard.lastModifiedAt = new Date();
      localCard.shetabReference = shetabResponse.blockInfo.shetabReference;

      await localCard.save();

      // 5. لاگ عملیات
      await this.logOperation('BLOCK_CARD_WITH_VERIFICATION', {
        operatorId,
        cardNumber: localCard.maskedCardNumber,
        reason,
        shetabReference: shetabResponse.blockInfo.shetabReference,
        previousStatus: localCard.status,
        customerNationalId: customerNationalId
      });

      return {
        success: true,
        message: 'کارت با موفقیت مسدود شد',
        card: {
          cardNumber: localCard.maskedCardNumber,
          status: localCard.status,
          blockReason: localCard.blockReason,
          blockedAt: localCard.blockedAt,
          shetabReference: shetabResponse.blockInfo.shetabReference,
          requestId: shetabResponse.blockInfo.requestId
        }
      };

    } catch (error) {
      console.error('❌ خطا در مسدود کردن کارت با تایید واقعی:', error);
      throw new Error(`خطا در مسدود کردن کارت: ${error.message}`);
    }
  }

  /**
   * باز کردن کارت مسدود با تایید واقعی
   */
  async unblockCardWithRealVerification(cardNumber, reason, operatorId, branchCode) {
    try {
      // 1. بررسی وجود کارت در دیتابیس محلی
      const localCard = await Card.findOne({ cardNumber });
      if (!localCard) {
        throw new Error('کارت در سیستم محلی یافت نشد');
      }

      if (localCard.status !== 'مسدود') {
        throw new Error('کارت مسدود نیست');
      }

      // 2. تایید هویت مشتری
      const customerNationalId = localCard.customer?.nationalId;
      if (customerNationalId) {
        const identityVerification = await this.identityVerification.verifyIdentityFromCentralBank(
          customerNationalId,
          localCard.customer?.phone,
          operatorId
        );

        if (!identityVerification.success) {
          throw new Error('هویت مشتری تایید نشد');
        }
      }

      // 3. فعال‌سازی کارت در شبکه شتاب
      const shetabResponse = await this.shetabIntegration.activateCardInShetab(
        cardNumber,
        operatorId,
        branchCode
      );

      // 4. به‌روزرسانی وضعیت در دیتابیس محلی
      localCard.status = 'فعال';
      localCard.blockReason = null;
      localCard.blockedBy = null;
      localCard.blockedAt = null;
      localCard.pinAttempts = 0;
      localCard.lastModifiedBy = operatorId;
      localCard.lastModifiedAt = new Date();
      localCard.shetabReference = shetabResponse.activationInfo.shetabReference;

      await localCard.save();

      // 5. لاگ عملیات
      await this.logOperation('UNBLOCK_CARD_WITH_VERIFICATION', {
        operatorId,
        cardNumber: localCard.maskedCardNumber,
        reason,
        shetabReference: shetabResponse.activationInfo.shetabReference,
        previousStatus: 'مسدود',
        customerNationalId: customerNationalId
      });

      return {
        success: true,
        message: 'کارت با موفقیت باز شد',
        card: {
          cardNumber: localCard.maskedCardNumber,
          status: localCard.status,
          unblockReason: reason,
          unblockedAt: localCard.lastModifiedAt,
          shetabReference: shetabResponse.activationInfo.shetabReference,
          requestId: shetabResponse.activationInfo.requestId
        }
      };

    } catch (error) {
      console.error('❌ خطا در باز کردن کارت با تایید واقعی:', error);
      throw new Error(`خطا در باز کردن کارت: ${error.message}`);
    }
  }

  /**
   * تغییر رمز کارت با تایید واقعی
   */
  async changeCardPinWithRealVerification(cardNumber, newPin, operatorId, branchCode) {
    try {
      // 1. بررسی وجود کارت در دیتابیس محلی
      const localCard = await Card.findOne({ cardNumber });
      if (!localCard) {
        throw new Error('کارت در سیستم محلی یافت نشد');
      }

      if (!localCard.isActive()) {
        throw new Error('کارت فعال نیست');
      }

      // 2. تایید هویت مشتری
      const customerNationalId = localCard.customer?.nationalId;
      if (customerNationalId) {
        const identityVerification = await this.identityVerification.verifyIdentityFromCentralBank(
          customerNationalId,
          localCard.customer?.phone,
          operatorId
        );

        if (!identityVerification.success) {
          throw new Error('هویت مشتری تایید نشد');
        }
      }

      // 3. تغییر رمز در شبکه شتاب
      const shetabResponse = await this.shetabIntegration.changePinInShetab(
        cardNumber,
        newPin,
        operatorId,
        branchCode
      );

      // 4. به‌روزرسانی در دیتابیس محلی
      localCard.pin = newPin;
      localCard.pinAttempts = 0;
      localCard.lastPinChange = new Date();
      localCard.lastModifiedBy = operatorId;
      localCard.lastModifiedAt = new Date();
      localCard.shetabReference = shetabResponse.changePinInfo.shetabReference;

      await localCard.save();

      // 5. لاگ عملیات
      await this.logOperation('CHANGE_CARD_PIN_WITH_VERIFICATION', {
        operatorId,
        cardNumber: localCard.maskedCardNumber,
        shetabReference: shetabResponse.changePinInfo.shetabReference,
        customerNationalId: customerNationalId
      });

      return {
        success: true,
        message: 'رمز کارت با موفقیت تغییر یافت',
        card: {
          cardNumber: localCard.maskedCardNumber,
          pinChangedAt: localCard.lastPinChange,
          shetabReference: shetabResponse.changePinInfo.shetabReference,
          requestId: shetabResponse.changePinInfo.requestId
        }
      };

    } catch (error) {
      console.error('❌ خطا در تغییر رمز کارت با تایید واقعی:', error);
      throw new Error(`خطا در تغییر رمز کارت: ${error.message}`);
    }
  }

  /**
   * بازنشانی تلاش‌های ورود رمز با تایید واقعی
   */
  async resetPinAttemptsWithRealVerification(cardNumber, operatorId, branchCode) {
    try {
      // 1. بررسی وجود کارت در دیتابیس محلی
      const localCard = await Card.findOne({ cardNumber });
      if (!localCard) {
        throw new Error('کارت در سیستم محلی یافت نشد');
      }

      // 2. تایید هویت مشتری
      const customerNationalId = localCard.customer?.nationalId;
      if (customerNationalId) {
        const identityVerification = await this.identityVerification.verifyIdentityFromCentralBank(
          customerNationalId,
          localCard.customer?.phone,
          operatorId
        );

        if (!identityVerification.success) {
          throw new Error('هویت مشتری تایید نشد');
        }
      }

      // 3. بازنشانی تلاش‌ها در دیتابیس محلی
      localCard.pinAttempts = 0;
      localCard.lastPinAttempt = null;
      localCard.lastModifiedBy = operatorId;
      localCard.lastModifiedAt = new Date();

      await localCard.save();

      // 4. لاگ عملیات
      await this.logOperation('RESET_PIN_ATTEMPTS_WITH_VERIFICATION', {
        operatorId,
        cardNumber: localCard.maskedCardNumber,
        previousAttempts: localCard.pinAttempts,
        customerNationalId: customerNationalId
      });

      return {
        success: true,
        message: 'تلاش‌های ورود رمز بازنشانی شد',
        card: {
          cardNumber: localCard.maskedCardNumber,
          pinAttempts: localCard.pinAttempts,
          resetAt: localCard.lastModifiedAt
        }
      };

    } catch (error) {
      console.error('❌ خطا در بازنشانی تلاش‌های رمز با تایید واقعی:', error);
      throw new Error(`خطا در بازنشانی تلاش‌های رمز: ${error.message}`);
    }
  }

  /**
   * تغییر محدودیت‌های کارت با تایید واقعی
   */
  async updateCardLimitsWithRealVerification(cardNumber, dailyLimit, monthlyLimit, operatorId, branchCode) {
    try {
      // 1. بررسی وجود کارت در دیتابیس محلی
      const localCard = await Card.findOne({ cardNumber });
      if (!localCard) {
        throw new Error('کارت در سیستم محلی یافت نشد');
      }

      // 2. تایید هویت مشتری
      const customerNationalId = localCard.customer?.nationalId;
      if (customerNationalId) {
        const identityVerification = await this.identityVerification.verifyIdentityFromCentralBank(
          customerNationalId,
          localCard.customer?.phone,
          operatorId
        );

        if (!identityVerification.success) {
          throw new Error('هویت مشتری تایید نشد');
        }
      }

      // 3. اعتبارسنجی محدودیت‌ها
      if (dailyLimit && dailyLimit < 0) {
        throw new Error('حد روزانه نمی‌تواند منفی باشد');
      }

      if (monthlyLimit && monthlyLimit < 0) {
        throw new Error('حد ماهانه نمی‌تواند منفی باشد');
      }

      // 4. به‌روزرسانی محدودیت‌ها در دیتابیس محلی
      if (dailyLimit !== undefined) {
        localCard.dailyLimit = dailyLimit;
      }

      if (monthlyLimit !== undefined) {
        localCard.monthlyLimit = monthlyLimit;
      }

      localCard.lastModifiedBy = operatorId;
      localCard.lastModifiedAt = new Date();

      await localCard.save();

      // 5. لاگ عملیات
      await this.logOperation('UPDATE_CARD_LIMITS_WITH_VERIFICATION', {
        operatorId,
        cardNumber: localCard.maskedCardNumber,
        dailyLimit: localCard.dailyLimit,
        monthlyLimit: localCard.monthlyLimit,
        customerNationalId: customerNationalId
      });

      return {
        success: true,
        message: 'محدودیت‌های کارت با موفقیت به‌روزرسانی شد',
        card: {
          cardNumber: localCard.maskedCardNumber,
          dailyLimit: localCard.dailyLimit,
          monthlyLimit: localCard.monthlyLimit,
          updatedAt: localCard.lastModifiedAt
        }
      };

    } catch (error) {
      console.error('❌ خطا در به‌روزرسانی محدودیت‌های کارت با تایید واقعی:', error);
      throw new Error(`خطا در به‌روزرسانی محدودیت‌های کارت: ${error.message}`);
    }
  }

  /**
   * همگام‌سازی کامل وضعیت کارت با شبکه شتاب
   */
  async fullCardStatusSyncWithShetab(cardNumber, operatorId, branchCode) {
    try {
      // 1. بررسی وجود کارت در دیتابیس محلی
      const localCard = await Card.findOne({ cardNumber });
      if (!localCard) {
        throw new Error('کارت در سیستم محلی یافت نشد');
      }

      // 2. دریافت وضعیت کامل از شبکه شتاب
      const shetabStatus = await this.shetabIntegration.getCardStatusInShetab(
        cardNumber,
        operatorId,
        branchCode
      );

      if (!shetabStatus.success) {
        throw new Error('خطا در دریافت وضعیت از شبکه شتاب');
      }

      // 3. به‌روزرسانی کامل وضعیت در دیتابیس محلی
      const previousStatus = localCard.status;
      localCard.status = shetabStatus.cardStatus.status;
      localCard.lastSyncWithShetab = new Date();
      localCard.lastModifiedBy = operatorId;
      localCard.lastModifiedAt = new Date();
      localCard.shetabReference = shetabStatus.cardStatus.shetabReference;

      // به‌روزرسانی اطلاعات اضافی
      if (shetabStatus.cardStatus.isBlocked) {
        localCard.isBlocked = true;
        localCard.blockReason = shetabStatus.cardStatus.blockReason;
      } else {
        localCard.isBlocked = false;
        localCard.blockReason = null;
      }

      await localCard.save();

      // 4. لاگ عملیات
      await this.logOperation('FULL_CARD_STATUS_SYNC', {
        operatorId,
        cardNumber: localCard.maskedCardNumber,
        previousStatus,
        newStatus: localCard.status,
        shetabReference: shetabStatus.cardStatus.shetabReference,
        requestId: shetabStatus.cardStatus.requestId
      });

      return {
        success: true,
        message: 'وضعیت کارت با شبکه شتاب همگام شد',
        card: {
          cardNumber: localCard.maskedCardNumber,
          previousStatus,
          newStatus: localCard.status,
          syncedAt: localCard.lastSyncWithShetab,
          shetabReference: shetabStatus.cardStatus.shetabReference,
          requestId: shetabStatus.cardStatus.requestId
        },
        shetabStatus: shetabStatus.cardStatus
      };

    } catch (error) {
      console.error('❌ خطا در همگام‌سازی کامل وضعیت کارت:', error);
      throw new Error(`خطا در همگام‌سازی وضعیت کارت: ${error.message}`);
    }
  }

  /**
   * دریافت گزارش کامل کارت‌های مسدود با تایید واقعی
   */
  async getComprehensiveBlockedCardsReport(operatorId, branchCode, filters = {}) {
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

      // دریافت کارت‌های مسدود از دیتابیس محلی
      const blockedCards = await Card.find(query)
        .populate('customer', 'firstName lastName nationalId phone')
        .populate('account', 'accountNumber accountType')
        .sort({ blockedAt: -1 });

      // تایید وضعیت از شبکه شتاب
      const verifiedBlockedCards = [];
      for (const card of blockedCards) {
        try {
          const shetabStatus = await this.shetabIntegration.getCardStatusInShetab(
            card.cardNumber,
            operatorId,
            branchCode
          );

          if (shetabStatus.success) {
            verifiedBlockedCards.push({
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
              blockedBy: card.blockedBy,
              shetabStatus: shetabStatus.cardStatus.status,
              isVerified: true,
              shetabReference: shetabStatus.cardStatus.shetabReference
            });
          }
        } catch (error) {
          console.error(`خطا در تایید کارت ${card.cardNumber}:`, error);
          verifiedBlockedCards.push({
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
            blockedBy: card.blockedBy,
            isVerified: false,
            verificationError: error.message
          });
        }
      }

      // لاگ عملیات
      await this.logOperation('GET_COMPREHENSIVE_BLOCKED_CARDS_REPORT', {
        operatorId,
        filters,
        resultCount: verifiedBlockedCards.length,
        verifiedCount: verifiedBlockedCards.filter(c => c.isVerified).length
      });

      return {
        success: true,
        blockedCards: verifiedBlockedCards,
        totalCount: verifiedBlockedCards.length,
        verifiedCount: verifiedBlockedCards.filter(c => c.isVerified).length,
        unverifiedCount: verifiedBlockedCards.filter(c => !c.isVerified).length
      };

    } catch (error) {
      console.error('❌ خطا در دریافت گزارش کامل کارت‌های مسدود:', error);
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
      console.error('❌ خطا در ثبت لاگ عملیات:', error);
    }
  }

  /**
   * تست تمام سیستم‌های مدیریت کارت
   */
  async testAllCardManagementSystems(operatorId, branchCode) {
    try {
      const results = {};

      // تست اتصال به شبکه شتاب
      try {
        const shetabTest = await this.shetabIntegration.testShetabConnection();
        results.shetab = shetabTest;
      } catch (error) {
        results.shetab = { success: false, error: error.message };
      }

      // تست اتصال به سیستم‌های تایید هویت
      try {
        const identityTest = await this.identityVerification.testIdentityVerificationSystems();
        results.identityVerification = identityTest;
      } catch (error) {
        results.identityVerification = { success: false, error: error.message };
      }

      // تست اتصال به سیستم‌های مدیریت حساب
      try {
        const accountTest = await this.accountManagement.testRealConnections();
        results.accountManagement = accountTest;
      } catch (error) {
        results.accountManagement = { success: false, error: error.message };
      }

      return {
        success: true,
        testResults: results,
        summary: {
          totalSystems: Object.keys(results).length,
          successfulSystems: Object.values(results).filter(r => r.success).length,
          failedSystems: Object.values(results).filter(r => !r.success).length
        }
      };

    } catch (error) {
      console.error('❌ خطا در تست سیستم‌های مدیریت کارت:', error);
      throw error;
    }
  }
}

module.exports = RealCardManagement;