/**
 * تست API های واقعی کارت بانکی
 * Test Real Banking Card APIs
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/real-cards';

// تنظیمات درخواست
const requestConfig = {
  headers: {
    'Content-Type': 'application/json',
    'x-operator-id': 'TEST_OPERATOR',
    'x-operator-name': 'Test Operator',
    'x-operator-role': 'ADMIN',
    'x-request-id': 'test-' + Date.now()
  }
};

// داده‌های تست
const testCustomerData = {
  fullName: 'احمد محمدی',
  nationalId: '1234567890',
  phone: '09123456789',
  email: 'ahmad@test.com',
  address: {
    street: 'خیابان ولیعصر',
    city: 'تهران',
    postalCode: '1234567890',
    country: 'IR'
  },
  dateOfBirth: '1990-01-01',
  gender: 'MALE'
};

const testAccountData = {
  accountNumber: '123456789',
  accountType: 'CURRENT',
  balance: 1000000,
  currency: 'IRR',
  bankCode: '010',
  branchCode: '001',
  branchName: 'شعبه مرکزی'
};

async function testRealCardAPI() {
  console.log('🚀 شروع تست API های واقعی کارت بانکی...\n');

  try {
    // تست 1: بررسی سلامت سرویس
    console.log('📋 تست 1: بررسی سلامت سرویس');
    const healthResponse = await axios.get(`${BASE_URL}/health`, requestConfig);
    console.log('✅ سلامت سرویس:', healthResponse.data.health.status);
    console.log('');

    // تست 2: صدور کارت واقعی
    console.log('📋 تست 2: صدور کارت واقعی');
    const issueResponse = await axios.post(`${BASE_URL}/issue`, {
      customerData: testCustomerData,
      accountData: testAccountData,
      cardType: 'DEBIT',
      options: {
        pin: { length: 4, algorithm: 'RANDOM' },
        expiryDate: '12/2027',
        serviceCode: '000'
      }
    }, requestConfig);
    
    const issuedCard = issueResponse.data.card;
    console.log('✅ کارت صادر شد:', issuedCard.cardNumber);
    console.log('✅ بانک:', issuedCard.bin.bankName);
    console.log('✅ وضعیت:', issuedCard.status);
    console.log('');

    // تست 3: فعال‌سازی کارت
    console.log('📋 تست 3: فعال‌سازی کارت');
    const activateResponse = await axios.put(`${BASE_URL}/${issuedCard.cardNumber}/activate`, {
      reason: 'فعال‌سازی اولیه'
    }, requestConfig);
    
    console.log('✅ کارت فعال شد:', activateResponse.data.message);
    console.log('');

    // تست 4: دریافت اطلاعات کارت
    console.log('📋 تست 4: دریافت اطلاعات کارت');
    const cardResponse = await axios.get(`${BASE_URL}/${issuedCard.cardNumber}`, requestConfig);
    
    console.log('✅ اطلاعات کارت دریافت شد');
    console.log('✅ مشتری:', cardResponse.data.card.customer.fullName);
    console.log('✅ حساب:', cardResponse.data.card.account.accountNumber);
    console.log('');

    // تست 5: تغییر PIN
    console.log('📋 تست 5: تغییر PIN');
    const pinResponse = await axios.put(`${BASE_URL}/${issuedCard.cardNumber}/change-pin`, {
      newPin: '5678'
    }, requestConfig);
    
    console.log('✅ PIN تغییر کرد:', pinResponse.data.message);
    console.log('');

    // تست 6: دریافت آمار
    console.log('📋 تست 6: دریافت آمار');
    const statsResponse = await axios.get(`${BASE_URL}/stats/overview`, requestConfig);
    
    console.log('✅ آمار دریافت شد');
    console.log('✅ کل کارت‌ها:', statsResponse.data.stats.total);
    console.log('✅ کارت‌های فعال:', statsResponse.data.stats.active);
    console.log('');

    // تست 7: جستجو
    console.log('📋 تست 7: جستجو');
    const searchResponse = await axios.get(`${BASE_URL}/search?query=احمد`, requestConfig);
    
    console.log('✅ جستجو انجام شد');
    console.log('✅ نتایج:', searchResponse.data.totalResults);
    console.log('');

    // تست 8: دریافت عملیات
    console.log('📋 تست 8: دریافت عملیات');
    const operationsResponse = await axios.get(`${BASE_URL}/${issuedCard.cardNumber}/operations`, requestConfig);
    
    console.log('✅ عملیات دریافت شد');
    console.log('✅ تعداد عملیات:', operationsResponse.data.total);
    console.log('');

    console.log('🎉 تمام تست‌ها با موفقیت انجام شدند!');

  } catch (error) {
    console.error('❌ خطا در تست:', error.response?.data || error.message);
  }
}

// اجرای تست
testRealCardAPI().catch(console.error);