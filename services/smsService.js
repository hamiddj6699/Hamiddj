// const axios = require('axios'); // در حالت توسعه نیاز نیست

class SMSService {
  constructor(provider = 'kavehNegar') {
    this.provider = provider;
    this.config = this.loadConfig();
  }

  loadConfig() {
    switch (this.provider) {
      case 'kavehNegar':
        return {
          apiKey: process.env.KAVEH_NEGAR_API_KEY,
          sender: process.env.KAVEH_NEGAR_SENDER,
          baseUrl: 'https://api.kavenegar.com/v1'
        };
      default:
        throw new Error(`SMS provider '${this.provider}' is not supported`);
    }
  }

  async sendSMS(recipient, message) {
    // بررسی حالت توسعه
    if (process.env.SMS_DEVELOPMENT_MODE === 'true') {
      console.log('🔧 حالت توسعه فعال - پیامک واقعی ارسال نمی‌شود');
      console.log(`📱 گیرنده: ${recipient}`);
      console.log(`💬 پیام: ${message}`);
      console.log(`📤 فرستنده: ${this.config.sender}`);
      
      // شبیه‌سازی تاخیر ارسال
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // شبیه‌سازی پاسخ موفق
      const mockMessageId = Math.random().toString(36).substr(2, 9);
      return {
        success: true,
        messageId: mockMessageId,
        cost: 0,
        message: 'پیامک با موفقیت ارسال شد (حالت توسعه)',
        development: true
      };
    }

    // حالت تولید - استفاده از API واقعی
    if (!this.config.apiKey) {
      throw new Error('API key is not configured');
    }

    if (!this.config.sender) {
      throw new Error('Sender ID is not configured');
    }

    try {
      const response = await axios.post(`${this.config.baseUrl}/${this.config.apiKey}/sms/send.json`, {
        receptor: recipient,
        message: message,
        sender: this.config.sender
      });

      if (response.data && response.data.return && response.data.return.status === 200) {
        return {
          success: true,
          messageId: response.data.entries[0].messageid,
          cost: response.data.entries[0].cost,
          message: 'پیامک با موفقیت ارسال شد'
        };
      } else {
        throw new Error(response.data?.return?.message || 'خطا در ارسال پیامک');
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`خطای API: ${error.response.data?.return?.message || error.message}`);
      }
      throw new Error(`خطا در ارسال پیامک: ${error.message}`);
    }
  }

  async getBalance() {
    // بررسی حالت توسعه
    if (process.env.SMS_DEVELOPMENT_MODE === 'true') {
      console.log('🔧 حالت توسعه فعال - موجودی واقعی دریافت نمی‌شود');
      
      // شبیه‌سازی تاخیر
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // شبیه‌سازی موجودی
      return {
        balance: 1000,
        currency: 'تومان',
        development: true,
        message: 'موجودی شبیه‌سازی شده (حالت توسعه)'
      };
    }

    // حالت تولید - استفاده از API واقعی
    if (!this.config.apiKey) {
      throw new Error('API key is not configured');
    }

    try {
      const response = await axios.get(`${this.config.baseUrl}/${this.config.apiKey}/account/info.json`);
      
      if (response.data && response.data.return && response.data.return.status === 200) {
        return {
          balance: response.data.entries[0].remaincredit,
          currency: 'تومان'
        };
      } else {
        throw new Error(response.data?.return?.message || 'خطا در دریافت اطلاعات حساب');
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`خطای API: ${error.response.data?.return?.message || error.message}`);
      }
      throw new Error(`خطا در دریافت اطلاعات حساب: ${error.message}`);
    }
  }

  async getMessageStatus(messageId) {
    // بررسی حالت توسعه
    if (process.env.SMS_DEVELOPMENT_MODE === 'true') {
      console.log('🔧 حالت توسعه فعال - وضعیت واقعی دریافت نمی‌شود');
      console.log(`🆔 شناسه پیام: ${messageId}`);
      
      // شبیه‌سازی تاخیر
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // شبیه‌سازی وضعیت تصادفی
      const randomStatus = Math.floor(Math.random() * 4) + 1;
      const statusMap = { 1: 2, 2: 4, 3: 8, 4: 16 };
      const status = statusMap[randomStatus];
      
      return {
        messageId: messageId,
        status: status,
        statusText: this.getStatusText(status),
        development: true,
        message: 'وضعیت شبیه‌سازی شده (حالت توسعه)'
      };
    }

    // حالت تولید - استفاده از API واقعی
    if (!this.config.apiKey) {
      throw new Error('API key is not configured');
    }

    try {
      const response = await axios.get(`${this.config.baseUrl}/${this.config.apiKey}/sms/status.json`, {
        params: { messageid: messageId }
      });

      if (response.data && response.data.return && response.data.return.status === 200) {
        return {
          messageId: messageId,
          status: response.data.entries[0].status,
          statusText: this.getStatusText(response.data.entries[0].status)
        };
      } else {
        throw new Error(response.data?.return?.message || 'خطا در دریافت وضعیت پیامک');
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`خطای API: ${error.response.data?.return?.message || error.message}`);
      }
      throw new Error(`خطا در دریافت وضعیت پیامک: ${error.message}`);
    }
  }

  getStatusText(status) {
    const statusMap = {
      1: 'در صف ارسال',
      2: 'ارسال شده',
      4: 'تحویل شده',
      8: 'تحویل نشده',
      16: 'خطا در ارسال'
    };
    return statusMap[status] || 'وضعیت نامشخص';
  }
}

module.exports = SMSService;