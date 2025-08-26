# 🏦 سیستم تولید کارت بانکی

یک سیستم کامل و حرفه‌ای برای تولید کارت‌های بانکی با Track 1 و Track 2 واقعی، مشابه سیستم‌های درون شعبه بانک.

## ✨ ویژگی‌ها

- 🎯 **تولید کارت واقعی**: تولید کارت‌های بانکی با داده‌های Track 1 و Track 2 مطابق استاندارد ISO 7813
- 🔐 **امنیت بالا**: رمزنگاری PIN و CVV2، احراز هویت JWT
- 🏛️ **پشتیبانی از بانک‌های ایرانی**: شتاب، ملی، پارسیان، ملت، تجارت و سایر بانک‌ها
- 🌍 **شبکه‌های بین‌المللی**: Visa، MasterCard، American Express، Discover، UnionPay
- 📱 **رابط کاربری مدرن**: طراحی زیبا و کاربرپسند با پشتیبانی از زبان فارسی
- 📊 **مدیریت کامل**: تولید، فعال‌سازی، مسدود کردن و مدیریت کارت‌ها
- 🔄 **API کامل**: RESTful API برای یکپارچه‌سازی با سیستم‌های دیگر

## 🚀 نصب و راه‌اندازی سریع

### پیش‌نیازها

- Node.js نسخه 16 یا بالاتر
- MongoDB (محلی یا ابری)
- npm یا yarn

### نصب

1. **کلون کردن پروژه:**
```bash
git clone https://github.com/your-username/banking-card-system.git
cd banking-card-system
```

2. **نصب وابستگی‌ها:**
```bash
npm install
```

3. **تنظیم متغیرهای محیطی:**
```bash
cp .env.example .env
# فایل .env را ویرایش کنید
```

4. **راه‌اندازی:**
```bash
npm start
```

5. **باز کردن مرورگر:**
```
http://localhost:3000
```

## 🎯 استفاده

### تولید کارت جدید

1. به تب "تولید کارت جدید" بروید
2. اطلاعات صاحب کارت را وارد کنید
3. نوع بانک و شبکه را انتخاب کنید
4. روی "تولید کارت" کلیک کنید

### تولید کارت بانک ایرانی

1. به تب "کارت بانک ایرانی" بروید
2. نام صاحب کارت و شناسه حساب را وارد کنید
3. نوع بانک را انتخاب کنید
4. روی "تولید کارت ایرانی" کلیک کنید

### مدیریت کارت‌ها

- مشاهده لیست تمام کارت‌ها
- فعال‌سازی یا مسدود کردن کارت‌ها
- تنظیم محدودیت‌های روزانه و ماهانه
- مشاهده آمار و گزارش‌ها

## 🔧 تنظیمات

### متغیرهای محیطی

```env
# تنظیمات سرور
PORT=3000
NODE_ENV=production

# دیتابیس
MONGODB_URI=mongodb://localhost:27017/banking_system

# امنیت
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12

# محدودیت‌ها
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://yourdomain.com
```

### تنظیم دیتابیس

