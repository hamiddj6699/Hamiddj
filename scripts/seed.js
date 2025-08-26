const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
require('dotenv').config();

// Sample data
const sampleUsers = [
  {
    firstName: 'علی',
    lastName: 'احمدی',
    email: 'ali.ahmadi@bank.com',
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
    password: 'AdminPass123!',
    role: 'admin',
    isEmailVerified: true,
    isPhoneVerified: true
  },
  {
    firstName: 'فاطمه',
    lastName: 'محمدی',
    email: 'fateme.mohammadi@bank.com',
    phone: '+989876543210',
    nationalId: '0987654321',
    dateOfBirth: '1995-05-15',
    address: {
      street: 'خیابان انقلاب',
      city: 'تهران',
      state: 'تهران',
      postalCode: '54321',
      country: 'Iran'
    },
    password: 'ManagerPass123!',
    role: 'manager',
    isEmailVerified: true,
    isPhoneVerified: true
  },
  {
    firstName: 'رضا',
    lastName: 'کریمی',
    email: 'reza.karimi@example.com',
    phone: '+989112233445',
    nationalId: '1122334455',
    dateOfBirth: '1988-12-25',
    address: {
      street: 'خیابان آزادی',
      city: 'تهران',
      state: 'تهران',
      postalCode: '98765',
      country: 'Iran'
    },
    password: 'CustomerPass123!',
    role: 'customer',
    isEmailVerified: true,
    isPhoneVerified: true
  },
  {
    firstName: 'سارا',
    lastName: 'نوری',
    email: 'sara.nouri@example.com',
    phone: '+989554433221',
    nationalId: '5544332211',
    dateOfBirth: '1992-08-10',
    address: {
      street: 'خیابان جمهوری',
      city: 'تهران',
      state: 'تهران',
      postalCode: '11111',
      country: 'Iran'
    },
    password: 'CustomerPass456!',
    role: 'customer',
    isEmailVerified: true,
    isPhoneVerified: true
  }
];

const sampleAccounts = [
  {
    accountType: 'savings',
    currency: 'IRR',
    branch: 'شعبه مرکزی',
    balance: 5000000,
    interestRate: 18,
    monthlyFee: 0,
    minimumBalance: 100000,
    dailyLimit: 20000000,
    monthlyLimit: 100000000,
    notes: 'حساب پس‌انداز شخصی'
  },
  {
    accountType: 'checking',
    currency: 'IRR',
    branch: 'شعبه مرکزی',
    balance: 2500000,
    interestRate: 0,
    monthlyFee: 50000,
    minimumBalance: 500000,
    dailyLimit: 50000000,
    monthlyLimit: 200000000,
    notes: 'حساب جاری روزانه'
  },
  {
    accountType: 'investment',
    currency: 'USD',
    branch: 'شعبه بین‌المللی',
    balance: 10000,
    interestRate: 5,
    monthlyFee: 100,
    minimumBalance: 1000,
    dailyLimit: 50000,
    monthlyLimit: 500000,
    notes: 'حساب سرمایه‌گذاری ارزی'
  }
];

const sampleTransactions = [
  {
    type: 'deposit',
    amount: 1000000,
    description: 'واریز اولیه حساب',
    category: 'bills',
    status: 'completed'
  },
  {
    type: 'deposit',
    amount: 500000,
    description: 'واریز حقوق',
    category: 'bills',
    status: 'completed'
  },
  {
    type: 'withdrawal',
    amount: 200000,
    description: 'برداشت نقدی',
    category: 'shopping',
    status: 'completed'
  },
  {
    type: 'transfer',
    amount: 300000,
    description: 'انتقال بین حساب‌ها',
    category: 'other',
    status: 'completed'
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/banking-app');
    console.log('📦 Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Account.deleteMany({}),
      Transaction.deleteMany({})
    ]);
    console.log('🧹 Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`👤 Created user: ${user.fullName} (${user.email})`);
    }

    // Create accounts for customers
    const customerUsers = createdUsers.filter(user => user.role === 'customer');
    const createdAccounts = [];
    
    for (let i = 0; i < customerUsers.length; i++) {
      const user = customerUsers[i];
      const accountData = sampleAccounts[i % sampleAccounts.length];
      
      const account = new Account({
        ...accountData,
        owner: user._id,
        accountManager: createdUsers.find(u => u.role === 'manager')._id
      });
      
      await account.save();
      createdAccounts.push(account);
      console.log(`🏦 Created account: ${account.accountNumber} for ${user.fullName}`);
    }

    // Create transactions
    for (let i = 0; i < createdAccounts.length; i++) {
      const account = createdAccounts[i];
      const user = customerUsers[i];
      
      for (const transactionData of sampleTransactions) {
        const transaction = new Transaction({
          ...transactionData,
          fromAccount: transactionData.type === 'withdrawal' ? account._id : undefined,
          toAccount: ['deposit', 'transfer'].includes(transactionData.type) ? account._id : undefined,
          fromUser: transactionData.type === 'withdrawal' ? user._id : undefined,
          toUser: ['deposit', 'transfer'].includes(transactionData.type) ? user._id : undefined,
          initiatedBy: user._id,
          metadata: {
            ipAddress: '127.0.0.1',
            userAgent: 'Seeder Script',
            device: 'Seeder'
          }
        });
        
        await transaction.save();
      }
      console.log(`💰 Created transactions for account: ${account.accountNumber}`);
    }

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👥 Users: ${createdUsers.length}`);
    console.log(`   🏦 Accounts: ${createdAccounts.length}`);
    console.log(`   💰 Transactions: ${createdAccounts.length * sampleTransactions.length}`);
    
    console.log('\n🔑 Default Login Credentials:');
    console.log('   Admin: ali.ahmadi@bank.com / AdminPass123!');
    console.log('   Manager: fateme.mohammadi@bank.com / ManagerPass123!');
    console.log('   Customer 1: reza.karimi@example.com / CustomerPass123!');
    console.log('   Customer 2: sara.nouri@example.com / CustomerPass456!');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };