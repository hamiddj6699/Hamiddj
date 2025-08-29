#!/bin/bash

# اسکریپت نصب خودکار برنامه POS روی دستگاه 7220
# Automated POS Application Installation Script for 7220 Device

set -e  # Exit on any error

# رنگ‌ها برای نمایش بهتر
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# متغیرهای پیکربندی
APP_NAME="pos-app"
APP_USER="pos-user"
APP_DIR="/home/$APP_USER/$APP_NAME"
NODE_VERSION="16"
SERVICE_NAME="pos-app"

# تابع نمایش پیام
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# بررسی اینکه آیا اسکریپت با root اجرا شده
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "این اسکریپت نباید با root اجرا شود"
        exit 1
    fi
}

# بررسی سیستم عامل
check_os() {
    print_message "بررسی سیستم عامل..."
    
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        print_error "نمی‌توان سیستم عامل را تشخیص داد"
        exit 1
    fi
    
    print_message "سیستم عامل: $OS $VER"
    
    # بررسی سازگاری
    if [[ "$OS" != *"Ubuntu"* ]] && [[ "$OS" != *"Debian"* ]] && [[ "$OS" != *"Raspbian"* ]]; then
        print_warning "این سیستم عامل ممکن است پشتیبانی نشود"
        read -p "ادامه دهید؟ (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# به‌روزرسانی سیستم
update_system() {
    print_message "به‌روزرسانی سیستم..."
    
    sudo apt-get update
    sudo apt-get upgrade -y
    
    print_message "سیستم به‌روزرسانی شد"
}

# نصب پیش‌نیازها
install_prerequisites() {
    print_message "نصب پیش‌نیازها..."
    
    # نصب بسته‌های ضروری
    sudo apt-get install -y \
        curl \
        wget \
        git \
        build-essential \
        python3 \
        python3-pip \
        unzip \
        zip \
        htop \
        vim \
        nano \
        ufw \
        fail2ban
    
    print_message "پیش‌نیازها نصب شدند"
}

# نصب Node.js
install_nodejs() {
    print_message "نصب Node.js..."
    
    # بررسی اینکه آیا Node.js نصب است
    if command -v node &> /dev/null; then
        NODE_CURRENT_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $NODE_CURRENT_VERSION -ge $NODE_VERSION ]]; then
            print_message "Node.js نسخه $NODE_CURRENT_VERSION قبلاً نصب است"
            return
        else
            print_warning "Node.js نسخه قدیمی نصب است، به‌روزرسانی می‌شود"
        fi
    fi
    
    # نصب Node.js
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # بررسی نصب
    NODE_VERSION_INSTALLED=$(node --version)
    NPM_VERSION_INSTALLED=$(npm --version)
    
    print_message "Node.js $NODE_VERSION_INSTALLED نصب شد"
    print_message "npm $NPM_VERSION_INSTALLED نصب شد"
    
    # نصب ابزارهای جهانی
    sudo npm install -g pm2 nodemon
}

# ایجاد کاربر POS
create_pos_user() {
    print_message "ایجاد کاربر POS..."
    
    if id "$APP_USER" &>/dev/null; then
        print_message "کاربر $APP_USER قبلاً وجود دارد"
    else
        sudo useradd -m -s /bin/bash $APP_USER
        sudo usermod -aG sudo $APP_USER
        print_message "کاربر $APP_USER ایجاد شد"
    fi
    
    # تنظیم رمز عبور
    echo "$APP_USER:pos123456" | sudo chpasswd
    print_warning "رمز عبور کاربر $APP_USER: pos123456"
    print_warning "لطفاً بعد از نصب این رمز را تغییر دهید"
}

# ایجاد دایرکتوری برنامه
create_app_directory() {
    print_message "ایجاد دایرکتوری برنامه..."
    
    sudo mkdir -p $APP_DIR
    sudo chown $APP_USER:$APP_USER $APP_DIR
    sudo chmod 755 $APP_DIR
    
    print_message "دایرکتوری $APP_DIR ایجاد شد"
}

