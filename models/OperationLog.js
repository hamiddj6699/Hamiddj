const mongoose = require('mongoose');

/**
 * مدل لاگ عملیات
 * Operation Log Model for Banking Operations
 */
const operationLogSchema = new mongoose.Schema({
  // نوع عملیات
  operationType: {
    type: String,
    required: true,
    enum: [
      // عملیات کارت
      'ISSUE_NEW_CARD',
      'ISSUE_REPLACEMENT_CARD',
      'ISSUE_EMERGENCY_CARD',
      'ISSUE_CARD_FOR_EXISTING_ACCOUNT',
      'ACTIVATE_ISSUED_CARD',
      'BLOCK_CARD',
      'UNBLOCK_CARD',
      'CHANGE_CARD_PIN',
      'RESET_PIN_ATTEMPTS',
      'UPDATE_CARD_LIMITS',
      'CHECK_CARD_STATUS',
      'SYNC_CARD_STATUS',
      
      // مدیریت کارت‌های موجود
      'VIEW_CUSTOMER_CARDS',
      'GET_BLOCKED_CARDS_REPORT',
      'GET_ISSUED_CARDS_REPORT',
      
      // عملیات شبکه بانکی
      'SHETAB_CARD_BLOCK',
      'SHETAB_CARD_ACTIVATE',
      'SHETAB_CARD_ISSUE',
      'SHETAB_PIN_CHANGE',
      'SHETAB_STATUS_CHECK',
      
      // تایید هویت و حساب
      'IDENTITY_VERIFICATION',
      'ACCOUNT_VERIFICATION',
      'BALANCE_CHECK',
      
      // عملیات سیستمی
      'USER_LOGIN',
      'USER_LOGOUT',
      'PERMISSION_CHANGE',
      'SYSTEM_CONFIG_CHANGE',
      
      // عملیات امنیتی
      'SECURITY_ALERT',
      'SUSPICIOUS_ACTIVITY',
      'ACCESS_DENIED',
      'RATE_LIMIT_EXCEEDED'
    ]
  },

  // داده‌های عملیات
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // شناسه کاربر انجام‌دهنده
  operatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // اطلاعات کاربر انجام‌دهنده
  operatorInfo: {
    firstName: String,
    lastName: String,
    nationalId: String,
    role: String,
    branch: String
  },

  // شناسه درخواست شبکه بانکی
  shetabRequestId: String,

  // نتیجه عملیات
  result: {
    success: {
      type: Boolean,
      default: true
    },
    message: String,
    errorCode: String,
    errorDetails: String
  },

  // اطلاعات امنیتی
  security: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    requestId: String
  },

  // زمان‌بندی
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },

  // مدت زمان اجرا (میلی‌ثانیه)
  executionTime: Number,

  // اولویت لاگ
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },

  // برچسب‌های اضافی
  tags: [String],

  // وضعیت پردازش
  processingStatus: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'COMPLETED'
  },

  // اطلاعات اضافی
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// ایندکس‌ها برای جستجوی سریع
operationLogSchema.index({ operationType: 1, timestamp: -1 });
operationLogSchema.index({ operatorId: 1, timestamp: -1 });
operationLogSchema.index({ shetabRequestId: 1 });
operationLogSchema.index({ 'security.ipAddress': 1, timestamp: -1 });
operationLogSchema.index({ priority: 1, timestamp: -1 });
operationLogSchema.index({ 'result.success': 1, timestamp: -1 });

