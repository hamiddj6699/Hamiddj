/**
 * تست ساده صدور کارت واقعی
 * Simple Test for Real Card Issuance
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/real-cards';

async function testSimpleIssue() {
  console.log('🚀 شروع تست ساده صدور کارت واقعی...\n');

  try {
    // تست صدور کارت
    console.log('📋 صدور کارت واقعی...');
    
    const cardData = {
      customerData: {
        fullName: 'احمد محمدی',
        nationalId: '1234567890',
        phone: '09123456789',
        email: 'ahmad@test.com'
      },
      accountData: {
        accountNumber: '123456789',
        accountType: 'CURRENT',
        balance: 1000000,
        bankCode: '010'
      },
      cardType: 'DEBIT'
    };
    
    const response = await axios.post(`${BASE_URL}/issue`, cardData, {
      headers: {
        'Content-Type': 'application/json',
        'x-operator-id': 'TEST_OPERATOR',
        'x-operator-name': 'Test Operator',
        'x-operator-role': 'ADMIN'
      }
    });
    
    console.log('✅ کارت صادر شد:', response.data.card.cardNumber);
    console.log('✅ بانک:', response.data.card.bin.bankName);
    console.log('✅ وضعیت:', response.data.card.status);
    
  } catch (error) {
    console.error('❌ خطا در صدور کارت:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('📊 جزئیات خطا:');
      console.error('   وضعیت:', error.response.status);
      console.error('   پیام:', error.response.data?.error);
      console.error('   جزئیات:', error.response.data?.details);
    }
  }
}

// اجرای تست
testSimpleIssue().catch(console.error);