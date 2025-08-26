# راهنمای استقرار سیستم تولید کارت بانکی

## 🚀 استقرار روی هاست

این راهنما به شما کمک می‌کند تا سیستم تولید کارت بانکی را روی هاست‌های مختلف مستقر کنید.

## 📋 پیش‌نیازها

- Node.js نسخه 16 یا بالاتر
- MongoDB (محلی یا ابری)
- دسترسی SSH به سرور (برای VPS)
- یا پنل مدیریت هاست (برای هاست اشتراکی)

## 🌐 گزینه‌های استقرار

### 1. هاست اشتراکی (Shared Hosting)

#### مراحل استقرار:

1. **آپلود فایل‌ها:**
   - تمام فایل‌های پروژه را در پوشه `public_html` یا `www` آپلود کنید
   - فایل‌های `.env` و `node_modules` را آپلود نکنید

2. **تنظیم فایل `.htaccess`:**
   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^(.*)$ index.html [QSA,L]
   ```

3. **تنظیمات PHP (اگر هاست از PHP پشتیبانی می‌کند):**
   - فایل `package.json` را بررسی کنید
   - `npm install` را اجرا کنید
   - `npm start` را اجرا کنید

### 2. هاست VPS (Virtual Private Server)

#### مراحل استقرار:

1. **اتصال به سرور:**
   ```bash
   ssh username@your-server-ip
   ```

2. **نصب Node.js:**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # CentOS/RHEL
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs
   ```

3. **نصب MongoDB:**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install -y mongodb
   sudo systemctl start mongodb
   sudo systemctl enable mongodb
   
   # یا استفاده از MongoDB Atlas (توصیه شده)
   ```

4. **آپلود پروژه:**
   ```bash
   # ایجاد پوشه پروژه
   mkdir -p /var/www/banking-system
   cd /var/www/banking-system
   
   # آپلود فایل‌ها (از طریق SCP یا Git)
   git clone https://github.com/your-repo/banking-system.git .
   ```

5. **نصب وابستگی‌ها:**
   ```bash
   npm install --production
   ```

6. **تنظیم متغیرهای محیطی:**
   ```bash
   cp .env.example .env
   nano .env
   ```

7. **تنظیم فایل .env:**
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

8. **تنظیم PM2 برای مدیریت فرآیند:**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "banking-system"
   pm2 startup
   pm2 save
   ```

9. **تنظیم Nginx (اختیاری):**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

10. **تنظیم فایروال:**
    ```bash
    sudo ufw allow 22
    sudo ufw allow 80
    sudo ufw allow 443
    sudo ufw enable
    ```

### 3. هاست ابری (Cloud Hosting)

#### Heroku:

1. **نصب Heroku CLI:**
   ```bash
   npm install -g heroku
   ```

2. **ورود به Heroku:**
   ```bash
   heroku login
   ```

3. **ایجاد اپلیکیشن:**
   ```bash
   heroku create your-banking-app
   ```

4. **تنظیم متغیرهای محیطی:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your_secret_key
   heroku config:set MONGODB_URI=your_mongodb_uri
   ```

5. **استقرار:**
   ```bash
   git push heroku main
   ```

#### Railway:

1. **اتصال به GitHub:**
   - به [Railway.app](https://railway.app) بروید
   - با GitHub خود وارد شوید
   - پروژه را انتخاب کنید

2. **تنظیمات:**
   - متغیرهای محیطی را تنظیم کنید
   - دامنه سفارشی اضافه کنید

3. **استقرار خودکار:**
   - با هر push به GitHub، اپلیکیشن به‌روزرسانی می‌شود

#### Render:

1. **ایجاد اکانت:**
   - به [Render.com](https://render.com) بروید
   - اکانت ایجاد کنید

2. **اتصال به GitHub:**
   - پروژه GitHub را انتخاب کنید
   - تنظیمات را انجام دهید

3. **تنظیم متغیرهای محیطی:**
   - در بخش Environment Variables متغیرها را اضافه کنید

## 🔧 تنظیمات امنیتی

### 1. فایروال:
```bash
# فقط پورت‌های ضروری را باز کنید
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. SSL/HTTPS:
```bash
# نصب Certbot
sudo apt-get install certbot python3-certbot-nginx

# دریافت گواهی SSL
sudo certbot --nginx -d yourdomain.com
```

### 3. به‌روزرسانی‌های امنیتی:
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

## 📊 مانیتورینگ و نگهداری

### 1. لاگ‌ها:
```bash
# مشاهده لاگ‌های PM2
pm2 logs banking-system

# مشاهده لاگ‌های سیستم
sudo journalctl -u nginx
sudo tail -f /var/log/mongodb/mongod.log
```

### 2. پشتیبان‌گیری:
```bash
# پشتیبان‌گیری از MongoDB
mongodump --db banking_system --out /backup/$(date +%Y%m%d)

# پشتیبان‌گیری از فایل‌ها
tar -czf /backup/app-$(date +%Y%m%d).tar.gz /var/www/banking-system
```

### 3. به‌روزرسانی اپلیکیشن:
```bash
cd /var/www/banking-system
git pull origin main
npm install --production
pm2 restart banking-system
```

## 🚨 عیب‌یابی مشکلات رایج

### 1. اپلیکیشن اجرا نمی‌شود:
```bash
# بررسی وضعیت PM2
pm2 status
pm2 logs banking-system

# بررسی پورت‌ها
sudo netstat -tlnp | grep :3000
```

### 2. مشکل اتصال به دیتابیس:
```bash
# بررسی وضعیت MongoDB
sudo systemctl status mongodb

# تست اتصال
mongo --host localhost --port 27017
```

### 3. مشکل CORS:
- فایل `.env` را بررسی کنید
- `CORS_ORIGIN` را درست تنظیم کنید

## 📱 تست اپلیکیشن

### 1. تست API:
```bash
# تست سلامت سیستم
curl https://yourdomain.com/health

# تست تولید کارت
curl -X POST https://yourdomain.com/api/cards/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"cardholderName":"علی احمدی","accountId":"ACCOUNT_ID","bankType":"شتاب","networkType":"UnionPay"}'
```

### 2. تست رابط کاربری:
- مرورگر را باز کنید
- به آدرس `https://yourdomain.com` بروید
- فرم تولید کارت را تست کنید

## 🔐 نکات امنیتی مهم

1. **هرگز JWT_SECRET را در کد قرار ندهید**
2. **از HTTPS استفاده کنید**
3. **فایروال را فعال کنید**
4. **به‌روزرسانی‌های امنیتی را نصب کنید**
5. **پشتیبان‌گیری منظم انجام دهید**
6. **لاگ‌ها را بررسی کنید**

## 📞 پشتیبانی

در صورت بروز مشکل:
1. لاگ‌ها را بررسی کنید
2. مستندات را مطالعه کنید
3. از جامعه توسعه‌دهندگان کمک بگیرید

---

**نکته:** این سیستم برای استفاده آموزشی و تست طراحی شده است. برای استفاده در محیط تولید واقعی، حتماً تنظیمات امنیتی اضافی انجام دهید.