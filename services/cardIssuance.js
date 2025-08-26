const Card = require('../models/Card');
const Account = require('../models/Account');
const User = require('../models/User');
const BankConnection = require('./bankConnection');
const CardGenerator = require('../utils/cardGenerator');
const OperationLog = require('../models/OperationLog');

/**
 * سرویس صدور کارت جدید
 * New Card Issuance Service
 */
class CardIssuance {
  constructor() {
    this.bankConnection = new BankConnection();
    this.cardGenerator = new CardGenerator();
  }

  /**
   * صدور کارت جایگزین برای کارت مسدود
   */
  async issueReplacementCard(blockedCardNumber, operatorId, reason = 'جایگزینی کارت مسدود') {
    try {
      // 1. بررسی کارت مسدود
      const blockedCard = await Card.findOne({ 
        cardNumber: blockedCardNumber,
        status: 'مسدود'
      });

      if (!blockedCard) {
        throw new Error('کارت مسدود یافت نشد');
      }

      // 2. تایید حساب
      const account = await Account.findById(blockedCard.accountId);
      if (!account || account.status !== 'فعال') {
        throw new Error('حساب بانکی فعال یافت نشد');
      }

      // 3. صدور کارت جدید در شبکه شتاب
      const shetabResponse = await this.bankConnection.issueCardInShetab(
        account.accountNumber,
        blockedCard.cardType,
        operatorId
      );

      // 4. تولید داده‌های کارت جدید
      const newCardData = this.cardGenerator.generateCompleteCard(
        blockedCard.cardType,
        blockedCard.cardNetwork,
        blockedCard.cardholderName,
        account._id,
        account.userId,
        operatorId
      );

      // 5. ثبت کارت جدید در دیتابیس
      const newCard = new Card({
        ...newCardData,
        isReplacement: true,
        replacedCard: blockedCard._id,
        replacementReason: reason,
        issuedBy: operatorId,
        shetabRequestId: shetabResponse.requestId
      });

      await newCard.save();

      // 6. به‌روزرسانی کارت مسدود
      blockedCard.replacementCard = newCard._id;
      blockedCard.replacedAt = new Date();
      blockedCard.replacedBy = operatorId;
      await blockedCard.save();

      // 7. لاگ عملیات
      await this.logOperation('ISSUE_REPLACEMENT_CARD', {
        operatorId,
        blockedCardNumber: blockedCard.maskedCardNumber,
        newCardNumber: newCard.maskedCardNumber,
        reason,
        shetabRequestId: shetabResponse.requestId
      });

      return {
        success: true,
        message: 'کارت جایگزین با موفقیت صادر شد',
        newCard: {
          id: newCard._id,
          cardNumber: newCard.maskedCardNumber,
          cardholderName: newCard.cardholderName,
          cardType: newCard.cardType,
          cardNetwork: newCard.cardNetwork,
          expiryDate: newCard.expiryDate,
          dailyLimit: newCard.dailyLimit,
          monthlyLimit: newCard.monthlyLimit,
          shetabRequestId: shetabResponse.requestId
        },
        blockedCard: {
          cardNumber: blockedCard.maskedCardNumber,
          blockReason: blockedCard.blockReason,
          blockedAt: blockedCard.blockedAt
        }
      };

    } catch (error) {
      console.error('خطا در صدور کارت جایگزین:', error);
      throw new Error(`خطا در صدور کارت جایگزین: ${error.message}`);
    }
  }

