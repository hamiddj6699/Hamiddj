/**
 * تنظیمات اصلی سیستم بانکی
 * Main Banking System Configuration
 */

const path = require('path');

module.exports = {
  // تنظیمات سرور
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    environment: process.env.NODE_ENV || 'development'
  },

  // تنظیمات پایگاه داده
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/real_banking_system',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority'
    }
  },

  // تنظیمات HSM
  hsm: {
    endpoint: process.env.HSM_ENDPOINT || 'https://hsm.bank.ir:8443',
    certPath: process.env.HSM_CERT_PATH || '/etc/ssl/certs/hsm-client.crt',
    keyPath: process.env.HSM_KEY_PATH || '/etc/ssl/private/hsm-client.key',
    caPath: process.env.HSM_CA_PATH || '/etc/ssl/certs/hsm-ca.crt',
    clientId: process.env.HSM_CLIENT_ID || 'BANK_CARD_SYSTEM',
    timeout: parseInt(process.env.HSM_TIMEOUT) || 30000,
    retryAttempts: parseInt(process.env.HSM_RETRY_ATTEMPTS) || 3
  },

  // تنظیمات کلیدهای Zone
  zoneKeys: {
    zmkLabel: process.env.ZMK_LABEL || 'ZMK_MASTER',
    zpkLabel: process.env.ZPK_LABEL || 'ZPK_DEFAULT',
    zdkLabel: process.env.ZDK_LABEL || 'ZDK_DEFAULT'
  },

  // تنظیمات DUKPT
  dukpt: {
    bdkLabel: process.env.BDK_LABEL || 'BDK_MASTER',
    ipekLabel: process.env.IPEK_LABEL || 'IPEK_DEFAULT',
    sessionDuration: parseInt(process.env.DUKPT_SESSION_DURATION) || 86400000,
    maxSessions: parseInt(process.env.DUKPT_MAX_SESSIONS) || 1000
  },

  // تنظیمات شبکه شتاب
  shetab: {
    host: process.env.SHETAB_SWITCH_HOST || 'shetab-switch.ir',
    port: parseInt(process.env.SHETAB_SWITCH_PORT) || 8443,
    protocol: process.env.SHETAB_SWITCH_PROTOCOL || 'ISO8583',
    timeout: parseInt(process.env.SHETAB_SWITCH_TIMEOUT) || 30000,
    retryAttempts: parseInt(process.env.SHETAB_SWITCH_RETRY_ATTEMPTS) || 3,
    certPath: process.env.SHETAB_CERT_PATH || '/etc/ssl/certs/shetab-client.crt',
    keyPath: process.env.SHETAB_KEY_PATH || '/etc/ssl/private/shetab-client.key',
    caPath: process.env.SHETAB_CA_PATH || '/etc/ssl/certs/shetab-ca.crt',
    oauth: {
      tokenUrl: process.env.SHETAB_OAUTH_TOKEN_URL || 'https://auth.shetab.ir/oauth2/token',
      clientId: process.env.SHETAB_OAUTH_CLIENT_ID || 'shetab_client_id',
      clientSecret: process.env.SHETAB_OAUTH_CLIENT_SECRET || 'shetab_client_secret',
      scope: process.env.SHETAB_OAUTH_SCOPE || 'card_management account_verification'
    }
  },

  // تنظیمات بانک مرکزی
  centralBank: {
    host: process.env.CENTRAL_BANK_HOST || 'api.cbi.ir',
    port: parseInt(process.env.CENTRAL_BANK_PORT) || 8443,
    protocol: process.env.CENTRAL_BANK_PROTOCOL || 'HTTPS_MTLS',
    timeout: parseInt(process.env.CENTRAL_BANK_TIMEOUT) || 30000,
    certPath: process.env.CENTRAL_BANK_CERT_PATH || '/etc/ssl/certs/cbi-client.crt',
    keyPath: process.env.CENTRAL_BANK_KEY_PATH || '/etc/ssl/private/cbi-client.key',
    caPath: process.env.CENTRAL_BANK_CA_PATH || '/etc/ssl/certs/cbi-ca.crt',
    oauth: {
      tokenUrl: process.env.CENTRAL_BANK_OAUTH_TOKEN_URL || 'https://auth.cbi.ir/oauth2/token',
      clientId: process.env.CENTRAL_BANK_OAUTH_CLIENT_ID || 'cbi_client_id',
      clientSecret: process.env.CENTRAL_BANK_OAUTH_CLIENT_SECRET || 'cbi_client_secret',
      scope: process.env.CENTRAL_BANK_OAUTH_SCOPE || 'identity_verification card_registration'
    }
  },

  // تنظیمات بانک ملی
  nationalBank: {
    host: process.env.NATIONAL_BANK_HOST || 'api.bmi.ir',
    port: parseInt(process.env.NATIONAL_BANK_PORT) || 8443,
    protocol: process.env.NATIONAL_BANK_PROTOCOL || 'HTTPS_MTLS',
    timeout: parseInt(process.env.NATIONAL_BANK_TIMEOUT) || 30000,
    certPath: process.env.NATIONAL_BANK_CERT_PATH || '/etc/ssl/certs/bmi-client.crt',
    keyPath: process.env.NATIONAL_BANK_KEY_PATH || '/etc/ssl/private/bmi-client.key',
    caPath: process.env.NATIONAL_BANK_CA_PATH || '/etc/ssl/certs/bmi-ca.crt',
    oauth: {
      tokenUrl: process.env.NATIONAL_BANK_OAUTH_TOKEN_URL || 'https://auth.bmi.ir/oauth2/token',
      clientId: process.env.NATIONAL_BANK_OAUTH_CLIENT_ID || 'bmi_client_id',
      clientSecret: process.env.NATIONAL_BANK_OAUTH_CLIENT_SECRET || 'bmi_client_secret',
      scope: process.env.NATIONAL_BANK_OAUTH_SCOPE || 'account_verification balance_inquiry'
    }
  },

  // تنظیمات امنیتی
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    }
  },

  // تنظیمات PIN
  pin: {
    defaultLength: parseInt(process.env.PIN_DEFAULT_LENGTH) || 4,
    minLength: parseInt(process.env.PIN_MIN_LENGTH) || 4,
    maxLength: parseInt(process.env.PIN_MAX_LENGTH) || 6,
    allowRepeatedDigits: process.env.PIN_ALLOW_REPEATED_DIGITS === 'true' ? true : false,
    allowSequentialDigits: process.env.PIN_ALLOW_SEQUENTIAL_DIGITS === 'true' ? true : false,
    allowCommonPINs: process.env.PIN_ALLOW_COMMON_PINS === 'true' ? true : false,
    maxAttempts: parseInt(process.env.PIN_MAX_ATTEMPTS) || 3,
    lockoutDurationHours: parseInt(process.env.PIN_LOCKOUT_DURATION_HOURS) || 24,
    requireComplexity: process.env.PIN_REQUIRE_COMPLEXITY === 'true' ? true : false
  },

  // تنظیمات CVV2
  cvv2: {
    algorithm: process.env.CVV2_ALGORITHM || 'VISA_PVV',
    length: parseInt(process.env.CVV2_LENGTH) || 3,
    includeExpiry: process.env.CVV2_INCLUDE_EXPIRY === 'true' ? true : false,
    includeServiceCode: process.env.CVV2_INCLUDE_SERVICE_CODE === 'true' ? true : false
  },

  // تنظیمات محدودیت‌های تراکنش
  transactionLimits: {
    dailyATM: parseInt(process.env.TRANSACTION_LIMITS_DAILY_ATM) || 5000000,
    dailyPOS: parseInt(process.env.TRANSACTION_LIMITS_DAILY_POS) || 10000000,
    monthlyTotal: parseInt(process.env.TRANSACTION_LIMITS_MONTHLY_TOTAL) || 100000000,
    singleMax: parseInt(process.env.TRANSACTION_LIMITS_SINGLE_MAX) || 1000000
  },

  // تنظیمات چرخش کلید
  keyRotation: {
    zmkRotationPeriodDays: parseInt(process.env.ZMK_ROTATION_PERIOD_DAYS) || 90,
    zpkRotationPeriodDays: parseInt(process.env.ZPK_ROTATION_PERIOD_DAYS) || 180,
    zdkRotationPeriodDays: parseInt(process.env.ZDK_ROTATION_PERIOD_DAYS) || 365,
    requireQuorum: process.env.KEY_ROTATION_REQUIRE_QUORUM === 'true' ? true : false,
    minQuorumSize: parseInt(process.env.KEY_ROTATION_MIN_QUORUM_SIZE) || 2,
    maxQuorumSize: parseInt(process.env.KEY_ROTATION_MAX_QUORUM_SIZE) || 4
  },

  // تنظیمات تشریفات کلید
  keyCeremony: {
    requirePhysicalPresence: process.env.KEY_CEREMONY_REQUIRE_PHYSICAL_PRESENCE === 'true' ? true : false,
    requireIdentityVerification: process.env.KEY_CEREMONY_REQUIRE_IDENTITY_VERIFICATION === 'true' ? true : false,
    requireWitness: process.env.KEY_CEREMONY_REQUIRE_WITNESS === 'true' ? true : false,
    minParticipants: parseInt(process.env.KEY_CEREMONY_MIN_PARTICIPANTS) || 2,
    maxParticipants: parseInt(process.env.KEY_CEREMONY_MAX_PARTICIPANTS) || 6,
    recordingRequired: process.env.KEY_CEREMONY_RECORDING_REQUIRED === 'true' ? true : false,
    documentationRequired: process.env.KEY_CEREMONY_DOCUMENTATION_REQUIRED === 'true' ? true : false
  },

  // تنظیمات فایل‌های کانفیگ
  configFiles: {
    binProfilesPath: process.env.BIN_PROFILES_PATH || '/etc/banking/bin-profiles.yaml',
    emvProfilesPath: process.env.EMV_PROFILES_PATH || '/etc/banking/emv-profiles.yaml',
    switchSpecsPath: process.env.SWITCH_SPECS_PATH || '/etc/banking/switch-specs.yaml',
    pinPoliciesPath: process.env.PIN_POLICIES_PATH || '/etc/banking/pin-policies.yaml',
    cvv2PoliciesPath: process.env.CVV2_POLICIES_PATH || '/etc/banking/cvv2-policies.yaml'
  },

  // تنظیمات لاگ و مانیتورینگ
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    logFile: process.env.LOG_FILE || '/var/log/real_banking_system.log',
    auditLogFile: process.env.AUDIT_LOG_FILE || '/var/log/real_banking_audit.log',
    monitoring: {
      enabled: process.env.MONITORING_ENABLED === 'true' ? true : false,
      intervalMs: parseInt(process.env.MONITORING_INTERVAL_MS) || 30000
    }
  },

  // تنظیمات پشتیبان‌گیری
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true' ? true : false,
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 90,
    storagePath: process.env.BACKUP_STORAGE_PATH || '/backup/real_banking_system',
    encryptionEnabled: process.env.BACKUP_ENCRYPTION_ENABLED === 'true' ? true : false
  },

  // تنظیمات تست و توسعه
  development: {
    testMode: process.env.TEST_MODE === 'true' ? true : false,
    debugMode: process.env.DEBUG_MODE === 'true' ? true : false,
    mockHSMEnabled: process.env.MOCK_HSM_ENABLED === 'true' ? true : false,
    mockBankingEnabled: process.env.MOCK_BANKING_ENABLED === 'true' ? true : false
  }
};