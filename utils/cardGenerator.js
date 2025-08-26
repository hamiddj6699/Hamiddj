const crypto = require('crypto');

// Simple Luhn algorithm implementation
function generateLuhnCheckDigit(number) {
  let sum = 0;
  let isEven = false;
  
  // Process from right to left
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return (10 - (sum % 10)) % 10;
}

function validateLuhn(number) {
  const checkDigit = parseInt(number.slice(-1));
  const numberWithoutCheck = number.slice(0, -1);
  const calculatedCheck = generateLuhnCheckDigit(numberWithoutCheck);
  
  return checkDigit === calculatedCheck;
}

class CardGenerator {
  constructor() {
    // Iranian Bank BIN ranges (Bank Identification Numbers)
    this.bankBins = {
      'شتاب': ['603799', '627353', '585983', '610433'],
      'ملی': ['603799', '170019', '589463'],
      'پارسیان': ['622106', '622108', '627884'],
      'ملت': ['610433', '991975', '639346'],
      'تجارت': ['627353', '585983', '589463'],
      'سامان': ['621986', '639607'],
      'پاسارگاد': ['502229', '639347'],
      'سپه': ['589210', '639607'],
      'کشاورزی': ['603770', '639217'],
      'صنعت و معدن': ['627381', '639599']
    };

    // Card network BIN patterns
    this.networkBins = {
      'Visa': ['4'],
      'MasterCard': ['51', '52', '53', '54', '55', '2221', '2222', '2223', '2224', '2225', '2226', '2227', '2228', '2229', '223', '224', '225', '226', '227', '228', '229', '23', '24', '25', '26', '270', '271', '2720'],
      'American Express': ['34', '37'],
      'Discover': ['6011', '622126', '622127', '622128', '622129', '62213', '62214', '62215', '62216', '62217', '62218', '62219', '6222', '6223', '6224', '6225', '6226', '6227', '6228', '62290', '62291', '62292', '62293', '62294', '62295', '62296', '62297', '62298', '62299', '644', '645', '646', '647', '648', '649', '65'],
      'UnionPay': ['62']
    };

    // Service codes for different card types
    this.serviceCodes = {
      'شتاب': '201',      // ATM and POS
      'ملی': '201',       // ATM and POS
      'پارسیان': '201',   // ATM and POS
      'ملت': '201',       // ATM and POS
      'تجارت': '201',     // ATM and POS
      'سامان': '201',     // ATM and POS
      'پاسارگاد': '201',  // ATM and POS
      'سپه': '201',       // ATM and POS
      'کشاورزی': '201',  // ATM and POS
      'صنعت و معدن': '201' // ATM and POS
    };
  }

  // Generate a valid card number using Luhn algorithm
  generateCardNumber(bankType, networkType) {
    let bin;
    
    // Select appropriate BIN based on bank and network
    if (networkType === 'Visa' || networkType === 'MasterCard') {
      // Use international network BINs
      if (networkType === 'Visa') {
        bin = '4';
      } else if (networkType === 'MasterCard') {
        bin = this.networkBins.MasterCard[Math.floor(Math.random() * this.networkBins.MasterCard.length)];
      }
    } else {
      // Use Iranian bank BINs
      const bankBins = this.bankBins[bankType];
      bin = bankBins[Math.floor(Math.random() * bankBins.length)];
    }

    // Generate middle digits (excluding last digit for Luhn)
    const middleLength = 16 - bin.length - 1;
    let middle = '';
    for (let i = 0; i < middleLength; i++) {
      middle += Math.floor(Math.random() * 10);
    }

    // Combine BIN + middle digits
    const partialCardNumber = bin + middle;

    // Calculate check digit using Luhn algorithm
    const checkDigit = generateLuhnCheckDigit(partialCardNumber);

    return partialCardNumber + checkDigit;
  }

  // Generate a random 4-digit PIN
  generatePIN() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  // Generate a random 3-digit CVV2
  generateCVV2() {
    return Math.floor(100 + Math.random() * 900).toString();
  }

  // Generate expiration date (valid for 3-5 years)
  generateExpiryDate() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Random year between current + 3 and current + 5
    const expiryYear = currentYear + 3 + Math.floor(Math.random() * 3);
    
    // Random month (1-12)
    const expiryMonth = Math.floor(Math.random() * 12) + 1;
    
