// Test setup file for Jest
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.MONGODB_URI = 'mongodb://localhost:27017/banking-app-test';

// Increase timeout for tests
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Helper to create test user data
  createTestUser: (overrides = {}) => ({
    firstName: 'Test',
    lastName: 'User',
    email: `test${Date.now()}@example.com`,
    phone: '+989123456789',
    nationalId: `123456789${Date.now()}`,
    dateOfBirth: '1990-01-01',
    address: {
      street: 'Test Street',
      city: 'Test City',
      state: 'Test State',
      postalCode: '12345',
      country: 'Iran'
    },
    password: 'TestPass123!',
    ...overrides
  }),

  // Helper to create test account data
  createTestAccount: (overrides = {}) => ({
    accountType: 'savings',
    currency: 'IRR',
    branch: 'Test Branch',
    balance: 1000000,
    interestRate: 10,
    monthlyFee: 0,
    minimumBalance: 100000,
    dailyLimit: 10000000,
    monthlyLimit: 100000000,
    notes: 'Test account',
    ...overrides
  }),

  // Helper to create test transaction data
  createTestTransaction: (overrides = {}) => ({
    type: 'deposit',
    amount: 100000,
    description: 'Test transaction',
    category: 'other',
    status: 'completed',
    ...overrides
  })
};

// Mock console methods in tests to reduce noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});