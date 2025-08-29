# Dockerfile برای POS SDK 7220
# Multi-stage build برای بهینه‌سازی اندازه image

# مرحله 1: Build stage
FROM node:16-alpine AS builder

# تنظیم متغیرهای محیطی
ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=warn

# نصب ابزارهای ضروری
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# ایجاد دایرکتوری کاری
WORKDIR /app

# کپی کردن فایل‌های package
COPY package*.json ./

# نصب وابستگی‌ها
RUN npm ci --only=production && npm cache clean --force

# کپی کردن کد منبع
COPY . .

# ساخت پروژه
RUN npm run build || echo "Build script not found, copying source files"

# مرحله 2: Production stage
FROM node:16-alpine AS production

# نصب ابزارهای ضروری برای POS
RUN apk add --no-cache \
    curl \
    wget \
    bash \
    vim \
    nano \
    htop \
    procps \
    # ابزارهای شبکه
    net-tools \
    iputils \
    # ابزارهای USB و Serial
    usbutils \
    # ابزارهای امنیت
    openssh \
    # ابزارهای لاگ
    logrotate \
    # ابزارهای مانیتورینگ
    sysstat

# ایجاد کاربر غیر-root
RUN addgroup -g 1001 -S posuser && \
    adduser -S posuser -u 1001

# ایجاد دایرکتوری‌های ضروری
RUN mkdir -p /app /home/posuser/logs /home/posuser/data /home/posuser/config && \
    chown -R posuser:posuser /app /home/posuser

# تنظیم دایرکتوری کاری
WORKDIR /app

# کپی کردن فایل‌های ساخته شده از مرحله builder
COPY --from=builder --chown=posuser:posuser /app/dist ./src
COPY --from=builder --chown=posuser:posuser /app/package*.json ./
COPY --from=builder --chown=posuser:posuser /app/config ./config
COPY --from=builder --chown=posuser:posuser /app/examples ./examples
COPY --from=builder --chown=posuser:posuser /app/scripts ./scripts

# نصب وابستگی‌های تولید
RUN npm ci --only=production && npm cache clean --force

# کپی کردن فایل‌های پیکربندی
COPY --chown=posuser:posuser docker/entrypoint.sh /usr/local/bin/
COPY --chown=posuser:posuser docker/healthcheck.sh /usr/local/bin/

# تنظیم مجوزها
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/healthcheck.sh

# ایجاد دایرکتوری‌های لاگ و داده
RUN mkdir -p /var/log/pos-app /var/lib/pos-app && \
    chown -R posuser:posuser /var/log/pos-app /var/lib/pos-app

# تنظیم متغیرهای محیطی
ENV NODE_ENV=production
ENV POS_APP_HOME=/app
ENV POS_APP_LOGS=/var/log/pos-app
ENV POS_APP_DATA=/var/lib/pos-app
ENV POS_APP_CONFIG=/app/config

# تنظیم پورت‌ها
EXPOSE 3000

# تنظیم volume ها
VOLUME ["/var/log/pos-app", "/var/lib/pos-app", "/app/config"]

# تغییر به کاربر غیر-root
USER posuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# دستور پیش‌فرض
CMD ["node", "src/index.js"]

# مرحله 3: Development stage (اختیاری)
FROM node:16-alpine AS development

# نصب ابزارهای توسعه
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    wget \
    bash \
    vim \
    nano \
    htop \
    procps \
    net-tools \
    iputils \
    usbutils \
    openssh \
    logrotate \
    sysstat

# ایجاد کاربر توسعه
RUN addgroup -g 1001 -S devuser && \
    adduser -S devuser -u 1001

# ایجاد دایرکتوری کاری
WORKDIR /app

# کپی کردن فایل‌های package
COPY package*.json ./

# نصب تمام وابستگی‌ها (شامل dev dependencies)
RUN npm install

# کپی کردن کد منبع
COPY . .

# تنظیم مجوزها
RUN chown -R devuser:devuser /app

# تغییر به کاربر توسعه
USER devuser

# تنظیم متغیرهای محیطی
ENV NODE_ENV=development
ENV POS_APP_HOME=/app
ENV POS_APP_LOGS=/app/logs
ENV POS_APP_DATA=/app/data
ENV POS_APP_CONFIG=/app/config