// متدهای استاتیک
operationLogSchema.statics = {
  /**
   * دریافت لاگ‌های عملیات با فیلتر
   */
  async getOperationLogs(filters = {}, options = {}) {
    const query = {};
    const sort = { timestamp: -1 };
    const limit = options.limit || 100;
    const skip = options.skip || 0;

    // اعمال فیلترها
    if (filters.operationType) {
      query.operationType = filters.operationType;
    }

    if (filters.operatorId) {
      query.operatorId = filters.operatorId;
    }

    if (filters.success !== undefined) {
      query['result.success'] = filters.success;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.dateFrom) {
      query.timestamp = { $gte: new Date(filters.dateFrom) };
    }

    if (filters.dateTo) {
      query.timestamp = { ...query.timestamp, $lte: new Date(filters.dateTo) };
    }

    if (filters.shetabRequestId) {
      query.shetabRequestId = filters.shetabRequestId;
    }

    if (filters.ipAddress) {
      query['security.ipAddress'] = filters.ipAddress;
    }

    // اعمال گزینه‌های مرتب‌سازی
    if (options.sortBy) {
      sort[options.sortBy] = options.sortOrder === 'asc' ? 1 : -1;
    }

    const logs = await this.find(query)
      .populate('operatorId', 'firstName lastName nationalId role')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await this.countDocuments(query);

    return {
      logs,
      total,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit),
      hasNext: skip + limit < total,
      hasPrev: skip > 0
    };
  },

  /**
   * دریافت آمار عملیات
   */
  async getOperationStats(filters = {}) {
    const matchStage = {};

    // اعمال فیلترها
    if (filters.dateFrom) {
      matchStage.timestamp = { $gte: new Date(filters.dateFrom) };
    }

    if (filters.dateTo) {
      matchStage.timestamp = { ...matchStage.timestamp, $lte: new Date(filters.dateTo) };
    }

    if (filters.operationType) {
      matchStage.operationType = filters.operationType;
    }

    const stats = await this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            operationType: '$operationType',
            success: '$result.success',
            priority: '$priority'
          },
          count: { $sum: 1 },
          avgExecutionTime: { $avg: '$executionTime' },
          totalExecutionTime: { $sum: '$executionTime' }
        }
      },
      {
        $group: {
          _id: '$_id.operationType',
          totalCount: { $sum: '$count' },
          successCount: {
            $sum: {
              $cond: [{ $eq: ['$_id.success', true] }, '$count', 0]
            }
          },
          failureCount: {
            $sum: {
              $cond: [{ $eq: ['$_id.success', false] }, '$count', 0]
            }
          },
          avgExecutionTime: { $avg: '$avgExecutionTime' },
          priorityBreakdown: {
            $push: {
              priority: '$_id.priority',
              count: '$count'
            }
          }
        }
      },
      { $sort: { totalCount: -1 } }
    ]);

    return stats;
  },

  /**
   * دریافت لاگ‌های امنیتی
   */
  async getSecurityLogs(filters = {}) {
    const query = {
      $or: [
        { operationType: { $in: ['SECURITY_ALERT', 'SUSPICIOUS_ACTIVITY', 'ACCESS_DENIED'] } },
        { priority: { $in: ['HIGH', 'CRITICAL'] } },
        { 'result.success': false }
      ]
    };

    // اعمال فیلترهای اضافی
    if (filters.dateFrom) {
      query.timestamp = { $gte: new Date(filters.dateFrom) };
    }

    if (filters.dateTo) {
      query.timestamp = { ...query.timestamp, $lte: new Date(filters.dateTo) };
    }

    if (filters.ipAddress) {
      query['security.ipAddress'] = filters.ipAddress;
    }

    const securityLogs = await this.find(query)
      .populate('operatorId', 'firstName lastName nationalId role')
      .sort({ timestamp: -1 })
      .limit(filters.limit || 100);

    return securityLogs;
  },

  /**
   * پاک‌سازی لاگ‌های قدیمی
   */
  async cleanupOldLogs(retentionDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.deleteMany({
      timestamp: { $lt: cutoffDate },
      priority: { $ne: 'CRITICAL' } // لاگ‌های بحرانی را نگه می‌داریم
    });

    return {
      deletedCount: result.deletedCount,
      cutoffDate: cutoffDate
    };
  }
};

// متدهای نمونه
operationLogSchema.methods = {
  /**
   * به‌روزرسانی نتیجه عملیات
   */
  updateResult(success, message, errorCode = null, errorDetails = null) {
    this.result = {
      success,
      message,
      errorCode,
      errorDetails
    };

    if (!success) {
      this.priority = 'HIGH';
      this.processingStatus = 'FAILED';
    }

    return this.save();
  },

  /**
   * اضافه کردن برچسب
   */
  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
    return this.save();
  },

  /**
   * تنظیم اولویت
   */
  setPriority(priority) {
    this.priority = priority;
    return this.save();
  },

  /**
   * محاسبه مدت زمان اجرا
   */
  setExecutionTime(startTime) {
    this.executionTime = Date.now() - startTime;
    return this.save();
  }
};

// میدلور قبل از ذخیره
operationLogSchema.pre('save', function(next) {
  // تنظیم خودکار اولویت بر اساس نوع عملیات
  if (this.operationType.includes('SECURITY') || this.operationType.includes('CRITICAL')) {
    this.priority = 'CRITICAL';
  } else if (this.operationType.includes('EMERGENCY')) {
    this.priority = 'HIGH';
  } else if (this.operationType.includes('REPORT')) {
    this.priority = 'LOW';
  }

  // تنظیم خودکار برچسب‌ها
  if (this.operationType.includes('SHETAB')) {
    this.addTag('SHETAB_NETWORK');
  }

  if (this.operationType.includes('CARD')) {
    this.addTag('CARD_OPERATION');
  }

  if (this.operationType.includes('SECURITY')) {
    this.addTag('SECURITY');
  }

  next();
});

module.exports = mongoose.model('OperationLog', operationLogSchema);