  /**
   * صدور کارت جدید برای مشتری
   */
  async issueNewCard(customerData, accountData, cardType, operatorId) {
    try {
      // 1. تایید هویت مشتری از بانک مرکزی
      const identityVerification = await this.bankConnection.verifyIdentityInCentralBank(
        customerData.nationalId,
        customerData.phone
      );

      if (!identityVerification.verificationResult.isValid) {
        throw new Error('هویت مشتری تایید نشد');
      }

      // 2. تایید حساب از بانک ملی
      const accountVerification = await this.bankConnection.verifyAccountInNationalBank(
        accountData.accountNumber,
        customerData.nationalId
      );

      if (!accountVerification.accountInfo.isValid) {
        throw new Error('حساب بانکی تایید نشد');
      }

      // 3. بررسی موجودی حساب
      const balanceInfo = await this.bankConnection.getAccountBalanceInNationalBank(
        accountData.accountNumber
      );

      // 4. صدور کارت در شبکه شتاب
      const shetabResponse = await this.bankConnection.issueCardInShetab(
        accountData.accountNumber,
        cardType,
        operatorId
      );

      // 5. تولید داده‌های کارت
      const cardData = this.cardGenerator.generateCompleteCard(
        cardType,
        'UnionPay', // شبکه پیش‌فرض برای بانک‌های ایرانی
        customerData.fullName,
        accountData.accountId,
        accountData.userId,
        operatorId
      );

      // 6. ثبت کارت در دیتابیس
      const card = new Card({
        ...cardData,
        customer: {
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          nationalId: customerData.nationalId,
          phone: customerData.phone,
          email: customerData.email
        },
        account: {
          accountNumber: accountData.accountNumber,
          accountType: accountData.accountType,
          balance: balanceInfo.balance,
          currency: balanceInfo.currency
        },
        issuedBy: operatorId,
        shetabRequestId: shetabResponse.requestId,
        identityVerified: true,
        accountVerified: true
      });

      await card.save();

      // 7. لاگ عملیات
      await this.logOperation('ISSUE_NEW_CARD', {
        operatorId,
        customerNationalId: customerData.nationalId,
        accountNumber: accountData.accountNumber,
        cardNumber: card.maskedCardNumber,
        cardType,
        shetabRequestId: shetabResponse.requestId
      });

      return {
        success: true,
        message: 'کارت جدید با موفقیت صادر شد',
        card: {
          id: card._id,
          cardNumber: card.maskedCardNumber,
          cardholderName: card.cardholderName,
          cardType: card.cardType,
          cardNetwork: card.cardNetwork,
          expiryDate: card.expiryDate,
          dailyLimit: card.dailyLimit,
          monthlyLimit: card.monthlyLimit,
          shetabRequestId: shetabResponse.requestId
        },
        customer: {
          name: customerData.fullName,
          nationalId: customerData.nationalId,
          phone: customerData.phone
        },
        account: {
          accountNumber: accountData.accountNumber,
          accountType: accountData.accountType,
          balance: balanceInfo.balance,
          currency: balanceInfo.currency
        }
      };

    } catch (error) {
      console.error('خطا در صدور کارت جدید:', error);
      throw new Error(`خطا در صدور کارت جدید: ${error.message}`);
    }
  }

