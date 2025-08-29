#!/usr/bin/env node

// تست سریع سرویس پیامک در حالت توسعه
// require('dotenv').config(); // در صورت عدم نصب dotenv

// تنظیم متغیرهای محیطی به صورت دستی
process.env.SMS_DEVELOPMENT_MODE = 'true';
process.env.KAVEH_NEGAR_API_KEY = 'test_api_key_for_development';
process.env.KAVEH_NEGAR_SENDER = 'test_sender_id';

console.log('🧪 تست سریع سرویس پیامک');
console.log('========================');
console.log('');

// بررسی متغیرهای محیطی
console.log('📋 تنظیمات محیطی:');
console.log(`   🔑 API Key: ${process.env.KAVEH_NEGAR_API_KEY || 'تنظیم نشده'}`);
console.log(`   📤 Sender: ${process.env.KAVEH_NEGAR_SENDER || 'تنظیم نشده'}`);
console.log(`   🔧 Development Mode: ${process.env.SMS_DEVELOPMENT_MODE || 'false'}`);
console.log('');

// تست سرویس
const SMSService = require('./services/smsService');

async function quickTest() {
  try {
    const smsService = new SMSService('kavehNegar');
    
    console.log('🚀 شروع تست...');
    console.log('');
    
    // تست موجودی
    console.log('1️⃣ تست موجودی حساب:');
    const balance = await smsService.getBalance();
    console.log(`   ✅ موجودی: ${balance.balance} ${balance.currency}`);
    console.log('');
    
    // تست ارسال پیامک
    console.log('2️⃣ تست ارسال پیامک:');
    const result = await smsService.sendSMS('09123456789', 'تست سریع سرویس پیامک');
    console.log(`   ✅ پیامک ارسال شد: ${result.messageId}`);
    console.log('');
    
    // تست وضعیت پیامک
    console.log('3️⃣ تست وضعیت پیامک:');
    const status = await smsService.getMessageStatus(result.messageId);
    console.log(`   ✅ وضعیت: ${status.statusText}`);
    console.log('');
    
    console.log('🎉 تمام تست‌ها با موفقیت انجام شد!');
    
  } catch (error) {
    console.error('❌ خطا در تست:', error.message);
    process.exit(1);
  }
}

// اجرای تست
quickTest();