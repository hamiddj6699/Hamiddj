#!/bin/bash

# اسکریپت راه‌اندازی ساده سیستم تولید کارت بانکی
# Simple Startup Script for Banking Card Generation System

echo "🚀 راه‌اندازی سیستم تولید کارت بانکی..."

# بررسی وجود فایل .env
if [ ! -f ".env" ]; then
    echo "⚠️  فایل .env یافت نشد. ایجاد فایل نمونه..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ فایل .env ایجاد شد. لطفاً تنظیمات را بررسی کنید."
    else
        echo "❌ فایل .env.example یافت نشد."
        exit 1
    fi
fi

# نصب وابستگی‌ها (اگر node_modules وجود ندارد)
if [ ! -d "node_modules" ]; then
    echo "📦 نصب وابستگی‌ها..."
    npm install --production
fi

# راه‌اندازی اپلیکیشن
echo "🌐 راه‌اندازی اپلیکیشن..."
echo "📱 آدرس: http://localhost:${PORT:-3000}"
echo "🔄 برای توقف: Ctrl+C"

# اجرای اپلیکیشن
node server.js