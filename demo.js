#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = '';

// Demo data
const demoUser = {
  firstName: 'احمد',
  lastName: 'رضایی',
  email: 'ahmad.rezaei@demo.com',
  phone: '+989123456789',
  nationalId: '1234567890',
  dateOfBirth: '1990-01-01',
  address: {
    street: 'خیابان ولیعصر',
    city: 'تهران',
    state: 'تهران',
    postalCode: '12345',
    country: 'Iran'
  },
  password: 'DemoPass123!'
};

async function demo() {
  console.log('🏦 Banking Application Demo');
  console.log('============================\n');

  try {
    // 1. Health Check
    console.log('1️⃣ Health Check');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log(`   ✅ Server Status: ${healthResponse.data.status}`);
    console.log(`   📅 Timestamp: ${healthResponse.data.timestamp}\n`);

    // 2. Register User
    console.log('2️⃣ User Registration');
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, demoUser);
    authToken = registerResponse.data.token;
    console.log(`   ✅ User registered: ${registerResponse.data.user.fullName}`);
    console.log(`   🔑 JWT Token received\n`);

    // 3. Login
    console.log('3️⃣ User Login');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: demoUser.email,
      password: demoUser.password
    });
    console.log(`   ✅ Login successful: ${loginResponse.data.message}\n`);

    // 4. Create Account
    console.log('4️⃣ Create Bank Account');
    const accountData = {
      accountType: 'savings',
      currency: 'IRR',
      branch: 'شعبه مرکزی',
      initialDeposit: 1000000,
      notes: 'حساب پس‌انداز شخصی'
    };
    
    const accountResponse = await axios.post(`${BASE_URL}/api/accounts`, accountData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const accountId = accountResponse.data.account._id;
    console.log(`   ✅ Account created: ${accountResponse.data.account.accountNumber}`);
    console.log(`   💰 Initial Balance: ${accountResponse.data.account.balance} ${accountResponse.data.account.currency}\n`);

    // 5. Make Deposit
    console.log('5️⃣ Make Deposit');
    const depositData = {
      amount: 500000,
      description: 'واریز حقوق ماهانه',
      category: 'bills',
      toAccount: accountId
    };
    
    const depositResponse = await axios.post(`${BASE_URL}/api/transactions/deposit`, depositData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`   ✅ Deposit successful: ${depositResponse.data.message}`);
    console.log(`   💰 New Balance: ${depositResponse.data.newBalance} IRR\n`);

    // 6. Make Withdrawal
    console.log('6️⃣ Make Withdrawal');
    const withdrawalData = {
      amount: 200000,
      description: 'برداشت نقدی',
      category: 'shopping',
      fromAccount: accountId
    };
    
    const withdrawalResponse = await axios.post(`${BASE_URL}/api/transactions/withdrawal`, withdrawalData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`   ✅ Withdrawal successful: ${withdrawalResponse.data.message}`);
    console.log(`   💰 New Balance: ${withdrawalResponse.data.newBalance} IRR\n`);

    // 7. Get Transaction History
    console.log('7️⃣ Transaction History');
    const transactionsResponse = await axios.get(`${BASE_URL}/api/transactions?limit=5`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`   📊 Total Transactions: ${transactionsResponse.data.transactions.length}`);
    transactionsResponse.data.transactions.forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.type} - ${txn.amount} ${txn.currency} - ${txn.description}`);
    });
    console.log('');

    // 8. Get Account Balance
    console.log('8️⃣ Account Balance');
    const balanceResponse = await axios.get(`${BASE_URL}/api/accounts/${accountId}/balance`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`   💰 Current Balance: ${balanceResponse.data.balance} ${balanceResponse.data.currency}`);
    console.log(`   💰 Available Balance: ${balanceResponse.data.availableBalance} ${balanceResponse.data.currency}`);
    console.log(`   📊 Account Status: ${balanceResponse.data.status}\n`);

    // 9. Get User Profile
    console.log('9️⃣ User Profile');
    const profileResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`   👤 Name: ${profileResponse.data.user.fullName}`);
    console.log(`   📧 Email: ${profileResponse.data.user.email}`);
    console.log(`   📱 Phone: ${profileResponse.data.user.phone}`);
    console.log(`   🏠 City: ${profileResponse.data.user.address.city}\n`);

    console.log('🎉 Demo completed successfully!');
    console.log('\n📚 Next Steps:');
    console.log('   • Check the README.md for complete API documentation');
    console.log('   • Import the Postman collection for API testing');
    console.log('   • Run tests with: npm test');
    console.log('   • Seed database with: npm run seed');

  } catch (error) {
    console.error('❌ Demo failed:', error.response?.data?.message || error.message);
    if (error.response?.status === 500) {
      console.log('\n💡 Make sure the server is running: npm run dev');
    }
  }
}

// Run demo if called directly
if (require.main === module) {
  demo();
}

module.exports = { demo };