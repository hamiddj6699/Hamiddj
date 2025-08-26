#!/bin/bash

# اسکریپت استقرار سیستم تولید کارت بانکی
# Banking Card Generation System Deployment Script

set -e

echo "🚀 شروع فرآیند استقرار سیستم تولید کارت بانکی..."
echo "=================================================="

# رنگ‌ها برای نمایش بهتر
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# تابع نمایش پیام‌های موفقیت
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# تابع نمایش پیام‌های هشدار
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# تابع نمایش پیام‌های خطا
error() {
    echo -e "${RED}❌ $1${NC}"
}

# تابع نمایش پیام‌های اطلاعات
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# بررسی وجود Node.js
check_nodejs() {
    info "بررسی نصب Node.js..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        success "Node.js نصب شده است: $NODE_VERSION"
    else
        error "Node.js نصب نشده است. لطفاً ابتدا آن را نصب کنید."
        echo "برای نصب Node.js: https://nodejs.org/"
        exit 1
    fi
}

# بررسی وجود npm
check_npm() {
    info "بررسی نصب npm..."
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        success "npm نصب شده است: $NPM_VERSION"
    else
        error "npm نصب نشده است."
        exit 1
    fi
}

# بررسی وجود فایل package.json
check_package_json() {
    if [ ! -f "package.json" ]; then
        error "فایل package.json یافت نشد. لطفاً در پوشه اصلی پروژه باشید."
        exit 1
    fi
}

# نصب وابستگی‌ها
install_dependencies() {
    info "نصب وابستگی‌های پروژه..."
    if npm install --production; then
        success "وابستگی‌ها با موفقیت نصب شدند"
    else
        error "خطا در نصب وابستگی‌ها"
        exit 1
    fi
}

# ایجاد فایل .env
create_env_file() {
    info "ایجاد فایل تنظیمات محیطی..."
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            warning "فایل .env از .env.example کپی شد. لطفاً تنظیمات را بررسی کنید."
        else
            error "فایل .env.example یافت نشد."
            exit 1
        fi
    else
        success "فایل .env موجود است"
    fi
}

# بررسی تنظیمات محیطی
check_env_config() {
    info "بررسی تنظیمات محیطی..."
    
    if [ ! -f ".env" ]; then
        error "فایل .env یافت نشد"
        exit 1
    fi
    
    # بررسی متغیرهای ضروری
    source .env
    
    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your_super_secret_jwt_key_here_change_in_production" ]; then
        warning "JWT_SECRET تنظیم نشده است. لطفاً آن را تغییر دهید."
    fi
    
    if [ -z "$MONGODB_URI" ]; then
        warning "MONGODB_URI تنظیم نشده است."
    fi
    
    success "تنظیمات محیطی بررسی شد"
}

# نصب PM2 (اگر نصب نشده)
install_pm2() {
    info "بررسی نصب PM2..."
    if command -v pm2 &> /dev/null; then
        PM2_VERSION=$(pm2 --version)
        success "PM2 نصب شده است: $PM2_VERSION"
    else
        info "نصب PM2..."
        if npm install -g pm2; then
            success "PM2 با موفقیت نصب شد"
        else
            error "خطا در نصب PM2"
            exit 1
        fi
    fi
}

# راه‌اندازی اپلیکیشن با PM2
start_application() {
    info "راه‌اندازی اپلیکیشن با PM2..."
    
    # بررسی وجود فرآیند قبلی
    if pm2 list | grep -q "banking-system"; then
        info "متوقف کردن فرآیند قبلی..."
        pm2 stop banking-system
        pm2 delete banking-system
    fi
    
    # راه‌اندازی اپلیکیشن جدید
    if pm2 start server.js --name "banking-system"; then
        success "اپلیکیشن با موفقیت راه‌اندازی شد"
        
        # تنظیم PM2 برای راه‌اندازی خودکار
        pm2 startup
        pm2 save
        
        info "PM2 برای راه‌اندازی خودکار تنظیم شد"
    else
        error "خطا در راه‌اندازی اپلیکیشن"
        exit 1
    fi
}

# نمایش وضعیت اپلیکیشن
show_status() {
    info "وضعیت اپلیکیشن:"
    pm2 status
    
    echo ""
    info "لاگ‌های اپلیکیشن:"
    pm2 logs banking-system --lines 10
}

# تست اپلیکیشن
test_application() {
    info "تست اپلیکیشن..."
    
    # انتظار برای راه‌اندازی
    sleep 5
    
    # تست endpoint سلامت
    if curl -s http://localhost:3000/health > /dev/null; then
        success "اپلیکیشن با موفقیت پاسخ می‌دهد"
    else
        warning "اپلیکیشن هنوز آماده نیست. لطفاً چند لحظه صبر کنید."
    fi
}

# نمایش اطلاعات نهایی
show_final_info() {
    echo ""
    echo "🎉 استقرار با موفقیت انجام شد!"
    echo "=================================="
    echo ""
    echo "📱 اطلاعات اپلیکیشن:"
    echo "   - آدرس: http://localhost:3000"
    echo "   - نام فرآیند PM2: banking-system"
    echo ""
    echo "🔧 دستورات مفید:"
    echo "   - مشاهده وضعیت: pm2 status"
    echo "   - مشاهده لاگ‌ها: pm2 logs banking-system"
    echo "   - راه‌اندازی مجدد: pm2 restart banking-system"
    echo "   - متوقف کردن: pm2 stop banking-system"
    echo ""
    echo "📚 برای اطلاعات بیشتر فایل DEPLOYMENT.md را مطالعه کنید."
    echo ""
}

# تابع اصلی
main() {
    echo "شروع فرآیند استقرار..."
    
    check_nodejs
    check_npm
    check_package_json
    install_dependencies
    create_env_file
    check_env_config
    install_pm2
    start_application
    test_application
    show_status
    show_final_info
}

# اجرای تابع اصلی
main "$@"