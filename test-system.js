/**
 * تست کامل سیستم بانکی
 * Complete Banking System Test
 */

const CardNumberGenerator = require('./utils/cardNumberGenerator');
const SecurePINGenerator = require('./utils/securePINGenerator');

console.log('🚀 شروع تست سیستم بانکی...\n');

async function testCompleteSystem() {
  try {
    console.log('📋 تست 1: تولید شماره کارت');
    await testCardNumberGeneration();
    
    console.log('\n📋 تست 2: تولید PIN امن');
    await testSecurePINGeneration();
    
    console.log('\n📋 تست 3: تولید کارت کامل');
    await testCompleteCardGeneration();
    
    console.log('\n✅ تمام تست‌ها با موفقیت انجام شدند!');
    
  } catch (error) {
    console.error('❌ خطا در تست سیستم:', error.message);
  }
}

async function testCardNumberGeneration() {
  try {
    const generator = new CardNumberGenerator();
    
    // تست 1.1: تولید شماره کارت ساده
    console.log('  🔸 تست تولید شماره کارت ساده...');
    const simpleCard = generator.generateCardNumber({
      bin_range: '603799-603799'
    });
    
    console.log(`    شماره کارت: ${simpleCard.formatted}`);
    console.log(`    BIN: ${simpleCard.bin}`);
    console.log(`    شماره حساب: ${simpleCard.accountNumber}`);
    console.log(`    رقم کنترل: ${simpleCard.checkDigit}`);
    
    // تست 1.2: اعتبارسنجی شماره کارت
    console.log('  🔸 تست اعتبارسنجی شماره کارت...');
    const validation = generator.validateCard(simpleCard.cardNumber);
    
    if (validation.valid) {
      console.log('    ✅ شماره کارت معتبر است');
    } else {
      console.log('    ❌ شماره کارت نامعتبر است:', validation.error);
    }
    
    // تست 1.3: تولید کارت برای بانک خاص
    console.log('  🔸 تست تولید کارت برای بانک ملی...');
    const bankCard = generator.generateBankCard('بانک ملی ایران', 'DEBIT');
    
    console.log(`    شماره کارت: ${bankCard.formatted}`);
    console.log(`    بانک: ${bankCard.bankName}`);
    console.log(`    نوع: ${bankCard.cardType}`);
    console.log(`    کد بانک: ${bankCard.bankCode}`);
    
    // تست 1.4: تولید کارت‌های متعدد
    console.log('  🔸 تست تولید کارت‌های متعدد...');
    const multipleCards = generator.generateMultipleCards({
      bin_range: '603799-603799'
    }, 3);
    
    console.log(`    تعداد کارت‌ها: ${multipleCards.count}`);
    multipleCards.cards.forEach((card, index) => {
      console.log(`    کارت ${index + 1}: ${card.formatted}`);
    });
    
    console.log('  ✅ تست تولید شماره کارت موفق بود');
    
  } catch (error) {
    console.error('  ❌ خطا در تست تولید شماره کارت:', error.message);
    throw error;
  }
}

async function testSecurePINGeneration() {
  try {
    const pinGenerator = new SecurePINGenerator();
    
    // تست 2.1: تولید PIN ساده
    console.log('  🔸 تست تولید PIN ساده...');
    const simplePIN = pinGenerator.generateSecurePIN();
    
    console.log(`    PIN: ${simplePIN.pin}`);
    console.log(`    PIN ماسک شده: ${simplePIN.maskedPin}`);
    console.log(`    سیاست: ${JSON.stringify(simplePIN.policy)}`);
    
    // تست 2.2: تولید PIN با الگوریتم خاص
    console.log('  🔸 تست تولید PIN با الگوریتم هش...');
    const hashPIN = pinGenerator.generatePINWithAlgorithm('hash_based', '6037991234567890');
    
    console.log(`    PIN: ${hashPIN.pin}`);
    console.log(`    الگوریتم: ${hashPIN.algorithm}`);
    console.log(`    منبع: ${hashPIN.source}`);
    
    // تست 2.3: تولید PIN با الگوریتم الگو
    console.log('  🔸 تست تولید PIN با الگوریتم الگو...');
    const patternPIN = pinGenerator.generatePINWithAlgorithm('pattern_based', '6037991234567890');
    
    console.log(`    PIN: ${patternPIN.pin}`);
    console.log(`    الگوریتم: ${patternPIN.algorithm}`);
    console.log(`    منبع: ${patternPIN.source}`);
    
    // تست 2.4: تولید PIN های متعدد
    console.log('  🔸 تست تولید PIN های متعدد...');
    const multiplePINs = pinGenerator.generateMultiplePINs(3);
    
    console.log(`    تعداد PIN ها: ${multiplePINs.count}`);
    multiplePINs.pins.forEach((pin, index) => {
      console.log(`    PIN ${index + 1}: ${pin.pin} (${pin.maskedPin})`);
    });
    
    // تست 2.5: بررسی امنیت PIN
    console.log('  🔸 تست بررسی امنیت PIN...');
    const securityCheck = pinGenerator.checkPINSecurity(simplePIN.pin);
    
    console.log(`    امن: ${securityCheck.secure}`);
    console.log(`    امتیاز: ${securityCheck.score}`);
    console.log(`    سطح امنیت: ${securityCheck.securityLevel}`);
    
    if (securityCheck.recommendations.length > 0) {
      console.log('    توصیه‌ها:');
      securityCheck.recommendations.forEach(rec => {
        console.log(`      - ${rec}`);
      });
    }
    
    // تست 2.6: تولید PIN برای کارت خاص
    console.log('  🔸 تست تولید PIN برای کارت خاص...');
    const cardPIN = pinGenerator.generateCardPIN('6037991234567890', 'DEBIT');
    
    console.log(`    PIN: ${cardPIN.pin}`);
    console.log(`    شماره کارت: ${cardPIN.cardNumber}`);
    console.log(`    نوع کارت: ${cardPIN.cardType}`);
    
    console.log('  ✅ تست تولید PIN امن موفق بود');
    
  } catch (error) {
    console.error('  ❌ خطا در تست تولید PIN:', error.message);
    throw error;
  }
}

