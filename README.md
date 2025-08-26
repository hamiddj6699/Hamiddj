# 🏦 Banking API with JWT Authentication

یک API کامل بانکی با احراز هویت JWT برای مدیریت حساب‌ها و تراکنش‌ها

## ✨ ویژگی‌ها

- 🔐 احراز هویت JWT امن
- 👤 مدیریت کاربران و پروفایل
- 💰 مدیریت حساب‌های بانکی
- 💸 تراکنش‌های مالی
- 🛡️ امنیت بالا با validation و rate limiting
- 📊 پشتیبانی از MongoDB
- 🌐 API RESTful کامل

## 🚀 نصب و راه‌اندازی

### پیش‌نیازها

- Node.js (نسخه 16 یا بالاتر)
- MongoDB
- npm یا yarn

### مراحل نصب

1. **کلون کردن پروژه**
```bash
git clone <repository-url>
cd banking-jwt-api
```

2. **نصب وابستگی‌ها**
```bash
npm install
```

3. **تنظیم متغیرهای محیطی**
```bash
cp .env.example .env
```

فایل `.env` را ویرایش کنید:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
MONGODB_URI=mongodb://localhost:27017/banking-app
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

4. **راه‌اندازی سرور**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📚 API Endpoints

### 🔐 احراز هویت

| متد | مسیر | توضیحات |
|------|------|----------|
| POST | `/api/auth/register` | ثبت‌نام کاربر جدید |
| POST | `/api/auth/login` | ورود کاربر |
| GET | `/api/auth/profile` | دریافت پروفایل کاربر |
| PUT | `/api/auth/profile` | به‌روزرسانی پروفایل |
| PUT | `/api/auth/change-password` | تغییر رمز عبور |
| POST | `/api/auth/logout` | خروج کاربر |

### 💰 حساب‌های بانکی

| متد | مسیر | توضیحات |
|------|------|----------|
| POST | `/api/accounts` | ایجاد حساب جدید |
| GET | `/api/accounts` | دریافت لیست حساب‌ها |
| GET | `/api/accounts/:id` | دریافت جزئیات حساب |
| GET | `/api/accounts/:id/balance` | دریافت موجودی حساب |
| DELETE | `/api/accounts/:id` | بستن حساب |

### 💸 تراکنش‌ها

| متد | مسیر | توضیحات |
|------|------|----------|
| POST | `/api/accounts/transfer` | انتقال پول |
| GET | `/api/accounts/:id/transactions` | دریافت تراکنش‌های حساب |

## 🔑 احراز هویت

برای استفاده از API های محافظت شده، توکن JWT را در header درخواست قرار دهید:

```bash
Authorization: Bearer <your-jwt-token>
```

## 📝 نمونه درخواست‌ها

### ثبت‌نام کاربر جدید

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "علی",
    "lastName": "احمدی",
    "nationalId": "1234567890",
    "phone": "09123456789",
    "email": "ali@example.com",
    "password": "Password123!",
    "dateOfBirth": "1990-01-01",
    "address": {
      "street": "خیابان ولیعصر",
      "city": "تهران",
      "postalCode": "12345"
    }
  }'
```

### ورود کاربر

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ali@example.com",
    "password": "Password123!"
  }'
```

### ایجاد حساب جدید

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "accountType": "جاری",
    "currency": "IRR"
  }'
```

### انتقال پول

```bash
curl -X POST http://localhost:3000/api/accounts/transfer \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fromAccountId": "account_id_1",
    "toAccountId": "account_id_2",
    "amount": 1000000,
    "description": "انتقال پول"
  }'
```

## 🏗️ ساختار پروژه

```
banking-jwt-api/
├── config/
│   └── database.js          # تنظیمات اتصال به دیتابیس
├── controllers/
│   ├── authController.js     # کنترلر احراز هویت
│   └── accountController.js  # کنترلر حساب‌ها
├── middleware/
│   ├── auth.js              # میدلور احراز هویت JWT
│   └── validation.js        # میدلور اعتبارسنجی
├── models/
│   ├── User.js              # مدل کاربر
│   ├── Account.js           # مدل حساب
│   └── Transaction.js       # مدل تراکنش
├── routes/
│   ├── auth.js              # مسیرهای احراز هویت
│   └── accounts.js          # مسیرهای حساب‌ها
├── .env.example             # نمونه متغیرهای محیطی
├── package.json             # وابستگی‌ها
├── server.js                # فایل اصلی سرور
└── README.md                # مستندات
```

## 🛡️ امنیت

- **JWT Authentication**: احراز هویت امن با توکن
- **Password Hashing**: رمزنگاری رمز عبور با bcrypt
- **Input Validation**: اعتبارسنجی ورودی‌ها
- **Rate Limiting**: محدودیت تعداد درخواست‌ها
- **CORS Protection**: محافظت در برابر CORS
- **Helmet**: امنیت HTTP headers

## 🧪 تست

```bash
npm test
```

## 📊 متغیرهای محیطی

| متغیر | توضیحات | مقدار پیش‌فرض |
|--------|----------|----------------|
| `PORT` | پورت سرور | 3000 |
| `NODE_ENV` | محیط اجرا | development |
| `JWT_SECRET` | کلید رمزنگاری JWT | - |
| `JWT_EXPIRES_IN` | مدت اعتبار توکن | 24h |
| `MONGODB_URI` | آدرس اتصال به MongoDB | - |
| `BCRYPT_ROUNDS` | تعداد دور رمزنگاری | 12 |
| `RATE_LIMIT_WINDOW_MS` | پنجره زمانی rate limiting | 900000ms |
| `RATE_LIMIT_MAX_REQUESTS` | حداکثر تعداد درخواست | 100 |

## 🤝 مشارکت

برای مشارکت در پروژه:

1. Fork کنید
2. Branch جدید ایجاد کنید (`git checkout -b feature/amazing-feature`)
3. تغییرات را commit کنید (`git commit -m 'Add amazing feature'`)
4. Branch را push کنید (`git push origin feature/amazing-feature`)
5. Pull Request ایجاد کنید

## 📄 لایسنس

این پروژه تحت لایسنس MIT منتشر شده است.

## 📞 پشتیبانی

برای سوالات و مشکلات:
- Issue در GitHub ایجاد کنید
- ایمیل: support@example.com

---

**نکته**: این API برای استفاده در محیط production طراحی شده و شامل تمام ویژگی‌های امنیتی لازم است.
