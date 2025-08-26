#!/bin/bash

# اسکریپت تست سخت‌افزار POS 7220
# POS 7220 Hardware Testing Script

set -e

# رنگ‌ها برای نمایش بهتر
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# متغیرهای پیکربندی
TEST_LOG_FILE="/tmp/pos-hardware-test.log"
CARD_READER_PORT="/dev/ttyUSB0"
PRINTER_PORT="/dev/ttyUSB1"
NFC_DEVICE="/dev/usb/hiddev0"

# تابع نمایش پیام
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" >> $TEST_LOG_FILE
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $1" >> $TEST_LOG_FILE
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" >> $TEST_LOG_FILE
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}================================${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') ================================" >> $TEST_LOG_FILE
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> $TEST_LOG_FILE
    echo "$(date '+%Y-%m-%d %H:%M:%S') ================================" >> $TEST_LOG_FILE
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') ✅ $1" >> $TEST_LOG_FILE
}

print_failure() {
    echo -e "${RED}❌ $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') ❌ $1" >> $TEST_LOG_FILE
}

# تابع تست سیستم
test_system() {
    print_header "تست سیستم پایه"
    
    # بررسی سیستم عامل
    print_message "بررسی سیستم عامل..."
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        print_success "سیستم عامل: $NAME $VERSION_ID"
    else
        print_failure "نمی‌توان سیستم عامل را تشخیص داد"
    fi
    
    # بررسی معماری
    ARCH=$(uname -m)
    print_success "معماری: $ARCH"
    
    # بررسی هسته
    KERNEL=$(uname -r)
    print_success "هسته: $KERNEL"
    
    # بررسی حافظه
    MEMORY=$(free -h | grep Mem | awk '{print $2}')
    print_success "حافظه کل: $MEMORY"
    
    # بررسی فضای دیسک
    DISK=$(df -h / | tail -1 | awk '{print $4}')
    print_success "فضای دیسک آزاد: $DISK"
    
    # بررسی CPU
    CPU_CORES=$(nproc)
    print_success "تعداد هسته‌های CPU: $CPU_CORES"
    
    # بررسی دما
    if command -v sensors &> /dev/null; then
        TEMP=$(sensors | grep -i temp | head -1 | awk '{print $2}')
        print_success "دمای سیستم: $TEMP"
    else
        print_warning "ابزار sensors نصب نیست"
    fi
}

# تابع تست پورت‌های USB
test_usb_ports() {
    print_header "تست پورت‌های USB"
    
    print_message "بررسی دستگاه‌های USB متصل..."
    
    if command -v lsusb &> /dev/null; then
        USB_DEVICES=$(lsusb | wc -l)
        print_success "تعداد دستگاه‌های USB: $USB_DEVICES"
        
        echo "دستگاه‌های USB متصل:"
        lsusb | while read line; do
            echo "  $line"
        done
        
        # بررسی کارت‌خوان
        if lsusb | grep -i "card reader\|magnetic\|swipe" &> /dev/null; then
            print_success "کارت‌خوان مغناطیسی یافت شد"
        else
            print_warning "کارت‌خوان مغناطیسی یافت نشد"
        fi
        
        # بررسی چاپگر
        if lsusb | grep -i "printer\|thermal" &> /dev/null; then
            print_success "چاپگر حرارتی یافت شد"
        else
            print_warning "چاپگر حرارتی یافت نشد"
        fi
        
        # بررسی NFC
        if lsusb | grep -i "nfc\|rfid" &> /dev/null; then
            print_success "ماژول NFC یافت شد"
        else
            print_warning "ماژول NFC یافت نشد"
        fi
    else
        print_failure "ابزار lsusb نصب نیست"
    fi
}

# تابع تست پورت‌های سریال
test_serial_ports() {
    print_header "تست پورت‌های سریال"
    
    print_message "بررسی پورت‌های سریال موجود..."
    
    # بررسی پورت‌های tty
    TTY_PORTS=$(ls /dev/tty* 2>/dev/null | wc -l)
    print_success "تعداد پورت‌های tty: $TTY_PORTS"
    
    # بررسی پورت‌های USB
    USB_TTY_PORTS=$(ls /dev/ttyUSB* 2>/dev/null | wc -l)
    if [[ $USB_TTY_PORTS -gt 0 ]]; then
        print_success "پورت‌های USB سریال: $USB_TTY_PORTS"
        ls /dev/ttyUSB* | while read port; do
            echo "  $port"
        done
    else
        print_warning "پورت USB سریال یافت نشد"
    fi
    
    # تست دسترسی به پورت‌ها
    if [[ -e $CARD_READER_PORT ]]; then
        print_success "پورت کارت‌خوان در دسترس: $CARD_READER_PORT"
    else
        print_warning "پورت کارت‌خوان در دسترس نیست: $CARD_READER_PORT"
    fi
    
    if [[ -e $PRINTER_PORT ]]; then
        print_success "پورت چاپگر در دسترس: $PRINTER_PORT"
    else
        print_warning "پورت چاپگر در دسترس نیست: $PRINTER_PORT"
    fi
}