# تنظیم پورت‌ها
EXPOSE 3000 9229

# دستور پیش‌فرض برای توسعه
CMD ["npm", "run", "dev"]

# مرحله 4: Testing stage (اختیاری)
FROM node:16-alpine AS testing

# نصب ابزارهای تست
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    wget \
    bash

# ایجاد دایرکتوری کاری
WORKDIR /app

# کپی کردن فایل‌های package
COPY package*.json ./

# نصب تمام وابستگی‌ها
RUN npm install

# کپی کردن کد منبع
COPY . .

# اجرای تست‌ها
RUN npm test

# اگر تست‌ها موفق بودند، ادامه دهید
RUN npm run build || echo "Build script not found"

# تنظیم متغیرهای محیطی
ENV NODE_ENV=testing
ENV POS_APP_HOME=/app
ENV POS_APP_LOGS=/app/logs
ENV POS_APP_DATA=/app/data
ENV POS_APP_CONFIG=/app/config

# دستور پیش‌فرض برای تست
CMD ["npm", "test"]

# مرحله 5: Security stage (اختیاری)
FROM node:16-alpine AS security

# نصب ابزارهای امنیت
RUN apk add --no-cache \
    curl \
    wget \
    bash \
    openssl \
    ca-certificates

# ایجاد دایرکتوری کاری
WORKDIR /app

# کپی کردن فایل‌های package
COPY package*.json ./

# نصب وابستگی‌ها
RUN npm install

# کپی کردن کد منبع
COPY . .

# اجرای بررسی امنیت
RUN npm audit --audit-level=moderate || echo "Security vulnerabilities found"

# بررسی وابستگی‌های منسوخ
RUN npm outdated || echo "Outdated dependencies found"

# دستور پیش‌فرض برای بررسی امنیت
CMD ["npm", "audit"]

# مرحله 6: Documentation stage (اختیاری)
FROM node:16-alpine AS docs

# نصب ابزارهای مستندسازی
RUN apk add --no-cache \
    curl \
    wget \
    bash \
    git

# ایجاد دایرکتوری کاری
WORKDIR /app

# کپی کردن فایل‌های package
COPY package*.json ./

# نصب وابستگی‌ها
RUN npm install

# کپی کردن کد منبع
COPY . .

# تولید مستندات
RUN npm run docs || echo "Documentation generation failed"

# دستور پیش‌فرض برای تولید مستندات
CMD ["npm", "run", "docs"]

# مرحله 7: Final production stage (بهینه شده)
FROM node:16-alpine AS final

# نصب ابزارهای ضروری
RUN apk add --no-cache \
    curl \
    bash \
    procps \
    net-tools \
    usbutils \
    openssh-client

# ایجاد کاربر
RUN addgroup -g 1001 -S posuser && \
    adduser -S posuser -u 1001

# ایجاد دایرکتوری‌ها
RUN mkdir -p /app /home/posuser/logs /home/posuser/data /home/posuser/config && \
    chown -R posuser:posuser /app /home/posuser

WORKDIR /app

# کپی کردن فایل‌های ساخته شده
COPY --from=builder --chown=posuser:posuser /app/dist ./src
COPY --from=builder --chown=posuser:posuser /app/package*.json ./
COPY --from=builder --chown=posuser:posuser /app/config ./config

# نصب وابستگی‌های تولید
RUN npm ci --only=production && npm cache clean --force

# کپی کردن اسکریپت‌ها
COPY --chown=posuser:posuser scripts ./scripts

# تنظیم مجوزها
RUN chmod +x scripts/*.sh

# تنظیم متغیرهای محیطی
ENV NODE_ENV=production
ENV POS_APP_HOME=/app
ENV POS_APP_LOGS=/home/posuser/logs
ENV POS_APP_DATA=/home/posuser/data
ENV POS_APP_CONFIG=/app/config

# تنظیم پورت‌ها
EXPOSE 3000

# تنظیم volume ها
VOLUME ["/home/posuser/logs", "/home/posuser/data", "/app/config"]

# تغییر به کاربر
USER posuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# دستور پیش‌فرض
CMD ["node", "src/index.js"]