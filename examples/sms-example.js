require('dotenv').config(); // بارگذاری متغیرهای محیطی از .env

const SMSService = require('../services/smsService');

async function sendTestSMS() {
  try {
    // نمونه ساخت سرویس شیء پیامک با انتخاب درگاه کاوه نگار
    const smsService = new SMSService('kavehNegar');
    
    console.log('در حال ارسال پیامک تست...');
    
    // ارسال پیامک به شماره مقصد
    const result = await smsService.sendSMS(
      '09123456789', // شماره گیرنده - جایگزین کنید
      'سلام! این یک پیامک تست است.'
    );
    
    console.log('پیامک با موفقیت ارسال شد:', result);
    
    // دریافت وضعیت پیامک
    if (result.messageId) {
      console.log('در حال بررسی وضعیت پیامک...');
      const status = await smsService.getMessageStatus(result.messageId);
      console.log('وضعیت پیامک:', status);
    }
    
  } catch (error) {
    console.error('خطا در ارسال پیامک:', error.message);
  }
}

async function checkBalance() {
  try {
    const smsService = new SMSService('kavehNegar');
    const balance = await smsService.getBalance();
    console.log('موجودی حساب:', balance);
  } catch (error) {
    console.error('خطا در دریافت موجودی:', error.message);
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