# تابع تست کارت‌خوان
test_card_reader() {
    print_header "تست کارت‌خوان"
    
    print_message "آماده‌سازی تست کارت‌خوان..."
    
    # بررسی وجود Node.js
    if ! command -v node &> /dev/null; then
        print_failure "Node.js نصب نیست"
        return
    fi
    
    # ایجاد فایل تست ساده
    cat > /tmp/test-card-reader.js << 'EOF'
const { SerialPort } = require('serialport');

async function testCardReader() {
    try {
        // بررسی پورت‌های موجود
        const ports = await SerialPort.list();
        console.log('پورت‌های سریال موجود:');
        ports.forEach(port => {
            console.log(`  ${port.path} - ${port.manufacturer || 'نامشخص'}`);
        });
        
        // تست اتصال به پورت کارت‌خوان
        if (ports.length > 0) {
            const testPort = new SerialPort({
                path: ports[0].path,
                baudRate: 9600,
                autoOpen: false
            });
            
            testPort.open((err) => {
                if (err) {
                    console.error('خطا در اتصال به پورت:', err.message);
                } else {
                    console.log('اتصال به پورت موفقیت‌آمیز بود');
                    testPort.close();
                }
            });
        }
    } catch (error) {
        console.error('خطا در تست کارت‌خوان:', error.message);
    }
}

testCardReader();
EOF
    
    print_message "اجرای تست کارت‌خوان..."
    if node /tmp/test-card-reader.js 2>/dev/null; then
        print_success "تست کارت‌خوان موفقیت‌آمیز بود"
    else
        print_failure "تست کارت‌خوان ناموفق بود"
    fi
    
    # پاک کردن فایل تست
    rm -f /tmp/test-card-reader.js
}

# تابع تست چاپگر
test_printer() {
    print_header "تست چاپگر حرارتی"
    
    print_message "آماده‌سازی تست چاپگر..."
    
    # بررسی وجود Node.js
    if ! command -v node &> /dev/null; then
        print_failure "Node.js نصب نیست"
        return
    fi
    
    # ایجاد فایل تست ساده
    cat > /tmp/test-printer.js << 'EOF'
const { SerialPort } = require('serialport');

async function testPrinter() {
    try {
        // بررسی پورت‌های موجود
        const ports = await SerialPort.list();
        console.log('پورت‌های سریال موجود:');
        ports.forEach(port => {
            console.log(`  ${port.path} - ${port.manufacturer || 'نامشخص'}`);
        });
        
        // تست اتصال به پورت چاپگر
        if (ports.length > 0) {
            const testPort = new SerialPort({
                path: ports[0].path,
                baudRate: 9600,
                autoOpen: false
            });
            
            testPort.open((err) => {
                if (err) {
                    console.error('خطا در اتصال به پورت چاپگر:', err.message);
                } else {
                    console.log('اتصال به پورت چاپگر موفقیت‌آمیز بود');
                    
                    // ارسال دستور تست
                    const testCommand = Buffer.from([0x1B, 0x40]); // ESC @ - Initialize printer
                    testPort.write(testCommand, (err) => {
                        if (err) {
                            console.error('خطا در ارسال دستور تست:', err.message);
                        } else {
                            console.log('دستور تست ارسال شد');
                        }
                        testPort.close();
                    });
                }
            });
        }
    } catch (error) {
        console.error('خطا در تست چاپگر:', error.message);
    }
}

testPrinter();
EOF
    
    print_message "اجرای تست چاپگر..."
    if node /tmp/test-printer.js 2>/dev/null; then
        print_success "تست چاپگر موفقیت‌آمیز بود"
    else
        print_failure "تست چاپگر ناموفق بود"
    fi
    
    # پاک کردن فایل تست
    rm -f /tmp/test-printer.js
}

