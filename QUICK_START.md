# 🚀 راهنمای شروع سریع - سیستم تولید کارت بانکی

## ⚡ استقرار در 5 دقیقه

### 1. هاست اشتراکی (Shared Hosting)

#### مرحله 1: آپلود فایل‌ها
```bash
# فایل‌های زیر را در پوشه public_html آپلود کنید:
- public/index.html
- server.js
- package.json
- .env.example
- تمام پوشه‌ها (config, models, routes, utils, middleware)
```

#### مرحله 2: تنظیم .htaccess
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [QSA,L]
```

#### مرحله 3: اجرا
```bash
npm install --production
npm start
```

### 2. هاست VPS (VPS Hosting)

#### مرحله 1: نصب Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### مرحله 2: نصب MongoDB
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

#### مرحله 3: استقرار خودکار
```bash
chmod +x deploy.sh
./deploy.sh
```

### 3. هاست ابری (Cloud Hosting)

#### Heroku
```bash
npm install -g heroku
heroku login
heroku create your-app-name
git push heroku main
```

#### Railway
1. به [Railway.app](https://railway.app) بروید
2. با GitHub وارد شوید
3. پروژه را انتخاب کنید
4. متغیرهای محیطی را تنظیم کنید

#### Render
1. به [Render.com](https://render.com) بروید
2. اکانت ایجاد کنید
3. پروژه GitHub را انتخاب کنید
4. متغیرهای محیطی را تنظیم کنید

## 🔧 تنظیمات ضروری

### فایل .env
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/banking_system
JWT_SECRET=your_very_secure_secret_key_here
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://yourdomain.com
```

### متغیرهای مهم
- **JWT_SECRET**: کلید امنیتی برای JWT (حتماً تغییر دهید)
- **MONGODB_URI**: آدرس اتصال به دیتابیس
- **CORS_ORIGIN**: دامنه‌های مجاز برای CORS

## 📱 تست اپلیکیشن

### 1. تست سلامت سیستم
```bash
curl https://yourdomain.com/health
```

### 2. تست تولید کارت
```bash
curl -X POST https://yourdomain.com/api/cards/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"cardholderName":"علی احمدی","accountId":"ACCOUNT_ID","bankType":"شتاب","networkType":"UnionPay"}'
```

### 3. تست رابط کاربری
- مرورگر را باز کنید
- به آدرس `https://yourdomain.com` بروید
- فرم تولید کارت را تست کنید

## 🚨 مشکلات رایج

### مشکل 1: اپلیکیشن اجرا نمی‌شود
```bash
# بررسی لاگ‌ها
pm2 logs banking-system

# بررسی وضعیت
pm2 status

# راه‌اندازی مجدد
pm2 restart banking-system
```

### مشکل 2: خطای اتصال به دیتابیس
```bash
# بررسی وضعیت MongoDB
sudo systemctl status mongodb

# راه‌اندازی MongoDB
sudo systemctl start mongodb
```

### مشکل 3: خطای CORS
- فایل `.env` را بررسی کنید
- `CORS_ORIGIN` را درست تنظیم کنید

## 🔐 امنیت

### 1. تغییر JWT_SECRET
```env
JWT_SECRET=your_very_long_and_random_secret_key_here
```

### 2. فعال‌سازی HTTPS
```bash
# نصب Certbot
sudo apt-get install certbot python3-certbot-nginx

# دریافت گواهی SSL
sudo certbot --nginx -d yourdomain.com
```

### 3. تنظیم فایروال
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 📊 مانیتورینگ

### 1. مشاهده وضعیت
```bash
pm2 status
pm2 monit
```

### 2. مشاهده لاگ‌ها
```bash
pm2 logs banking-system
pm2 logs banking-system --lines 100
```

### 3. آمار سیستم
```bash
pm2 show banking-system
```

## 🆘 پشتیبانی

### 1. مستندات کامل
- [README.md](README.md) - راهنمای کامل
- [DEPLOYMENT.md](DEPLOYMENT.md) - راهنمای استقرار

### 2. گزارش مشکل
- GitHub Issues ایجاد کنید
- لاگ‌ها را بررسی کنید
- از جامعه توسعه‌دهندگان کمک بگیرید

---

**💡 نکته**: برای استفاده در محیط تولید، حتماً تنظیمات امنیتی اضافی انجام دهید!