  /**
   * صدور کارت برای حساب موجود
   */
  async issueCardForExistingAccount(accountNumber, nationalId, cardType, operatorId) {
    try {
      // 1. بررسی وجود حساب
      const account = await Account.findOne({ accountNumber });
      if (!account) {
        throw new Error('حساب بانکی یافت نشد');
      }

      // 2. بررسی مالک حساب
      const accountOwner = await User.findById(account.userId);
      if (!accountOwner || accountOwner.nationalId !== nationalId) {
        throw new Error('مالک حساب تایید نشد');
      }

      // 3. بررسی کارت‌های موجود
      const existingCards = await Card.find({ 
        accountId: account._id,
        status: { $in: ['فعال', 'غیرفعال'] }
      });

      if (existingCards.length > 0) {
        throw new Error('این حساب قبلاً کارت دارد');
      }

      // 4. صدور کارت در شبکه شتاب
      const shetabResponse = await this.bankConnection.issueCardInShetab(
        accountNumber,
        cardType,
        operatorId
      );

      // 5. تولید داده‌های کارت
      const cardData = this.cardGenerator.generateCompleteCard(
        cardType,
        'UnionPay',
        `${accountOwner.firstName} ${accountOwner.lastName}`,
        account._id,
        account.userId,
        operatorId
      );

      // 6. ثبت کارت در دیتابیس
      const card = new Card({
        ...cardData,
        customer: {
          firstName: accountOwner.firstName,
          lastName: accountOwner.lastName,
          nationalId: accountOwner.nationalId,
          phone: accountOwner.phone,
          email: accountOwner.email
        },
        account: {
          accountNumber: account.accountNumber,
          accountType: account.accountType,
          balance: account.balance,
          currency: account.currency
        },
        issuedBy: operatorId,
        shetabRequestId: shetabResponse.requestId
      });

      await card.save();

      // 7. لاگ عملیات
      await this.logOperation('ISSUE_CARD_FOR_EXISTING_ACCOUNT', {
        operatorId,
        accountNumber,
        nationalId,
        cardNumber: card.maskedCardNumber,
        cardType,
        shetabRequestId: shetabResponse.requestId
      });

      return {
        success: true,
        message: 'کارت برای حساب موجود با موفقیت صادر شد',
        card: {
          id: card._id,
          cardNumber: card.maskedCardNumber,
          cardholderName: card.cardholderName,
          cardType: card.cardType,
          cardNetwork: card.cardNetwork,
          expiryDate: card.expiryDate,
          dailyLimit: card.dailyLimit,
          monthlyLimit: card.monthlyLimit,
          shetabRequestId: shetabResponse.requestId
        }
      };

    } catch (error) {
      console.error('خطا در صدور کارت برای حساب موجود:', error);
      throw new Error(`خطا در صدور کارت برای حساب موجود: ${error.message}`);
    }
  }

  /**
   * صدور کارت اضطراری
   */
  async issueEmergencyCard(accountNumber, nationalId, cardType, operatorId, emergencyReason) {
    try {
      // 1. تایید سریع هویت
      const identityVerification = await this.bankConnection.verifyIdentityInCentralBank(
        nationalId,
        null // بدون تایید تلفن برای کارت اضطراری
      );

      if (!identityVerification.verificationResult.isValid) {
        throw new Error('هویت مشتری تایید نشد');
      }

      // 2. صدور کارت در شبکه شتاب (با اولویت بالا)
      const shetabResponse = await this.bankConnection.issueCardInShetab(
        accountNumber,
        cardType,
        operatorId
      );

      // 3. تولید داده‌های کارت
      const cardData = this.cardGenerator.generateCompleteCard(
        cardType,
        'UnionPay',
        identityVerification.verificationResult.fullName,
        null, // بدون accountId برای کارت اضطراری
        null, // بدون userId برای کارت اضطراری
        operatorId
      );

      // 4. ثبت کارت در دیتابیس
      const card = new Card({
        ...cardData,
        customer: {
          firstName: identityVerification.verificationResult.firstName,
          lastName: identityVerification.verificationResult.lastName,
          nationalId: nationalId
        },
        account: {
          accountNumber: accountNumber
        },
        issuedBy: operatorId,
        shetabRequestId: shetabResponse.requestId,
        isEmergencyCard: true,
        emergencyReason: emergencyReason,
        emergencyIssuedAt: new Date()
      });

      await card.save();

      // 5. لاگ عملیات
      await this.logOperation('ISSUE_EMERGENCY_CARD', {
        operatorId,
        accountNumber,
        nationalId,
        cardNumber: card.maskedCardNumber,
        cardType,
        emergencyReason,
        shetabRequestId: shetabResponse.requestId
      });

      return {
        success: true,
        message: 'کارت اضطراری با موفقیت صادر شد',
        card: {
          id: card._id,
          cardNumber: card.maskedCardNumber,
          cardholderName: card.cardholderName,
          cardType: card.cardType,
          cardNetwork: card.cardNetwork,
          expiryDate: card.expiryDate,
          isEmergencyCard: true,
          emergencyReason: emergencyReason,
          shetabRequestId: shetabResponse.requestId
        }
      };

    } catch (error) {
      console.error('خطا در صدور کارت اضطراری:', error);
      throw new Error(`خطا در صدور کارت اضطراری: ${error.message}`);
    }
  }