1. **MongoDB محلی:**
```bash
# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

2. **MongoDB Atlas (توصیه شده):**
- به [MongoDB Atlas](https://cloud.mongodb.com) بروید
- اکانت ایجاد کنید
- کلاستر جدید بسازید
- URI اتصال را کپی کنید

## 🌐 استقرار روی هاست

### هاست اشتراکی

1. فایل‌ها را در پوشه `public_html` آپلود کنید
2. فایل `.htaccess` را تنظیم کنید
3. `npm install` را اجرا کنید
4. `npm start` را اجرا کنید

### هاست VPS

1. **نصب Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **نصب MongoDB:**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

3. **استقرار با اسکریپت خودکار:**
```bash
chmod +x deploy.sh
./deploy.sh
```

### هاست ابری

#### Heroku
```bash
npm install -g heroku
heroku login
heroku create your-app-name
git push heroku main
```

#### Railway
- به [Railway.app](https://railway.app) بروید
- با GitHub وارد شوید
- پروژه را انتخاب کنید

#### Render
- به [Render.com](https://render.com) بروید
- اکانت ایجاد کنید
- پروژه GitHub را انتخاب کنید

## 📱 API Endpoints

### احراز هویت
- `POST /api/auth/register` - ثبت‌نام کاربر
- `POST /api/auth/login` - ورود کاربر

### کارت‌ها
- `POST /api/cards/generate` - تولید کارت جدید
- `POST /api/cards/generate-iranian` - تولید کارت ایرانی
- `GET /api/cards` - لیست کارت‌ها
- `GET /api/cards/:id` - اطلاعات کارت
- `PUT /api/cards/:id/activate` - فعال‌سازی کارت
- `PUT /api/cards/:id/block` - مسدود کردن کارت
- `GET /api/cards/stats/summary` - آمار کارت‌ها

### حساب‌ها
- `GET /api/accounts` - لیست حساب‌ها
- `POST /api/accounts` - ایجاد حساب جدید

## 🔐 امنیت

- **رمزنگاری**: PIN و CVV2 با SHA-256 رمزنگاری می‌شوند
- **احراز هویت**: JWT با زمان انقضا قابل تنظیم
- **محدودیت نرخ**: جلوگیری از حملات DDoS
- **CORS**: کنترل دسترسی‌های cross-origin
- **Helmet**: محافظت از هدرهای HTTP

## 📊 ویژگی‌های فنی

### Track 1 و Track 2
- **Track 1**: فرمت `%B[PAN]^[SURNAME]/[FIRSTNAME]^[YY][MM][SERVICE_CODE][DISCRETIONARY_DATA]?`
- **Track 2**: فرمت `;[PAN]=[YY][MM][SERVICE_CODE][DISCRETIONARY_DATA]?`

### الگوریتم Luhn
- تولید شماره کارت معتبر با استفاده از الگوریتم Luhn
- پشتیبانی از BIN های مختلف بانک‌ها

### مدیریت وضعیت
- فعال، غیرفعال، مسدود، منقضی، مفقود، سرقت
- ردیابی تلاش‌های ورود رمز
- محدودیت‌های روزانه و ماهانه

## 🛠️ توسعه

### ساختار پروژه
```
banking-card-system/
├── config/          # تنظیمات دیتابیس
├── controllers/     # کنترلرهای API
├── middleware/      # میدلورها
├── models/          # مدل‌های دیتابیس
├── public/          # فایل‌های استاتیک
├── routes/          # مسیرهای API
├── utils/           # ابزارهای کمکی
├── server.js        # فایل اصلی سرور
└── package.json     # وابستگی‌ها
```

### اجرای در حالت توسعه
```bash
npm run dev
```

### تست
```bash
npm test
```

## 📚 مستندات بیشتر

- [راهنمای استقرار](DEPLOYMENT.md) - راهنمای کامل استقرار
- [API Documentation](API.md) - مستندات کامل API
- [Security Guide](SECURITY.md) - راهنمای امنیت

## 🤝 مشارکت

1. پروژه را Fork کنید
2. شاخه جدید ایجاد کنید (`git checkout -b feature/amazing-feature`)
3. تغییرات را commit کنید (`git commit -m 'Add amazing feature'`)
4. به شاخه push کنید (`git push origin feature/amazing-feature`)
5. Pull Request ایجاد کنید

## 📄 مجوز

این پروژه تحت مجوز MIT منتشر شده است. برای جزئیات بیشتر فایل [LICENSE](LICENSE) را مطالعه کنید.

## ⚠️ هشدار مهم

**این سیستم صرفاً برای اهداف آموزشی و تست طراحی شده است. برای استفاده در محیط تولید واقعی، حتماً:**

1. تنظیمات امنیتی اضافی انجام دهید
2. از HTTPS استفاده کنید
3. فایروال و محدودیت‌های دسترسی تنظیم کنید
4. به‌روزرسانی‌های امنیتی را نصب کنید
5. پشتیبان‌گیری منظم انجام دهید

## 📞 پشتیبانی

- 📧 ایمیل: support@example.com
- 🐛 گزارش باگ: [Issues](https://github.com/your-username/banking-card-system/issues)
- 💬 بحث و گفتگو: [Discussions](https://github.com/your-username/banking-card-system/discussions)

---

**با تشکر از استفاده از سیستم تولید کارت بانکی! 🎉**
