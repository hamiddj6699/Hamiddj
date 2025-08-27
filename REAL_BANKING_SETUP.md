# راهنمای راه‌اندازی سیستم بانکی واقعی
# Real Banking System Setup Guide

## مقدمه
این راهنما برای راه‌اندازی سیستم بانکی واقعی با قابلیت‌های زیر طراحی شده است:

- **HSM (Hardware Security Module)** برای مدیریت کلیدهای امنیتی
- **DUKPT (Derived Unique Key Per Transaction)** برای تولید کلیدهای جلسه
- **Zone Keys (ZMK, ZPK, ZDK)** برای مدیریت کلیدهای منطقه‌ای
- **اتصال واقعی به شبکه شتاب** با mTLS و OAuth2
- **اتصال به بانک مرکزی** برای تأیید هویت
- **اتصال به بانک ملی** برای تأیید حساب
- **صدور کارت واقعی** با تراشه EMV

## پیش‌نیازها

### 1. سخت‌افزار
- **HSM تایید شده**: Thales PayShield 9000 یا معادل
- **سرور امن**: با قابلیت‌های رمزنگاری سخت‌افزاری
- **شبکه امن**: با دسترسی به شبکه‌های بانکی

### 2. نرم‌افزار
- **Node.js**: نسخه 18 یا بالاتر
- **MongoDB**: نسخه 5.0 یا بالاتر
- **OpenSSL**: برای مدیریت گواهی‌ها

### 3. مجوزها و دسترسی‌ها
- **مجوز بانک مرکزی** برای اتصال به سیستم‌های ملی
- **مجوز شبکه شتاب** برای اتصال به سوئیچ
- **مجوز بانک ملی** برای تأیید حساب‌ها
- **دسترسی به HSM** با کلیدهای مدیریتی

## مراحل راه‌اندازی

### مرحله 1: نصب وابستگی‌ها

```bash
# نصب وابستگی‌های Node.js
npm install

# نصب وابستگی‌های اضافی
npm install js-yaml node-cron
```

### مرحله 2: تنظیم متغیرهای محیطی

فایل `.env.real-banking` را کپی کرده و تنظیم کنید:

```bash
cp .env.real-banking .env
```

سپس مقادیر واقعی را در آن قرار دهید:

```bash
# تنظیمات HSM
HSM_ENDPOINT=https://hsm.your-bank.ir:8443
HSM_CERT_PATH=/etc/ssl/certs/hsm-client.crt
HSM_KEY_PATH=/etc/ssl/private/hsm-client.key
HSM_CA_PATH=/etc/ssl/certs/hsm-ca.crt
HSM_CLIENT_ID=YOUR_BANK_CARD_SYSTEM

# تنظیمات کلیدهای Zone
ZMK_LABEL=ZMK_MASTER_001
ZPK_LABEL=ZPK_DEFAULT_001
ZDK_LABEL=ZDK_DEFAULT_001

# تنظیمات DUKPT
BDK_LABEL=BDK_MASTER_001
IPEK_LABEL=IPEK_DEFAULT_001

# تنظیمات شبکه شتاب
SHETAB_SWITCH_HOST=shetab-switch.ir
SHETAB_SWITCH_PORT=8443
SHETAB_CERT_PATH=/etc/ssl/certs/shetab-client.crt
SHETAB_KEY_PATH=/etc/ssl/private/shetab-client.key
SHETAB_OAUTH_CLIENT_ID=your_shetab_client_id
SHETAB_OAUTH_CLIENT_SECRET=your_shetab_client_secret

# تنظیمات بانک مرکزی
CENTRAL_BANK_HOST=api.cbi.ir
CENTRAL_BANK_CERT_PATH=/etc/ssl/certs/cbi-client.crt
CENTRAL_BANK_KEY_PATH=/etc/ssl/private/cbi-client.key
CENTRAL_BANK_OAUTH_CLIENT_ID=your_cbi_client_id
CENTRAL_BANK_OAUTH_CLIENT_SECRET=your_cbi_client_secret

# تنظیمات بانک ملی
NATIONAL_BANK_HOST=api.bmi.ir
NATIONAL_BANK_CERT_PATH=/etc/ssl/certs/bmi-client.crt
NATIONAL_BANK_KEY_PATH=/etc/ssl/private/bmi-client.key
NATIONAL_BANK_OAUTH_CLIENT_ID=your_bmi_client_id
NATIONAL_BANK_OAUTH_CLIENT_SECRET=your_bmi_client_secret
```

### مرحله 3: تنظیم گواهی‌های SSL/mTLS

#### 3.1 ایجاد دایرکتوری‌های گواهی

```bash
sudo mkdir -p /etc/ssl/certs
sudo mkdir -p /etc/ssl/private
sudo mkdir -p /etc/banking
```