# کپی کردن فایل‌های برنامه
copy_app_files() {
    print_message "کپی کردن فایل‌های برنامه..."
    
    # بررسی وجود فایل‌های برنامه
    if [[ ! -d "./src" ]] || [[ ! -f "./package.json" ]]; then
        print_error "فایل‌های برنامه یافت نشد"
        print_error "لطفاً این اسکریپت را از دایرکتوری برنامه اجرا کنید"
        exit 1
    fi
    
    # کپی کردن فایل‌ها
    sudo cp -r . $APP_DIR/
    sudo chown -R $APP_USER:$APP_USER $APP_DIR/
    
    print_message "فایل‌های برنامه کپی شدند"
}

# نصب وابستگی‌های برنامه
install_app_dependencies() {
    print_message "نصب وابستگی‌های برنامه..."
    
    cd $APP_DIR
    
    # نصب وابستگی‌ها
    sudo -u $APP_USER npm install --production
    
    # ساخت برنامه
    if [[ -f "package.json" ]] && grep -q "build" package.json; then
        sudo -u $APP_USER npm run build
    fi
    
    print_message "وابستگی‌های برنامه نصب شدند"
}

# ایجاد فایل‌های پیکربندی
create_config_files() {
    print_message "ایجاد فایل‌های پیکربندی..."
    
    cd $APP_DIR
    
    # ایجاد فایل .env
    if [[ ! -f ".env" ]]; then
        sudo -u $APP_USER cat > .env << EOF
# پیکربندی محیط برنامه POS
NODE_ENV=production
PORT=3000

# پیکربندی دستگاه
POS_DEVICE_ID=POS_7220_001
POS_MODEL=7220
POS_FIRMWARE=1.0.0

# پیکربندی شبکه
POS_WIFI_SSID=YourWiFiSSID
POS_WIFI_PASSWORD=YourWiFiPassword
POS_SERVER_HOST=api.pos7220.com
POS_SERVER_PORT=443
POS_SERVER_SECURE=true

# پیکربندی لاگ
POS_LOG_LEVEL=info
POS_LOG_DIR=logs

# پیکربندی امنیت
POS_SECURITY_ENABLED=true
POS_PCI_COMPLIANCE=true
EOF
        print_message "فایل .env ایجاد شد"
    fi
    
    # ایجاد فایل start.sh
    sudo -u $APP_USER cat > start.sh << 'EOF'
#!/bin/bash

# اسکریپت راه‌اندازی برنامه POS
cd "$(dirname "$0")"

# تنظیم متغیرهای محیطی
export NODE_ENV=production

# راه‌اندازی برنامه
echo "راه‌اندازی برنامه POS..."
node app.js
EOF
    
    sudo chmod +x start.sh
    
    print_message "فایل‌های پیکربندی ایجاد شدند"
}

# ایجاد سرویس systemd
create_systemd_service() {
    print_message "ایجاد سرویس systemd..."
    
    sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null << EOF
[Unit]
Description=POS Application Service
After=network.target
Wants=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node app.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME
Environment=NODE_ENV=production
Environment=HOME=$APP_DIR

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
EOF
    
    # فعال‌سازی سرویس
    sudo systemctl daemon-reload
    sudo systemctl enable $SERVICE_NAME
    
    print_message "سرویس systemd ایجاد و فعال شد"
}

# تنظیم فایروال
setup_firewall() {
    print_message "تنظیم فایروال..."
    
    # فعال‌سازی UFW
    sudo ufw --force enable
    
    # تنظیم قوانین
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 3000/tcp  # پورت برنامه POS
    
    print_message "فایروال تنظیم شد"
}

# تنظیم fail2ban
setup_fail2ban() {
    print_message "تنظیم fail2ban..."
    
    # کپی کردن فایل پیکربندی
    sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
    
    # فعال‌سازی fail2ban
    sudo systemctl enable fail2ban
    sudo systemctl start fail2ban
    
    print_message "fail2ban تنظیم شد"
}

