/**
 * تست ساده API های واقعی کارت
 * Simple Test for Real Card APIs
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testSimpleAPI() {
  console.log('🚀 شروع تست ساده API...\n');

  try {
    // تست 1: سلامت سرور اصلی
    console.log('📋 تست 1: سلامت سرور اصلی');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ سلامت سرور:', healthResponse.data.status);
    console.log('');

    // تست 2: سلامت API واقعی کارت
    console.log('📋 تست 2: سلامت API واقعی کارت');
    try {
      const realHealthResponse = await axios.get(`${BASE_URL}/api/real-cards/health`);
      console.log('✅ سلامت API واقعی کارت:', realHealthResponse.data.health?.status);
    } catch (error) {
      console.log('❌ خطا در API واقعی کارت:', error.response?.status, error.response?.data?.error);
    }
    console.log('');

    // تست 3: دریافت آمار
    console.log('📋 تست 3: دریافت آمار');
    const statsResponse = await axios.get(`${BASE_URL}/api/stats`);
    console.log('✅ آمار سیستم:', statsResponse.data.stats?.totalCards || 0, 'کارت');
    console.log('');

    console.log('🎉 تست ساده تکمیل شد!');

  } catch (error) {
    console.error('❌ خطا در تست:', error.response?.data || error.message);
  }
}

// اجرای تست
testSimpleAPI().catch(console.error);