#### 3.2 کپی گواهی‌های HSM

```bash
# گواهی کلاینت HSM
sudo cp hsm-client.crt /etc/ssl/certs/
sudo cp hsm-client.key /etc/ssl/private/
sudo cp hsm-ca.crt /etc/ssl/certs/

# تنظیم مجوزهای مناسب
sudo chmod 644 /etc/ssl/certs/*.crt
sudo chmod 600 /etc/ssl/private/*.key
```

#### 3.3 کپی گواهی‌های شبکه‌های بانکی

```bash
# گواهی‌های شتاب
sudo cp shetab-client.crt /etc/ssl/certs/
sudo cp shetab-client.key /etc/ssl/private/
sudo cp shetab-ca.crt /etc/ssl/certs/

# گواهی‌های بانک مرکزی
sudo cp cbi-client.crt /etc/ssl/certs/
sudo cp cbi-client.key /etc/ssl/private/
sudo cp cbi-ca.crt /etc/ssl/certs/

# گواهی‌های بانک ملی
sudo cp bmi-client.crt /etc/ssl/certs/
sudo cp bmi-client.key /etc/ssl/private/
sudo cp bmi-ca.crt /etc/ssl/certs/
```

### مرحله 4: تنظیم فایل‌های کانفیگ بانکی

#### 4.1 کپی فایل‌های کانفیگ

```bash
sudo cp config/banking-standards.yaml /etc/banking/
sudo cp config/emv-profiles.yaml /etc/banking/
sudo cp config/switch-specs.yaml /etc/banking/
```

#### 4.2 تنظیم مجوزهای فایل‌ها

```bash
sudo chmod 644 /etc/banking/*.yaml
sudo chown root:root /etc/banking/*.yaml
```

### مرحله 5: راه‌اندازی HSM

#### 5.1 اتصال فیزیکی HSM

```bash
# بررسی اتصال HSM
ping hsm.your-bank.ir

# تست پورت
telnet hsm.your-bank.ir 8443
```

#### 5.2 تست اتصال HSM

```bash
# تست با OpenSSL
openssl s_client -connect hsm.your-bank.ir:8443 \
  -cert /etc/ssl/certs/hsm-client.crt \
  -key /etc/ssl/private/hsm-client.key \
  -CAfile /etc/ssl/certs/hsm-ca.crt
```

### مرحله 6: راه‌اندازی پایگاه داده

#### 6.1 نصب MongoDB

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mongodb

# CentOS/RHEL
sudo yum install mongodb-org
```

#### 6.2 راه‌اندازی MongoDB

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

#### 6.3 ایجاد پایگاه داده

```bash
mongo
use real_banking_system
db.createUser({
  user: "banking_user",
  pwd: "secure_password",
  roles: ["readWrite"]
})
exit
```

### مرحله 7: تست سیستم

#### 7.1 تست راه‌اندازی

```bash
# تست راه‌اندازی سیستم
node -e "
const RealBankingSystem = require('./services/realBankingSystem');
const system = new RealBankingSystem({
  binProfilesPath: '/etc/banking/bin-profiles.yaml',
  emvProfilesPath: '/etc/banking/emv-profiles.yaml',
  switchSpecsPath: '/etc/banking/switch-specs.yaml'
});

system.initialize()
  .then(() => console.log('سیستم با موفقیت راه‌اندازی شد'))
  .catch(err => console.error('خطا در راه‌اندازی:', err.message));
"
```

#### 7.2 تست صدور کارت

```bash
# تست صدور کارت
node -e "
const RealBankingSystem = require('./services/realBankingSystem');
const system = new RealBankingSystem({
  binProfilesPath: '/etc/banking/bin-profiles.yaml',
  emvProfilesPath: '/etc/banking/emv-profiles.yaml',
  switchSpecsPath: '/etc/banking/switch-specs.yaml'
});

async function testCardIssuance() {
  try {
    await system.initialize();
    
    const result = await system.issueCard(
      {
        customerId: 'TEST001',
        nationalId: '1234567890',
        fullName: 'احمد احمدی',
        birthDate: '1990-01-01',
        fatherName: 'محمد احمدی'
      },
      {
        accountNumber: '1234567890123456',
        branchCode: '001',
        binProfile: system.getConfiguration().binProfiles[0],
        emvProfile: system.getConfiguration().emvProfiles[0],
        pinPolicy: { length: 4, maxAttempts: 3 },
        expiryDate: new Date(Date.now() + 4 * 365 * 24 * 60 * 60 * 1000),
        serviceCode: '000'
      },
      'DEBIT',
      {
        operatorId: 'OP001',
        operatorName: 'کارمند تست',
        branchCode: '001'
      }
    );
    
    console.log('کارت با موفقیت صادر شد:', result);
    
  } catch (error) {
    console.error('خطا در صدور کارت:', error.message);
  } finally {
    await system.closeSystem();
  }
}

