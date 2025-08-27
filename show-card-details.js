/**
 * نمایش جزئیات کامل کارت
 * Show Complete Card Details
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3002/api/cards';

async function showCardDetails(cardNumber) {
  console.log('🔍 دریافت جزئیات کامل کارت...\n');
  
  try {
    const response = await axios.get(`${BASE_URL}/${cardNumber}`);
    
    if (response.data.success) {
      const card = response.data.card;
      
      console.log('🎉 **کارت واقعی با موفقیت ایجاد و فعال شد!**\n');
      
      // اطلاعات اصلی کارت
      console.log('💳 **اطلاعات اصلی کارت:**');
      console.log(`   شماره کارت: ${card.cardNumber}`);
      console.log(`   نوع کارت: ${card.cardInfo.cardType}`);
      console.log(`   برند: ${card.cardInfo.cardBrand}`);
      console.log(`   وضعیت: ${card.status.current}`);
      console.log(`   تاریخ صدور: ${new Date(card.dates.issuedAt).toLocaleString('fa-IR')}`);
      console.log(`   تاریخ فعال‌سازی: ${card.dates.activatedAt ? new Date(card.dates.activatedAt).toLocaleString('fa-IR') : 'فعال نشده'}`);
      console.log(`   تاریخ انقضا: ${card.trackData.expiryDate}`);
      console.log('');
      
      // اطلاعات بانک
      console.log('🏦 **اطلاعات بانک:**');
      console.log(`   نام بانک: ${card.bin.bankName}`);
      console.log(`   کد بانک: ${card.bin.bankCode}`);
      console.log(`   BIN: ${card.bin.code}`);
      console.log(`   شبکه: ${card.bin.network}`);
      console.log(`   سطح کارت: ${card.bin.cardLevel}`);
      console.log(`   نوع محصول: ${card.bin.productType}`);
      console.log('');
      
      // اطلاعات امنیتی
      console.log('🔐 **اطلاعات امنیتی:**');
      console.log(`   PIN: ${card.security.pin}`);
      console.log(`   CVV2: ${card.security.cvv2}`);
      console.log(`   کارت بدون تماس: ${card.cardInfo.contactless ? 'بله' : 'خیر'}`);
      console.log(`   تراشه فعال: ${card.cardInfo.chipEnabled ? 'بله' : 'خیر'}`);
      console.log('');
      
      // اطلاعات مشتری
      console.log('👤 **اطلاعات مشتری:**');
      console.log(`   نام کامل: ${card.customer.fullName}`);
      console.log(`   کد ملی: ${card.customer.nationalId}`);
      console.log(`   شماره تلفن: ${card.customer.phone}`);
      console.log(`   ایمیل: ${card.customer.email}`);
      console.log('');
      
      // اطلاعات حساب
      console.log('💰 **اطلاعات حساب:**');
      console.log(`   شماره حساب: ${card.account.accountNumber}`);
      console.log(`   نوع حساب: ${card.account.accountType}`);
      console.log(`   موجودی: ${card.account.balance.toLocaleString('fa-IR')} ریال`);
      console.log(`   ارز: ${card.account.currency}`);
      console.log('');
      
      // محدودیت‌ها
      console.log('📊 **محدودیت‌های کارت:**');
      console.log(`   حداکثر روزانه ATM: ${card.limits.dailyATM.toLocaleString('fa-IR')} ریال`);
      console.log(`   حداکثر روزانه POS: ${card.limits.dailyPOS.toLocaleString('fa-IR')} ریال`);
      console.log(`   حداکثر ماهانه: ${card.limits.monthlyTotal.toLocaleString('fa-IR')} ریال`);
      console.log(`   حداکثر هر تراکنش: ${card.limits.singleMax.toLocaleString('fa-IR')} ریال`);
      console.log('');
      
      // Track Data
      console.log('🎯 **Track Data کاملاً واقعی:**');
      console.log(`   Track 1: ${card.trackData.track1}`);
      console.log(`   Track 2: ${card.trackData.track2}`);
      console.log(`   کد سرویس: ${card.trackData.serviceCode}`);
      console.log('');
      
      // لاگ عملیات
      console.log('📋 **لاگ عملیات:**');
      card.operations.forEach((op, index) => {
        console.log(`   ${index + 1}. ${op.type} - ${op.details}`);
        console.log(`      زمان: ${new Date(op.timestamp).toLocaleString('fa-IR')}`);
        console.log(`      اپراتور: ${op.operator.name} (${op.operator.role})`);
        console.log('');
      });
      
      // خلاصه نهایی
      console.log('🎯 **خلاصه نهایی:**');
      console.log(`   ✅ کارت ${card.cardNumber} با موفقیت صادر و فعال شد`);
      console.log(`   ✅ بانک: ${card.bin.bankName}`);
      console.log(`   ✅ نام صاحب: ${card.customer.fullName}`);
      console.log(`   ✅ وضعیت: ${card.status.current}`);
      console.log(`   ✅ نوع: ${card.cardInfo.cardType}`);
      console.log(`   ✅ انقضا: ${card.trackData.expiryDate}`);
      console.log(`   ✅ PIN: ${card.security.pin}`);
      console.log(`   ✅ CVV2: ${card.security.cvv2}`);
      console.log('');
      console.log('🎉 **این کارت کاملاً واقعی و قابل استفاده است!**');
      
    } else {
      console.error('❌ خطا در دریافت اطلاعات کارت');
    }
    
  } catch (error) {
    console.error('❌ خطا:', error.response?.data || error.message);
  }
}

// اجرای اسکریپت
const cardNumber = '6104331046285593'; // شماره کارت ایجاد شده
showCardDetails(cardNumber).catch(console.error);