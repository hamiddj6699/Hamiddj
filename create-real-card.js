/**
 * ایجاد کارت واقعی با شماره مشخص
 * Create Real Card with Specific Number
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3002/api/cards';

// تنظیمات درخواست
const requestConfig = {
  headers: {
    'Content-Type': 'application/json',
    'x-operator-id': 'CARD_ISSUER',
    'x-operator-name': 'Card Issuer',
    'x-operator-role': 'ADMIN'
  }
};

// اطلاعات کارت واقعی
const realCardData = {
  customerData: {
    fullName: 'علی احمدی',
    nationalId: '1234567890',
    phone: '09123456789',
    email: 'ali.ahmadi@email.com'
  },
  accountData: {
    accountNumber: '735628782',
    accountType: 'CURRENT',
    balance: 5000000,
    bankCode: '012' // بانک ملت
  },
  cardType: 'DEBIT',
  options: {
    pin: { length: 4, algorithm: 'RANDOM' },
    expiryDate: '12/2029'
  }
};

async function createRealCard() {
  console.log('🚀 شروع ایجاد کارت واقعی...\n');
  
  try {
    // مرحله 1: صدور کارت
    console.log('📋 مرحله 1: صدور کارت واقعی');
    const issueResponse = await axios.post(`${BASE_URL}/issue`, realCardData, requestConfig);
    
    if (issueResponse.data.success) {
      const card = issueResponse.data.card;
      console.log('✅ کارت با موفقیت صادر شد!');
      console.log('📊 اطلاعات کارت:');
      console.log(`   شماره کارت: ${card.cardNumber}`);
      console.log(`   بانک: ${card.bin.bankName}`);
      console.log(`   نوع: ${card.cardInfo.cardType}`);
      console.log(`   وضعیت: ${card.status}`);
      console.log(`   تاریخ صدور: ${new Date(card.issuedAt).toLocaleDateString('fa-IR')}`);
      console.log(`   تاریخ انقضا: ${card.validTo ? new Date(card.validTo).toLocaleDateString('fa-IR') : '12/2029'}`);
      console.log('');
      
      // مرحله 2: فعال‌سازی کارت
      console.log('📋 مرحله 2: فعال‌سازی کارت');
      const activateResponse = await axios.put(`${BASE_URL}/${card.cardNumber}/activate`, {
        reason: 'فعال‌سازی اولیه کارت'
      }, requestConfig);
      
      if (activateResponse.data.success) {
        console.log('✅ کارت با موفقیت فعال شد!');
        console.log(`   وضعیت جدید: ${activateResponse.data.card.status}`);
        console.log(`   زمان فعال‌سازی: ${new Date(activateResponse.data.card.activatedAt).toLocaleString('fa-IR')}`);
        console.log('');
        
        // مرحله 3: دریافت اطلاعات کامل کارت
        console.log('📋 مرحله 3: دریافت اطلاعات کامل کارت');
        const cardResponse = await axios.get(`${BASE_URL}/${card.cardNumber}`, requestConfig);
        
        if (cardResponse.data.success) {
          const fullCard = cardResponse.data.card;
          console.log('✅ اطلاعات کامل کارت دریافت شد:');
          console.log('📊 مشخصات کامل:');
          console.log(`   نام صاحب: ${fullCard.customer.fullName}`);
          console.log(`   کد ملی: ${fullCard.customer.nationalId}`);
          console.log(`   شماره حساب: ${fullCard.account.accountNumber}`);
          console.log(`   موجودی: ${fullCard.account.balance.toLocaleString('fa-IR')} ریال`);
          console.log(`   بانک: ${fullCard.bin.bankName} (${fullCard.bin.bankCode})`);
          console.log(`   نوع کارت: ${fullCard.cardInfo.cardType}`);
          console.log(`   سطح کارت: ${fullCard.bin.cardLevel}`);
          console.log(`   شبکه: ${fullCard.bin.network}`);
          console.log('');
          
          // مرحله 4: دریافت آمار
          console.log('📋 مرحله 4: دریافت آمار سیستم');
          const statsResponse = await axios.get('http://localhost:3002/api/stats', requestConfig);
          
          if (statsResponse.data.success) {
            const stats = statsResponse.data.stats;
            console.log('✅ آمار سیستم:');
            console.log(`   کل کارت‌ها: ${stats.total}`);
            console.log(`   کارت‌های فعال: ${stats.active}`);
            console.log(`   کارت‌های صادر شده: ${stats.issued}`);
            console.log('');
          }
          
          console.log('🎉 کارت واقعی با موفقیت ایجاد و فعال شد!');
          console.log('');
          console.log('📋 خلاصه نهایی:');
          console.log(`   شماره کارت: ${fullCard.cardNumber}`);
          console.log(`   نام صاحب: ${fullCard.customer.fullName}`);
          console.log(`   بانک: ${fullCard.bin.bankName}`);
          console.log(`   وضعیت: ${fullCard.status.current}`);
          console.log(`   نوع: ${fullCard.cardInfo.cardType}`);
          console.log(`   انقضا: ${fullCard.dates.validTo ? new Date(fullCard.dates.validTo).toLocaleDateString('fa-IR') : '12/2029'}`);
          
        } else {
          console.error('❌ خطا در دریافت اطلاعات کارت');
        }
        
      } else {
        console.error('❌ خطا در فعال‌سازی کارت');
      }
      
    } else {
      console.error('❌ خطا در صدور کارت');
    }
    
  } catch (error) {
    console.error('❌ خطا در ایجاد کارت:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('📊 جزئیات خطا:');
      console.error('   وضعیت:', error.response.status);
      console.error('   پیام:', error.response.data?.error);
      console.error('   جزئیات:', error.response.data?.details);
    }
  }
}

// اجرای اسکریپت
createRealCard().catch(console.error);