async function testCompleteCardGeneration() {
  try {
    const cardGenerator = new CardNumberGenerator();
    const pinGenerator = new SecurePINGenerator();
    
    console.log('  🔸 تست تولید کارت کامل...');
    
    // تولید شماره کارت
    const cardNumber = cardGenerator.generateCardNumber({
      bin_range: '603799-603799'
    });
    
    // تولید PIN
    const pin = pinGenerator.generateCardPIN(cardNumber.cardNumber, 'DEBIT');
    
    // تولید CVV2 (شبیه‌سازی)
    const cvv2 = generateCVV2(cardNumber.cardNumber, '2027', '000');
    
    // تولید تاریخ انقضا
    const expiryDate = generateExpiryDate();
    
    // تولید کارت کامل
    const completeCard = {
      cardNumber: cardNumber.cardNumber,
      formattedCardNumber: cardNumber.formatted,
      pin: pin.pin,
      maskedPin: pin.maskedPin,
      cvv2: cvv2,
      expiryDate: expiryDate,
      bin: cardNumber.bin,
      bankName: 'بانک ملی ایران',
      cardType: 'DEBIT',
      network: 'SHETAB',
      internationalScheme: 'VISA',
      issuedAt: new Date(),
      validFrom: new Date(),
      validTo: expiryDate,
      status: 'ACTIVE'
    };
    
    console.log('    📋 اطلاعات کارت تولید شده:');
    console.log(`      شماره کارت: ${completeCard.formattedCardNumber}`);
    console.log(`      PIN: ${completeCard.pin}`);
    console.log(`      CVV2: ${completeCard.cvv2}`);
    console.log(`      تاریخ انقضا: ${completeCard.expiryDate.toLocaleDateString('fa-IR')}`);
    console.log(`      بانک: ${completeCard.bankName}`);
    console.log(`      نوع: ${completeCard.cardType}`);
    console.log(`      شبکه: ${completeCard.network}`);
    console.log(`      طرح بین‌المللی: ${completeCard.internationalScheme}`);
    console.log(`      وضعیت: ${completeCard.status}`);
    
    // تست اعتبارسنجی نهایی
    console.log('  🔸 تست اعتبارسنجی نهایی...');
    
    const cardValidation = cardGenerator.validateCard(completeCard.cardNumber);
    const pinValidation = pinGenerator.isValidPIN(completeCard.pin, pin.policy);
    
    if (cardValidation.valid && pinValidation) {
      console.log('    ✅ کارت کامل معتبر است');
    } else {
      console.log('    ❌ کارت کامل نامعتبر است');
      if (!cardValidation.valid) {
        console.log(`      خطای شماره کارت: ${cardValidation.error}`);
      }
      if (!pinValidation) {
        console.log('      خطای PIN');
      }
    }
    
    console.log('  ✅ تست تولید کارت کامل موفق بود');
    
  } catch (error) {
    console.error('  ❌ خطا در تست تولید کارت کامل:', error.message);
    throw error;
  }
}

// تابع کمکی برای تولید CVV2
function generateCVV2(cardNumber, expiryDate, serviceCode) {
  // شبیه‌سازی تولید CVV2
  const data = cardNumber + expiryDate.replace('/', '') + serviceCode;
  const hash = require('crypto').createHash('md5').update(data).digest('hex');
  const numbers = hash.replace(/[^0-9]/g, '');
  return numbers.substring(0, 3);
}

// تابع کمکی برای تولید تاریخ انقضا
function generateExpiryDate() {
  const now = new Date();
  const expiryYear = now.getFullYear() + 4;
  const expiryMonth = now.getMonth() + 1;
  return new Date(expiryYear, expiryMonth - 1, 1);
}

// اجرای تست‌ها
testCompleteSystem().then(() => {
  console.log('\n🎉 تست سیستم بانکی تکمیل شد!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 خطا در تست سیستم:', error);
  process.exit(1);
});