testCardIssuance();
"
```

## عیب‌یابی

### مشکلات رایج

#### 1. خطای اتصال HSM

```bash
# بررسی تنظیمات شبکه
ping hsm.your-bank.ir

# بررسی گواهی‌ها
openssl x509 -in /etc/ssl/certs/hsm-client.crt -text -noout

# بررسی کلید
openssl rsa -in /etc/ssl/private/hsm-client.key -check
```

#### 2. خطای اتصال شبکه‌های بانکی

```bash
# تست اتصال شتاب
telnet shetab-switch.ir 8443

# تست اتصال بانک مرکزی
telnet api.cbi.ir 8443

# تست اتصال بانک ملی
telnet api.bmi.ir 8443
```

#### 3. خطای پایگاه داده

```bash
# بررسی وضعیت MongoDB
sudo systemctl status mongod

# بررسی لاگ‌ها
sudo tail -f /var/log/mongodb/mongod.log

# تست اتصال
mongo --host localhost --port 27017
```

### لاگ‌ها و مانیتورینگ

#### 1. لاگ‌های سیستم

```bash
# لاگ‌های برنامه
tail -f /var/log/real_banking_system.log

# لاگ‌های HSM
tail -f /var/log/hsm.log

# لاگ‌های بانکی
tail -f /var/log/banking.log
```

#### 2. مانیتورینگ سلامت

```bash
# بررسی وضعیت سیستم
curl http://localhost:3000/api/health

# بررسی وضعیت HSM
curl http://localhost:3000/api/hsm/status

# بررسی وضعیت کلیدها
curl http://localhost:3000/api/dukpt/status
```

## امنیت

### 1. کنترل دسترسی

```bash
# محدود کردن دسترسی به فایل‌های حساس
sudo chmod 600 /etc/ssl/private/*.key
sudo chmod 644 /etc/ssl/certs/*.crt
sudo chown root:root /etc/ssl/private/*.key
sudo chown root:root /etc/ssl/certs/*.crt
```

### 2. فایروال

```bash
# تنظیم فایروال
sudo ufw allow 3000/tcp
sudo ufw allow 27017/tcp
sudo ufw enable
```

### 3. رمزنگاری

```bash
# بررسی رمزنگاری TLS
openssl s_client -connect localhost:3000 -servername localhost

# بررسی گواهی‌های HSM
openssl x509 -in /etc/ssl/certs/hsm-client.crt -text -noout
```

## نگهداری

### 1. پشتیبان‌گیری

```bash
# پشتیبان‌گیری از پایگاه داده
mongodump --db real_banking_system --out /backup/

# پشتیبان‌گیری از گواهی‌ها
sudo tar -czf /backup/certificates.tar.gz /etc/ssl/

# پشتیبان‌گیری از کانفیگ
sudo tar -czf /backup/config.tar.gz /etc/banking/
```

### 2. به‌روزرسانی

```bash
# به‌روزرسانی کد
git pull origin main

# نصب وابستگی‌های جدید
npm install

# راه‌اندازی مجدد
sudo systemctl restart real-banking-system
```

### 3. چرخش کلیدها

```bash
# چرخش کلیدهای Zone
node -e "
const RealBankingSystem = require('./services/realBankingSystem');
const system = new RealBankingSystem({...});

system.initialize()
  .then(() => system.rotateZoneKeys([
    { id: 'USER1', name: 'کاربر 1', role: 'KEY_HOLDER' },
    { id: 'USER2', name: 'کاربر 2', role: 'ADMIN' }
  ], 'FULL_ROTATION'))
  .then(result => console.log('چرخش کلیدها تکمیل شد:', result))
  .catch(err => console.error('خطا:', err.message))
  .finally(() => system.closeSystem());
"
```

## پشتیبانی

برای دریافت پشتیبانی:

1. **مستندات**: بررسی این راهنما و فایل‌های README
2. **لاگ‌ها**: بررسی لاگ‌های سیستم برای تشخیص مشکل
3. **تست**: انجام تست‌های استاندارد برای تأیید عملکرد
4. **تماس**: ارتباط با تیم پشتیبانی فنی

## نکات مهم

- **امنیت**: تمام کلیدها و گواهی‌ها باید در محیط امن نگهداری شوند
- **پشتیبان‌گیری**: انجام منظم پشتیبان‌گیری از تمام داده‌ها
- **مانیتورینگ**: نظارت مستمر بر عملکرد و سلامت سیستم
- **به‌روزرسانی**: نگهداری سیستم در آخرین نسخه‌های امنیتی
- **آزمایش**: تست تمام تغییرات در محیط آزمایش قبل از تولید