    return { expiryMonth, expiryYear };
  }

  // Generate Track 1 data according to ISO 7813
  generateTrack1(cardNumber, cardholderName, expiryMonth, expiryYear, serviceCode) {
    // Track 1 format: %B[PAN]^[SURNAME]/[FIRSTNAME]^[YY][MM][SERVICE_CODE][DISCRETIONARY_DATA]?
    
    // Format cardholder name (SURNAME/FIRSTNAME)
    const nameParts = cardholderName.split(' ');
    const surname = nameParts[nameParts.length - 1] || '';
    const firstName = nameParts.slice(0, -1).join(' ') || '';
    const formattedName = `${surname}/${firstName}`.padEnd(26, ' ');
    
    // Format expiry date (YYMM)
    const expiryYY = expiryYear.toString().slice(-2);
    const expiryMM = expiryMonth.toString().padStart(2, '0');
    
    // Service code (3 digits)
    const formattedServiceCode = serviceCode.padStart(3, '0');
    
    // Discretionary data (can include country code, currency, etc.)
    const discretionaryData = 'IRR'; // Iranian Rial
    
    // Construct Track 1
    const track1Data = `%B${cardNumber}^${formattedName}^${expiryYY}${expiryMM}${formattedServiceCode}${discretionaryData}?`;
    
    return track1Data;
  }

  // Generate Track 2 data according to ISO 7813
  generateTrack2(cardNumber, expiryMonth, expiryYear, serviceCode) {
    // Track 2 format: ;[PAN]=[YY][MM][SERVICE_CODE][DISCRETIONARY_DATA]?
    
    // Format expiry date (YYMM)
    const expiryYY = expiryYear.toString().slice(-2);
    const expiryMM = expiryMonth.toString().padStart(2, '0');
    
    // Service code (3 digits)
    const formattedServiceCode = serviceCode.padStart(3, '0');
    
    // Discretionary data (can include country code, currency, etc.)
    const discretionaryData = 'IRR'; // Iranian Rial
    
    // Construct Track 2
    const track2Data = `;${cardNumber}=${expiryYY}${expiryMM}${formattedServiceCode}${discretionaryData}?`;
    
    return track2Data;
  }

  // Generate magnetic stripe data (encoded version)
  generateMagneticStripeData(track1, track2) {
    // Convert to magnetic stripe encoding (simple ASCII for demo)
    // In real implementation, this would use proper magnetic stripe encoding
    const track1Encoded = Buffer.from(track1, 'utf8').toString('base64');
    const track2Encoded = Buffer.from(track2, 'utf8').toString('base64');
    
    return {
      track1Encoded,
      track2Encoded,
      rawTrack1: track1,
      rawTrack2: track2
    };
  }

  // Generate a complete card with all data
  generateCompleteCard(bankType, networkType, cardholderName, accountId, userId, generatedBy) {
    // Generate basic card data
    const cardNumber = this.generateCardNumber(bankType, networkType);
    const pin = this.generatePIN();
    const cvv2 = this.generateCVV2();
    const { expiryMonth, expiryYear } = this.generateExpiryDate();
    
    // Get service code for the bank
    const serviceCode = this.serviceCodes[bankType] || '201';
    
    // Generate track data
    const track1 = this.generateTrack1(cardNumber, cardholderName, expiryMonth, expiryYear, serviceCode);
    const track2 = this.generateTrack2(cardNumber, expiryMonth, expiryYear, serviceCode);
    
    // Generate magnetic stripe data
    const magneticStripeData = this.generateMagneticStripeData(track1, track2);
    
    // Create card object
    const card = {
      cardNumber,
      cardholderName,
      pin,
      cvv2,
      expiryMonth,
      expiryYear,
      track1,
      track2,
      cardType: bankType,
      cardNetwork: networkType,
      accountId,
      userId,
      generatedBy,
      magneticStripeData: JSON.stringify(magneticStripeData),
      status: 'فعال',
      isChipEnabled: true,
      isContactlessEnabled: true,
      dailyLimit: 5000000, // 5 million IRR
      monthlyLimit: 50000000 // 50 million IRR
    };
    
    return card;
  }

  // Validate card number using Luhn algorithm
  validateCardNumber(cardNumber) {
    return validateLuhn(cardNumber);
  }

  // Generate multiple cards for testing
  generateMultipleCards(count, bankType, networkType, cardholderName, accountId, userId, generatedBy) {
    const cards = [];
    
    for (let i = 0; i < count; i++) {
      const card = this.generateCompleteCard(bankType, networkType, cardholderName, accountId, userId, generatedBy);
      cards.push(card);
    }
    
    return cards;
  }

  // Generate card for specific Iranian bank
  generateIranianBankCard(bankType, cardholderName, accountId, userId, generatedBy) {
    // Iranian banks typically use local networks
    const networkType = 'UnionPay'; // Most Iranian banks use UnionPay network
    
    return this.generateCompleteCard(bankType, networkType, cardholderName, accountId, userId, generatedBy);
  }

  // Generate international network card
  generateInternationalCard(networkType, cardholderName, accountId, userId, generatedBy) {
    // For international cards, use a generic bank type
    const bankType = 'شتاب'; // Default Iranian bank
    
    return this.generateCompleteCard(bankType, networkType, cardholderName, accountId, userId, generatedBy);
  }

  // Get card information summary
  getCardSummary(card) {
    return {
      cardNumber: card.cardNumber,
      maskedCardNumber: card.cardNumber.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4'),
      lastFourDigits: card.cardNumber.slice(-4),
      cardholderName: card.cardholderName,
      expiryDate: `${card.expiryMonth.toString().padStart(2, '0')}/${card.expiryYear}`,
      cardType: card.cardType,
      cardNetwork: card.cardNetwork,
      status: card.status,
      isActive: card.isActive ? card.isActive() : true
    };
  }

  // Generate card verification data
  generateVerificationData(card) {
    return {
      cardNumber: card.cardNumber,
      pin: card.pin,
      cvv2: card.cvv2,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      track1: card.track1,
      track2: card.track2,
      magneticStripeData: card.magneticStripeData
    };
  }
}

module.exports = CardGenerator;