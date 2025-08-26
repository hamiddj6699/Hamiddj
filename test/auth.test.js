const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');

describe('Authentication API', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/banking-app-test');
  });

  afterAll(async () => {
    // Close database connection
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        firstName: 'علی',
        lastName: 'احمدی',
        nationalId: '1234567890',
        phone: '09123456789',
        email: 'ali@example.com',
        password: 'Password123!',
        dateOfBirth: '1990-01-01',
        address: {
          street: 'خیابان ولیعصر',
          city: 'تهران',
          postalCode: '12345'
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it('should not register user with duplicate email', async () => {
      const userData = {
        firstName: 'فاطمه',
        lastName: 'محمدی',
        nationalId: '0987654321',
        phone: '09876543210',
        email: 'ali@example.com', // Duplicate email
        password: 'Password123!',
        dateOfBirth: '1995-01-01'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('قبلاً ثبت شده است');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully with valid credentials', async () => {
      const loginData = {
        email: 'ali@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(loginData.email);
    });

    it('should not login with invalid password', async () => {
      const loginData = {
        email: 'ali@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('ایمیل یا رمز عبور اشتباه است');
    });
  });
});