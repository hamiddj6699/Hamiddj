// require('dotenv').config(); // بارگذاری متغیرهای محیطی از .env

// تنظیم متغیرهای محیطی به صورت دستی برای تست
if (!process.env.SMS_DEVELOPMENT_MODE) {
  process.env.SMS_DEVELOPMENT_MODE = 'true';
  process.env.KAVEH_NEGAR_API_KEY = 'test_api_key_for_development';
  process.env.KAVEH_NEGAR_SENDER = 'test_sender_id';
}

const SMSService = require('../services/smsService');

async function sendTestSMS() {
  try {
    // نمونه ساخت سرویس شیء پیامک با انتخاب درگاه کاوه نگار
    const smsService = new SMSService('kavehNegar');
    
    console.log('🚀 شروع تست سرویس پیامک...');
    console.log('📱 شماره گیرنده: 09123456789');
    console.log('💬 پیام: سلام! این یک پیامک تست است.');
    console.log('');
    
    // ارسال پیامک به شماره مقصد
    const result = await smsService.sendSMS(
      '09123456789', // شماره گیرنده - جایگزین کنید
      'سلام! این یک پیامک تست است.'
    );
    
    console.log('✅ پیامک با موفقیت ارسال شد:');
    console.log(`   🆔 شناسه پیام: ${result.messageId}`);
    console.log(`   💰 هزینه: ${result.cost} تومان`);
    console.log(`   📝 پیام: ${result.message}`);
    if (result.development) {
      console.log('   🔧 حالت توسعه فعال');
    }
    console.log('');
    
    // دریافت وضعیت پیامک
    if (result.messageId) {
      console.log('🔄 در حال بررسی وضعیت پیامک...');
      const status = await smsService.getMessageStatus(result.messageId);
      console.log('📊 وضعیت پیامک:');
      console.log(`   🆔 شناسه: ${status.messageId}`);
      console.log(`   📈 وضعیت: ${status.status} (${status.statusText})`);
      if (status.development) {
        console.log('   🔧 حالت توسعه فعال');
      }
    }
    
  } catch (error) {
    console.error('❌ خطا در ارسال پیامک:', error.message);
  }
}

async function checkBalance() {
  try {
    const smsService = new SMSService('kavehNegar');
    console.log('💰 در حال بررسی موجودی حساب...');
    const balance = await smsService.getBalance();
    console.log('💳 موجودی حساب:');
    console.log(`   💰 موجودی: ${balance.balance} ${balance.currency}`);
    if (balance.development) {
      console.log('   🔧 حالت توسعه فعال');
      console.log(`   📝 پیام: ${balance.message}`);
    }
    console.log('');
  } catch (error) {
    console.error('❌ خطا در دریافت موجودی:', error.message);
  }
}

// اجرای توابع در صورت اجرا به صورت مستقیم
if (require.main === module) {
  console.log('=== تست سرویس پیامک ===');
  
  // ابتدا موجودی حساب را بررسی کنید
  checkBalance().then(() => {
    // سپس پیامک تست ارسال کنید
    sendTestSMS();
  });
}

module.exports = { 
  sendTestSMS,
  checkBalance
};