# تابع تست NFC
test_nfc() {
    print_header "تست ماژول NFC"
    
    print_message "بررسی ماژول NFC..."
    
    # بررسی وجود دستگاه NFC
    if [[ -e $NFC_DEVICE ]]; then
        print_success "دستگاه NFC یافت شد: $NFC_DEVICE"
    else
        print_warning "دستگاه NFC یافت نشد: $NFC_DEVICE"
    fi
    
    # بررسی وجود ابزارهای NFC
    if command -v nfc-list &> /dev/null; then
        print_success "ابزار nfc-list موجود است"
        print_message "اجرای تست NFC..."
        nfc-list 2>/dev/null || print_warning "خطا در اجرای nfc-list"
    else
        print_warning "ابزار nfc-list نصب نیست"
    fi
    
    # بررسی وجود کتابخانه‌های NFC
    if [[ -d "/usr/lib/libnfc" ]] || [[ -d "/usr/local/lib/libnfc" ]]; then
        print_success "کتابخانه‌های NFC نصب هستند"
    else
        print_warning "کتابخانه‌های NFC نصب نیستند"
    fi
}

# تابع تست شبکه
test_network() {
    print_header "تست شبکه"
    
    print_message "بررسی اتصال شبکه..."
    
    # بررسی اتصال Wi-Fi
    if command -v iwconfig &> /dev/null; then
        WIFI_INTERFACE=$(iwconfig 2>/dev/null | grep -i "802.11" | head -1 | awk '{print $1}')
        if [[ -n $WIFI_INTERFACE ]]; then
            print_success "رابط Wi-Fi یافت شد: $WIFI_INTERFACE"
            WIFI_SSID=$(iwconfig $WIFI_INTERFACE 2>/dev/null | grep -i "essid" | awk -F'"' '{print $2}')
            if [[ -n $WIFI_SSID ]]; then
                print_success "متصل به شبکه: $WIFI_SSID"
            fi
        else
            print_warning "رابط Wi-Fi یافت نشد"
        fi
    fi
    
    # بررسی اتصال اترنت
    ETHERNET_INTERFACE=$(ip link show | grep -i "eth\|en" | head -1 | awk -F': ' '{print $2}')
    if [[ -n $ETHERNET_INTERFACE ]]; then
        print_success "رابط اترنت یافت شد: $ETHERNET_INTERFACE"
    fi
    
    # بررسی آدرس IP
    IP_ADDRESS=$(hostname -I | awk '{print $1}')
    if [[ -n $IP_ADDRESS ]]; then
        print_success "آدرس IP: $IP_ADDRESS"
    else
        print_failure "آدرس IP یافت نشد"
    fi
    
    # تست اتصال اینترنت
    print_message "تست اتصال اینترنت..."
    if ping -c 3 8.8.8.8 &> /dev/null; then
        print_success "اتصال اینترنت برقرار است"
    else
        print_warning "اتصال اینترنت برقرار نیست"
    fi
    
    # تست DNS
    if nslookup google.com &> /dev/null; then
        print_success "DNS کار می‌کند"
    else
        print_warning "DNS کار نمی‌کند"
    fi
}

# تابع تست امنیت
test_security() {
    print_header "تست امنیت"
    
    print_message "بررسی تنظیمات امنیتی..."
    
    # بررسی فایروال
    if command -v ufw &> /dev/null; then
        UFW_STATUS=$(sudo ufw status | grep "Status")
        if [[ $UFW_STATUS == *"active"* ]]; then
            print_success "فایروال فعال است"
        else
            print_warning "فایروال غیرفعال است"
        fi
    else
        print_warning "فایروال UFW نصب نیست"
    fi
    
    # بررسی fail2ban
    if command -v fail2ban-client &> /dev/null; then
        if sudo systemctl is-active --quiet fail2ban; then
            print_success "fail2ban فعال است"
        else
            print_warning "fail2ban غیرفعال است"
        fi
    else
        print_warning "fail2ban نصب نیست"
    fi
    
    # بررسی به‌روزرسانی‌های امنیتی
    if command -v apt &> /dev/null; then
        SECURITY_UPDATES=$(apt list --upgradable 2>/dev/null | grep -i security | wc -l)
        if [[ $SECURITY_UPDATES -gt 0 ]]; then
            print_warning "تعداد به‌روزرسانی‌های امنیتی: $SECURITY_UPDATES"
        else
            print_success "هیچ به‌روزرسانی امنیتی در انتظار نیست"
        fi
    fi
    
    # بررسی مجوزهای فایل‌ها
    print_message "بررسی مجوزهای فایل‌های حساس..."
    
    SENSITIVE_FILES=(
        "/etc/passwd"
        "/etc/shadow"
        "/etc/sudoers"
        "/etc/ssh/sshd_config"
    )
    
    for file in "${SENSITIVE_FILES[@]}"; do
        if [[ -f $file ]]; then
            PERMS=$(stat -c "%a" $file)
            OWNER=$(stat -c "%U" $file)
            if [[ $PERMS == "644" ]] || [[ $PERMS == "600" ]]; then
                print_success "مجوزهای $file صحیح است: $PERMS"
            else
                print_warning "مجوزهای $file ممکن است ناامن باشد: $PERMS"
            fi
        fi
    done
}