  /**
   * فعال‌سازی کارت صادر شده
   */
  async activateIssuedCard(cardNumber, operatorId) {
    try {
      // 1. بررسی وجود کارت
      const card = await Card.findOne({ cardNumber });
      if (!card) {
        throw new Error('کارت یافت نشد');
      }

      if (card.status === 'فعال') {
        throw new Error('کارت قبلاً فعال است');
      }

      // 2. فعال‌سازی در شبکه شتاب
      const shetabResponse = await this.bankConnection.activateCardInShetab(
        cardNumber,
        operatorId
      );

      // 3. به‌روزرسانی وضعیت در دیتابیس
      card.status = 'فعال';
      card.activationDate = new Date();
      card.activatedBy = operatorId;
      card.lastModifiedBy = operatorId;
      card.lastModifiedAt = new Date();

      await card.save();

      // 4. لاگ عملیات
      await this.logOperation('ACTIVATE_ISSUED_CARD', {
        operatorId,
        cardNumber: card.maskedCardNumber,
        shetabRequestId: shetabResponse.requestId
      });

      return {
        success: true,
        message: 'کارت با موفقیت فعال شد',
        card: {
          cardNumber: card.maskedCardNumber,
          status: card.status,
          activationDate: card.activationDate,
          shetabRequestId: shetabResponse.requestId
        }
      };

    } catch (error) {
      console.error('خطا در فعال‌سازی کارت:', error);
      throw new Error(`خطا در فعال‌سازی کارت: ${error.message}`);
    }
  }

  /**
   * دریافت گزارش کارت‌های صادر شده
   */
  async getIssuedCardsReport(operatorId, filters = {}) {
    try {
      const query = {};

      // اعمال فیلترها
      if (filters.dateFrom) {
        query.generationDate = { $gte: new Date(filters.dateFrom) };
      }

      if (filters.dateTo) {
        query.generationDate = { ...query.generationDate, $lte: new Date(filters.dateTo) };
      }

      if (filters.cardType) {
        query.cardType = filters.cardType;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.operatorId) {
        query.issuedBy = filters.operatorId;
      }

      const issuedCards = await Card.find(query)
        .populate('customer', 'firstName lastName nationalId phone')
        .populate('account', 'accountNumber accountType')
        .populate('issuedBy', 'firstName lastName')
        .sort({ generationDate: -1 });

      // لاگ عملیات
      await this.logOperation('GET_ISSUED_CARDS_REPORT', {
        operatorId,
        filters,
        resultCount: issuedCards.length
      });

      return {
        success: true,
        issuedCards: issuedCards.map(card => ({
          id: card._id,
          cardNumber: card.maskedCardNumber,
          cardholderName: card.cardholderName,
          customerName: card.customer ? `${card.customer.firstName} ${card.customer.lastName}` : 'نامشخص',
          nationalId: card.customer?.nationalId,
          phone: card.customer?.phone,
          accountNumber: card.account?.accountNumber,
          accountType: card.account?.accountType,
          cardType: card.cardType,
          cardNetwork: card.cardNetwork,
          status: card.status,
          generationDate: card.generationDate,
          activationDate: card.activationDate,
          issuedBy: card.issuedBy ? `${card.issuedBy.firstName} ${card.issuedBy.lastName}` : 'نامشخص',
          isReplacement: card.isReplacement,
          isEmergencyCard: card.isEmergencyCard,
          emergencyReason: card.emergencyReason
        })),
        totalCount: issuedCards.length
      };

    } catch (error) {
      console.error('خطا در دریافت گزارش کارت‌های صادر شده:', error);
      throw new Error(`خطا در دریافت گزارش کارت‌های صادر شده: ${error.message}`);
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

module.exports = CardIssuance;