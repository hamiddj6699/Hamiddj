/**
 * شبیه‌ساز تراکنش خرید POS
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3002/api/pos/authorize';

function formatAmount(amount) {
  return amount.toLocaleString('fa-IR') + ' ریال';
}

function printReceipt(data) {
  const r = data.result;
  console.log('================= رسید خرید (POS) =================');
  console.log(`نتیجه: ${r.approved ? 'موفق' : 'ناموفق'}  | کد پاسخ: ${r.responseCode}`);
  console.log(`مبلغ: ${formatAmount(r.amount)}  | ارز: ${r.currency}`);
  console.log(`کد تایید: ${r.authCode}  | RRN: ${r.rrn}  | STAN: ${r.stan}`);
  console.log(`کارت: ${r.card.panMasked} (BIN: ${r.card.bin})`);
  console.log(`بانک صادرکننده: ${r.card.bankName}`);
  console.log(`پذیرنده: ${r.merchant.name} (${r.merchant.id}) | ترمینال: ${r.merchant.terminalId}`);
  console.log(`تاریخ/زمان: ${new Date(r.timestamp).toLocaleString('fa-IR')}`);
  console.log(`موجودی پس از تراکنش: ${formatAmount(r.balanceAfter)}`);
  console.log('====================================================');
}

async function main() {
  const cardNumber = process.argv[2] || '6104331046285593';
  const amount = parseInt(process.argv[3] || '150000', 10);
  const pin = process.argv[4] || '9880';

  try {
    const response = await axios.post(BASE_URL, {
      cardNumber,
      amount,
      pin,
      merchant: { id: 'MER123456', name: 'فروشگاه تست', terminalId: 'TERM0001' }
    }, { headers: { 'Content-Type': 'application/json' } });

    if (response.data.success) {
      printReceipt(response.data);
    } else {
      console.error('تراکنش ناموفق:', response.data.error || 'نامشخص');
    }
  } catch (error) {
    if (error.response) {
      console.error('خطا:', error.response.status, error.response.data);
    } else {
      console.error('خطای شبکه:', error.message);
    }
  }
}

main().catch(console.error);