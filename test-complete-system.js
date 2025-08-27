/**
 * تست سیستم صدور کارت کامل
 * Complete Card Issuance System Test
 */

const CompleteCardIssuance = require('./services/completeCardIssuance');

console.log('🚀 شروع تست سیستم صدور کارت کامل...\n');

async function testCompleteSystem() {
  let cardIssuanceService = null;
  
  try {
    // راه‌اندازی سرویس
    console.log('📋 مرحله 1: راه‌اندازی سرویس صدور کارت');
    cardIssuanceService = new CompleteCardIssuance();
    await cardIssuanceService.initialize();
    console.log('✅ سرویس راه‌اندازی شد\n');
    
    // تست صدور کارت برای مشتری 1
    console.log('📋 مرحله 2: صدور کارت برای مشتری 1');
    const customer1 = {
      fullName: 'احمد محمدی',
      nationalId: '0012345678',
      phone: '09123456789',
      email: 'ahmad@example.com'
    };
    
    const account1 = {
      accountNumber: '123456789',
      bankCode: '010',
      accountType: 'CURRENT',
      balance: 5000000
    };
    
    const card1 = await cardIssuanceService.issueCompleteCard(
      customer1, 
      account1, 
      'DEBIT',
      { 
        expiryDate: '12/2027',
        serviceCode: '000'
      }
    );
    
    console.log('✅ کارت 1 صادر شد:');
    console.log(`   شماره کارت: ${card1.formattedCardNumber}`);
    console.log(`   PIN: ${card1.pin}`);
    console.log(`   CVV2: ${card1.cvv2}`);
    console.log(`   تاریخ انقضا: ${card1.expiryDate}`);
    console.log(`   Track 1: ${card1.track1}`);
    console.log(`   Track 2: ${card1.track2}\n`);
    
    // تست صدور کارت برای مشتری 2
    console.log('📋 مرحله 3: صدور کارت برای مشتری 2');
    const customer2 = {
      fullName: 'فاطمه احمدی',
      nationalId: '8765432109',
      phone: '09876543210',
      email: 'fateme@example.com'
    };
    
    const account2 = {
      accountNumber: '987654321',
      bankCode: '020',
      accountType: 'SAVINGS',
      balance: 10000000
    };
    
    const card2 = await cardIssuanceService.issueCompleteCard(
      customer2, 
      account2, 
      'CREDIT',
      { 
        expiryDate: '06/2028',
        serviceCode: '000'
      }
    );
    
    console.log('✅ کارت 2 صادر شد:');
    console.log(`   شماره کارت: ${card2.formattedCardNumber}`);
    console.log(`   PIN: ${card2.pin}`);
    console.log(`   CVV2: ${card2.cvv2}`);
    console.log(`   تاریخ انقضا: ${card2.expiryDate}`);
    console.log(`   Track 1: ${card2.track1}`);
    console.log(`   Track 2: ${card2.track2}\n`);
    
    // تست صدور کارت برای مشتری 3
    console.log('📋 مرحله 4: صدور کارت برای مشتری 3');
    const customer3 = {
      fullName: 'علی رضایی',
      nationalId: '1122334455',
      phone: '09112233445',
      email: 'ali@example.com'
    };
    
    const account3 = {
      accountNumber: '112233445',
      bankCode: '054',
      accountType: 'BUSINESS',
      balance: 25000000
    };
    
    const card3 = await cardIssuanceService.issueCompleteCard(
      customer3, 
      account3, 
      'BUSINESS',
      { 
        expiryDate: '09/2029',
        serviceCode: '000'
      }
    );
    
    console.log('✅ کارت 3 صادر شد:');
    console.log(`   شماره کارت: ${card3.formattedCardNumber}`);
    console.log(`   PIN: ${card3.pin}`);
    console.log(`   CVV2: ${card3.cvv2}`);
    console.log(`   تاریخ انقضا: ${card3.expiryDate}`);
    console.log(`   Track 1: ${card3.track1}`);
    console.log(`   Track 2: ${card3.track2}\n`);
    
    // نمایش تمام کارت‌ها
    console.log('📋 مرحله 5: نمایش تمام کارت‌های صادر شده');
    const allCards = await cardIssuanceService.getAllCards();
    console.log(`   تعداد کل کارت‌ها: ${allCards.length}`);
    
    allCards.forEach((card, index) => {
      console.log(`   کارت ${index + 1}: ${card.formattedCardNumber} - ${card.customerData.fullName}`);
    });
    
    // نمایش لاگ عملیات
    console.log('\n📋 مرحله 6: نمایش لاگ عملیات');
    const operationLog = await cardIssuanceService.getOperationLog();
    console.log(`   تعداد عملیات: ${operationLog.length}`);
    
    operationLog.forEach((log, index) => {
      console.log(`   عملیات ${index + 1}: ${log.operationType} - ${log.timestamp.toLocaleString('fa-IR')}`);
    });
    
    console.log('\n✅ تمام تست‌ها با موفقیت انجام شدند!');
    
  } catch (error) {
    console.error('❌ خطا در تست سیستم:', error.message);
  } finally {
    // بستن سرویس
    if (cardIssuanceService) {
      console.log('\n📋 مرحله 7: بستن سرویس');
      await cardIssuanceService.closeService();
    }
  }
}

// اجرای تست
testCompleteSystem().then(() => {
  console.log('\n🎉 تست سیستم صدور کارت کامل تکمیل شد!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 خطا در تست سیستم:', error);
  process.exit(1);
});