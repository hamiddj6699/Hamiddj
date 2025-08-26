const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

describe('Authentication API', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/banking-app-test');
  });

  afterAll(async () => {
    // Clean up and close connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear users before each test
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      firstName: 'علی',
      lastName: 'احمدی',
      email: 'ali.ahmadi@test.com',
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
      password: 'SecurePass123!'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(validUserData.email);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should not register user with existing email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(400);

      expect(response.body.error).toBe('User already exists');
    });

    it('should validate required fields', async () => {
      const invalidData = { ...validUserData };
      delete invalidData.firstName;

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    const userData = {
      firstName: 'فاطمه',
      lastName: 'محمدی',
      email: 'fateme.mohammadi@test.com',
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
      password: 'SecurePass456!'
    };

    beforeEach(async () => {
      // Register user before login tests
      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
    });

    it('should not login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: userData.password
        })
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
    });
  });

  describe('GET /api/auth/me', () => {
    let token;
    let user;

    beforeEach(async () => {
      // Register and login user
      const userData = {
        firstName: 'رضا',
        lastName: 'کریمی',
        email: 'reza.karimi@test.com',
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
        password: 'SecurePass789!'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      token = registerResponse.body.token;
      user = registerResponse.body.user;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(user.email);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Access denied');
    });

    it('should not get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });
  });
});