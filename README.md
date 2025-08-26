# 🏦 Banking Application with JWT Authentication

A comprehensive banking system built with Node.js, Express, MongoDB, and JWT authentication. This application provides secure banking operations including user management, account management, and transaction processing.

## ✨ Features

- **🔐 JWT Authentication**: Secure user authentication with token-based sessions
- **👥 User Management**: User registration, login, profile management, and role-based access control
- **🏦 Account Management**: Multiple account types (savings, checking, current, investment, loan)
- **💰 Transaction Processing**: Deposits, withdrawals, transfers, and transaction history
- **🛡️ Security Features**: Password hashing, rate limiting, input validation, and account locking
- **📊 Admin Panel**: Comprehensive admin interface for managing users, accounts, and transactions
- **🔍 Advanced Filtering**: Search and filter capabilities for all data
- **📱 RESTful API**: Clean and well-documented API endpoints

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd banking-jwt-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   MONGODB_URI=mongodb://localhost:27017/banking-app
   ```

4. **Start MongoDB**
   ```bash
   # Start MongoDB service
   sudo systemctl start mongod
   
   # Or run MongoDB locally
   mongod
   ```

5. **Run the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Verify installation**
   ```bash
   curl http://localhost:3000/health
   ```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "علی",
  "lastName": "احمدی",
  "email": "ali.ahmadi@example.com",
  "phone": "+989123456789",
  "nationalId": "1234567890",
  "dateOfBirth": "1990-01-01",
  "address": {
    "street": "خیابان ولیعصر",
    "city": "تهران",
    "state": "تهران",
    "postalCode": "12345",
    "country": "Iran"
  },
  "password": "SecurePass123!"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "ali.ahmadi@example.com",
  "password": "SecurePass123!"
}
```

#### Get Profile
```http
GET /api/auth/me
Authorization: Bearer <JWT_TOKEN>
```

### Account Management

#### Create Account
```http
POST /api/accounts
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "accountType": "savings",
  "currency": "IRR",
  "branch": "شعبه مرکزی",
  "initialDeposit": 1000000,
  "notes": "حساب پس‌انداز شخصی"
}
```

#### Get User Accounts
```http
GET /api/accounts
Authorization: Bearer <JWT_TOKEN>
```

#### Get Account Balance
```http
GET /api/accounts/:accountId/balance
Authorization: Bearer <JWT_TOKEN>
```

### Transaction Operations

#### Make Deposit
```http
POST /api/transactions/deposit
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "amount": 500000,
  "description": "واریز حقوق ماهانه",
  "category": "bills",
  "toAccount": "account_id_here"
}
```

#### Make Withdrawal
```http
POST /api/transactions/withdrawal
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "amount": 200000,
  "description": "برداشت نقدی",
  "category": "shopping",
  "fromAccount": "account_id_here"
}
```

#### Transfer Money
```http
POST /api/transactions/transfer
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "amount": 300000,
  "description": "انتقال بین حساب‌ها",
  "fromAccount": "source_account_id",
  "toAccount": "target_account_id"
}
```

#### Get Transaction History
```http
GET /api/transactions?page=1&limit=20&type=transfer&category=shopping
Authorization: Bearer <JWT_TOKEN>
```

### Admin Endpoints

#### Get All Users
```http
GET /api/users?page=1&limit=10&role=customer&status=active
Authorization: Bearer <JWT_TOKEN>
```

#### Get All Accounts
```http
GET /api/accounts/admin/all?page=1&limit=10&status=active
Authorization: Bearer <JWT_TOKEN>
```

#### Get All Transactions
```http
GET /api/transactions/admin/all?page=1&limit=20&type=transfer
Authorization: Bearer <JWT_TOKEN>
```

## 🔐 Security Features

### JWT Token Structure
```json
{
  "userId": "user_id_here",
  "email": "user@example.com",
  "role": "customer",
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Account Security
- Account locking after 5 failed login attempts
- 2-hour lock duration
- Rate limiting (100 requests per 15 minutes)
- Input validation and sanitization
- SQL injection protection

## 🏗️ Architecture

```
banking-jwt-api/
├── config/
│   └── database.js          # MongoDB connection configuration
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── models/
│   ├── User.js              # User model with authentication
│   ├── Account.js           # Bank account model
│   └── Transaction.js       # Transaction model
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management routes
│   ├── accounts.js          # Account management routes
│   └── transactions.js      # Transaction routes
├── server.js                 # Main application file
├── package.json              # Dependencies and scripts
└── .env.example             # Environment variables template
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📊 Database Schema

### User Collection
- Personal information (name, email, phone, national ID)
- Address details
- Authentication (password, JWT tokens)
- Role-based access control
- Account status and security

### Account Collection
- Account types (savings, checking, current, investment, loan)
- Balance and currency
- Transaction limits and fees
- Account status and management

### Transaction Collection
- Transaction types (deposit, withdrawal, transfer, payment)
- Amount, fees, and descriptions
- Source and destination accounts
- Metadata and audit trail

## 🚀 Deployment

### Production Environment
```bash
# Set production environment
NODE_ENV=production

# Use strong JWT secret
JWT_SECRET=your-very-long-and-complex-secret-key

# Configure MongoDB connection
MONGODB_URI=mongodb://username:password@host:port/database

# Enable HTTPS
HTTPS_ENABLED=true
SSL_CERT_PATH=/path/to/certificate
SSL_KEY_PATH=/path/to/private/key
```

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Configuration Options

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `JWT_SECRET` | - | JWT signing secret |
| `JWT_EXPIRES_IN` | 24h | Token expiration time |
| `MONGODB_URI` | mongodb://localhost:27017/banking-app | MongoDB connection string |
| `BCRYPT_ROUNDS` | 12 | Password hashing rounds |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limiting window (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Maximum requests per window |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact: support@banking-app.com
- Documentation: https://docs.banking-app.com

## 🔮 Roadmap

- [ ] Two-factor authentication (2FA)
- [ ] Mobile app API endpoints
- [ ] Real-time notifications
- [ ] Advanced reporting and analytics
- [ ] Multi-currency support
- [ ] API rate limiting per user
- [ ] Webhook support for external integrations
- [ ] Audit logging system

---

**⚠️ Important**: This is a demonstration application. For production use, ensure proper security measures, compliance with banking regulations, and thorough testing.