# ایجاد اسکریپت‌های نگهداری
create_maintenance_scripts() {
    print_message "ایجاد اسکریپت‌های نگهداری..."
    
    cd $APP_DIR
    
    # اسکریپت پشتیبان‌گیری
    sudo -u $APP_USER cat > backup.sh << 'EOF'
#!/bin/bash

# اسکریپت پشتیبان‌گیری
BACKUP_DIR="/home/pos-user/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# پشتیبان‌گیری از داده‌ها
tar -czf $BACKUP_DIR/pos-data-$DATE.tar.gz data/ logs/

# پاک کردن پشتیبان‌های قدیمی (بیش از 7 روز)
find $BACKUP_DIR -name "pos-data-*.tar.gz" -mtime +7 -delete

echo "پشتیبان‌گیری تکمیل شد: pos-data-$DATE.tar.gz"
EOF
    
    # اسکریپت به‌روزرسانی
    sudo -u $APP_USER cat > update.sh << 'EOF'
#!/bin/bash

# اسکریپت به‌روزرسانی
echo "شروع به‌روزرسانی..."

# توقف سرویس
sudo systemctl stop pos-app

# پشتیبان‌گیری
./backup.sh

# به‌روزرسانی کد
git pull origin main

# نصب وابستگی‌های جدید
npm install --production

# ساخت مجدد
npm run build

# راه‌اندازی مجدد سرویس
sudo systemctl start pos-app

echo "به‌روزرسانی تکمیل شد"
EOF
    
    # تنظیم مجوزها
    sudo chmod +x backup.sh update.sh
    
    print_message "اسکریپت‌های نگهداری ایجاد شدند"
}

# راه‌اندازی سرویس
start_service() {
    print_message "راه‌اندازی سرویس..."
    
    sudo systemctl start $SERVICE_NAME
    
    # بررسی وضعیت
    sleep 3
    if sudo systemctl is-active --quiet $SERVICE_NAME; then
        print_message "سرویس با موفقیت راه‌اندازی شد"
    else
        print_error "خطا در راه‌اندازی سرویس"
        sudo systemctl status $SERVICE_NAME
        exit 1
    fi
}

# نمایش اطلاعات نصب
show_installation_info() {
    print_header "نصب تکمیل شد!"
    
    echo -e "${GREEN}✅ برنامه POS با موفقیت نصب شد${NC}"
    echo
    echo -e "${BLUE}📁 اطلاعات نصب:${NC}"
    echo -e "   دایرکتوری برنامه: $APP_DIR"
    echo -e "   کاربر: $APP_USER"
    echo -e "   سرویس: $SERVICE_NAME"
    echo
    echo -e "${BLUE}🔧 دستورات مفید:${NC}"
    echo -e "   وضعیت سرویس: sudo systemctl status $SERVICE_NAME"
    echo -e "   راه‌اندازی: sudo systemctl start $SERVICE_NAME"
    echo -e "   توقف: sudo systemctl stop $SERVICE_NAME"
    echo -e "   راه‌اندازی مجدد: sudo systemctl restart $SERVICE_NAME"
    echo -e "   مشاهده لاگ‌ها: sudo journalctl -u $SERVICE_NAME -f"
    echo
    echo -e "${BLUE}📱 دسترسی به برنامه:${NC}"
    echo -e "   رابط وب: http://localhost:3000"
    echo -e "   SSH: ssh $APP_USER@$(hostname -I | awk '{print $1}')"
    echo
    echo -e "${BLUE}🔐 اطلاعات ورود:${NC}"
    echo -e "   کاربر: $APP_USER"
    echo -e "   رمز عبور: pos123456"
    echo -e "   ${YELLOW}⚠️ لطفاً این رمز را تغییر دهید${NC}"
    echo
    echo -e "${BLUE}📋 تست نهایی:${NC}"
    echo -e "   1. بررسی وضعیت سرویس"
    echo -e "   2. تست کارت‌خوان"
    echo -e "   3. تست چاپگر"
    echo -e "   4. تست اتصال شبکه"
    echo
    echo -e "${GREEN}🎉 نصب با موفقیت تکمیل شد!${NC}"
}

# تابع اصلی
main() {
    print_header "نصب خودکار برنامه POS 7220"
    
    # بررسی‌های اولیه
    check_root
    check_os
    
    # مراحل نصب
    update_system
    install_prerequisites
    install_nodejs
    create_pos_user
    create_app_directory
    copy_app_files
    install_app_dependencies
    create_config_files
    create_systemd_service
    setup_firewall
    setup_fail2ban
    create_maintenance_scripts
    start_service
    
    # نمایش اطلاعات نهایی
    show_installation_info
}

# اجرای تابع اصلی
main "$@"