# تابع تست عملکرد
test_performance() {
    print_header "تست عملکرد"
    
    print_message "بررسی عملکرد سیستم..."
    
    # تست CPU
    print_message "تست CPU..."
    if command -v stress-ng &> /dev/null; then
        print_success "ابزار stress-ng موجود است"
    else
        print_warning "ابزار stress-ng نصب نیست"
    fi
    
    # تست حافظه
    print_message "تست حافظه..."
    MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    print_success "استفاده از حافظه: $MEMORY_USAGE%"
    
    # تست دیسک
    print_message "تست دیسک..."
    if command -v hdparm &> /dev/null; then
        DISK_DEVICE=$(df / | tail -1 | awk '{print $1}')
        if [[ -b $DISK_DEVICE ]]; then
            print_success "ابزار hdparm موجود است"
        fi
    else
        print_warning "ابزار hdparm نصب نیست"
    fi
    
    # تست شبکه
    print_message "تست شبکه..."
    if command -v iperf3 &> /dev/null; then
        print_success "ابزار iperf3 موجود است"
    else
        print_warning "ابزار iperf3 نصب نیست"
    fi
}

# تابع تولید گزارش
generate_report() {
    print_header "تولید گزارش تست"
    
    REPORT_FILE="/tmp/pos-hardware-test-report.txt"
    
    print_message "ایجاد گزارش در: $REPORT_FILE"
    
    cat > $REPORT_FILE << EOF
گزارش تست سخت‌افزار POS 7220
================================
تاریخ: $(date)
دستگاه: $(hostname)
سیستم عامل: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)

خلاصه نتایج:
$(grep -E "✅|❌" $TEST_LOG_FILE | tail -20)

جزئیات کامل:
$(cat $TEST_LOG_FILE)

توصیه‌ها:
1. تمام خطاها را بررسی و رفع کنید
2. هشدارها را بررسی کنید
3. تنظیمات امنیتی را بررسی کنید
4. عملکرد سیستم را بهینه کنید
EOF
    
    print_success "گزارش در $REPORT_FILE ایجاد شد"
    
    # نمایش خلاصه
    echo
    print_header "خلاصه نتایج تست"
    
    TOTAL_TESTS=$(grep -c "✅\|❌" $TEST_LOG_FILE)
    SUCCESS_TESTS=$(grep -c "✅" $TEST_LOG_FILE)
    FAILED_TESTS=$(grep -c "❌" $TEST_LOG_FILE)
    
    echo -e "${GREEN}تعداد کل تست‌ها: $TOTAL_TESTS${NC}"
    echo -e "${GREEN}تست‌های موفق: $SUCCESS_TESTS${NC}"
    if [[ $FAILED_TESTS -gt 0 ]]; then
        echo -e "${RED}تست‌های ناموفق: $FAILED_TESTS${NC}"
    else
        echo -e "${GREEN}تست‌های ناموفق: $FAILED_TESTS${NC}"
    fi
    
    SUCCESS_RATE=$((SUCCESS_TESTS * 100 / TOTAL_TESTS))
    echo -e "${BLUE}نرخ موفقیت: $SUCCESS_RATE%${NC}"
}

# تابع اصلی
main() {
    print_header "شروع تست سخت‌افزار POS 7220"
    
    # ایجاد فایل لاگ
    touch $TEST_LOG_FILE
    echo "$(date '+%Y-%m-%d %H:%M:%S') شروع تست سخت‌افزار" > $TEST_LOG_FILE
    
    # اجرای تست‌ها
    test_system
    test_usb_ports
    test_serial_ports
    test_card_reader
    test_printer
    test_nfc
    test_network
    test_security
    test_performance
    
    # تولید گزارش
    generate_report
    
    print_header "تست سخت‌افزار تکمیل شد"
    print_message "برای مشاهده جزئیات کامل، فایل گزارش را بررسی کنید"
    print_message "فایل لاگ: $TEST_LOG_FILE"
    print_message "فایل گزارش: /tmp/pos-hardware-test-report.txt"
}

# اجرای تابع اصلی
main "$@"