# سرویس پیامک - راهنمای استفاده

## 🚀 شروع سریع

### 1. تست فوری (بدون نیاز به نصب)
```bash
node test-sms.js
```

### 2. تست کامل
```bash
node examples/sms-example.js
```

## 🔧 حالت توسعه

سرویس در حالت توسعه کار می‌کند و نیاز به کلید API واقعی ندارد:

- ✅ پیامک‌ها شبیه‌سازی می‌شوند
- ✅ موجودی حساب شبیه‌سازی می‌شود  
- ✅ وضعیت پیامک‌ها شبیه‌سازی می‌شود
- ✅ تمام قابلیت‌ها قابل تست هستند

## 📁 فایل‌های مهم

- `services/smsService.js` - سرویس اصلی پیامک
- `examples/sms-example.js` - مثال کامل استفاده
- `test-sms.js` - تست سریع
- `.env` - تنظیمات محیطی
- `SMS_SETUP.md` - راهنمای کامل

## 💡 نحوه استفاده

### ایجاد سرویس
```javascript
const SMSService = require('./services/smsService');
const smsService = new SMSService('kavehNegar');
```

### ارسال پیامک
```javascript
const result = await smsService.sendSMS(
  '09123456789', // شماره گیرنده
  'پیام شما'     // متن پیام
);
```

### بررسی موجودی
```javascript
const balance = await smsService.getBalance();
```

### بررسی وضعیت
```javascript
const status = await smsService.getMessageStatus(messageId);
```

## 🎯 ویژگی‌ها

- 🔧 حالت توسعه برای تست
- 📱 پشتیبانی از کاوه نگار
- 💰 بررسی موجودی حساب
- 📊 بررسی وضعیت پیامک
- 🚨 مدیریت خطاها
- 🌐 آماده برای تولید

## 🔄 تغییر به حالت تولید

برای استفاده واقعی، در فایل `.env`:

```env
SMS_DEVELOPMENT_MODE=false
KAVEH_NEGAR_API_KEY=کلید_واقعی_شما
KAVEH_NEGAR_SENDER=شناسه_فرستنده_واقعی_شما
```

## 🎉 آماده استفاده!

سرویس پیامک شما آماده است و می‌توانید آن را تست کنید!