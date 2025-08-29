# راهنمای راه‌اندازی سرویس پیامک

## پیش‌نیازها

برای استفاده از سرویس پیامک، ابتدا باید پکیج `axios` را نصب کنید:

```bash
npm install axios
```

## تنظیم فایل .env

در فایل `.env` باید کلیدهای API کاوه نگار را تنظیم کنید:

```env
# SMS Configuration - Kaveh Negar
KAVEH_NEGAR_API_KEY=کلید_API_واقعی_شما
KAVEH_NEGAR_SENDER=شناسه_فرستنده_تاییدشده_شما
```

### نحوه دریافت کلیدهای API:

1. **کلید API**: از پنل کاربری کاوه نگار در بخش API Keys دریافت کنید
2. **شناسه فرستنده**: شماره یا نام فرستنده تایید شده از کاوه نگار

## استفاده از سرویس

### مثال ساده:

```javascript
const SMSService = require('./services/smsService');

// ایجاد نمونه سرویس
const smsService = new SMSService('kavehNegar');

// ارسال پیامک
try {
  const result = await smsService.sendSMS(
    '09123456789', // شماره گیرنده
    'سلام! این یک پیامک تست است.'
  );
  console.log('پیامک ارسال شد:', result);
} catch (error) {
  console.error('خطا:', error.message);
}
```

### بررسی موجودی حساب:

```javascript
const balance = await smsService.getBalance();
console.log('موجودی:', balance);
```

### بررسی وضعیت پیامک:

```javascript
const status = await smsService.getMessageStatus(messageId);
console.log('وضعیت:', status);
```

## اجرای مثال

برای اجرای مثال موجود:

```bash
node examples/sms-example.js
```

## نکات مهم

- شماره گیرنده باید با فرمت بین‌المللی باشد (مثل: 09123456789)
- شناسه فرستنده باید از کاوه نگار تایید شده باشد
- کلید API باید معتبر و فعال باشد
- موجودی حساب باید کافی باشد

## عیب‌یابی

### خطاهای رایج:

1. **"API key is not configured"**: کلید API در فایل .env تنظیم نشده
2. **"Sender ID is not configured"**: شناسه فرستنده تنظیم نشده
3. **"خطای API"**: مشکل در ارتباط با سرور کاوه نگار
4. **"موجودی ناکافی"**: موجودی حساب برای ارسال پیامک کافی نیست

## پشتیبانی

برای مشکلات بیشتر با پشتیبانی کاوه نگار تماس بگیرید یا مستندات API آنها را مطالعه کنید.