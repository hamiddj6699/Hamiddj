# 🏦 Banking API with JWT Authentication

A comprehensive banking application built with Flask, featuring JWT authentication, secure transaction processing, and RESTful APIs.

## ✨ Features

### 🔐 Authentication & Security
- JWT-based authentication with access and refresh tokens
- Password strength validation
- Secure password hashing with bcrypt
- Token blacklisting for logout
- Input validation and sanitization

### 🏦 Banking Operations
- User registration and profile management
- Multiple account types (checking, savings, business)
- Account creation and management
- Balance inquiries
- Money deposits and withdrawals
- Inter-account transfers
- Transaction history with filtering
- Comprehensive audit trail

### 🛡️ Security Features
- JWT token expiration and refresh
- Role-based access control
- Account ownership validation
- Transaction integrity checks
- Error handling and logging

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- pip package manager

### Installation

1. **Clone or download the project files**

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure environment variables:**
```bash
# Copy and modify the .env file
cp .env .env.local
# Edit .env.local with your preferred settings
```

4. **Run the application:**
```bash
python app.py
```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "phone_number": "+1234567890",
  "national_id": "1234567890"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "SecurePass123!"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer <refresh_token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <access_token>
```

### Banking Endpoints

#### Create Account
```http
POST /api/banking/accounts
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "account_type": "checking",
  "currency": "USD"
}
```

#### Get User Accounts
```http
GET /api/banking/accounts
Authorization: Bearer <access_token>
```

#### Get Account Balance
```http
GET /api/banking/accounts/{account_number}/balance
Authorization: Bearer <access_token>
```

#### Deposit Money
```http
POST /api/banking/deposit
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "account_number": "123456789012",
  "amount": 1000.00,
  "description": "Salary deposit"
}
```

#### Withdraw Money
```http
POST /api/banking/withdraw
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "account_number": "123456789012",
  "amount": 200.00,
  "description": "ATM withdrawal"
}
```

#### Transfer Money
```http
POST /api/banking/transfer
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "from_account_number": "123456789012",
  "to_account_number": "987654321098",
  "amount": 500.00,
  "description": "Transfer to friend"
}
```

#### Get Transaction History
```http
GET /api/banking/transactions?limit=50&offset=0&type=transfer
Authorization: Bearer <access_token>
```

#### Get Transaction Details
```http
GET /api/banking/transactions/{transaction_id}
Authorization: Bearer <access_token>
```

## 🧪 Testing the API

### Using the Example Script
```bash
python api_examples.py
```

This script provides:
1. Full API demo with all operations
2. Authentication flow testing
3. Interactive mode for custom testing

### Using curl

#### Register a new user:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123!",
    "full_name": "Test User",
    "national_id": "1234567890"
  }'
```

#### Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123!"
  }'
```

#### Create an account (replace TOKEN with your access token):
```bash
curl -X POST http://localhost:5000/api/banking/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "account_type": "checking",
    "currency": "USD"
  }'
```

## 🗂️ Project Structure

```
banking-api/
├── app.py                 # Main Flask application
├── config.py              # Configuration settings
├── models.py              # Database models
├── auth.py                # JWT authentication logic
├── banking_api.py         # Banking API endpoints
├── api_examples.py        # API usage examples
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables
├── README.md             # Documentation
└── banking.db            # SQLite database (created automatically)
```

## 🔧 Configuration

### Environment Variables (.env)
```env
SECRET_KEY=your-super-secret-key-change-in-production
JWT_SECRET_KEY=jwt-secret-string-change-in-production
DATABASE_URL=sqlite:///banking.db
JWT_ACCESS_TOKEN_EXPIRES=3600
```

### Database
The application uses SQLite by default for development. For production, update the `DATABASE_URL` to use PostgreSQL or MySQL.

## 🛡️ Security Considerations

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

### JWT Tokens
- Access tokens expire in 1 hour (configurable)
- Refresh tokens expire in 30 days (configurable)
- Tokens are blacklisted on logout

### Data Validation
- Email format validation
- National ID format validation
- Amount validation for transactions
- Account ownership verification

## 🚀 Production Deployment

### Security Enhancements
1. Use strong, random secret keys
2. Enable HTTPS/SSL
3. Use a production database (PostgreSQL/MySQL)
4. Implement rate limiting
5. Add request logging
6. Use Redis for token blacklisting
7. Implement 2FA for sensitive operations

### Environment Setup
```bash
# Production environment variables
export FLASK_ENV=production
export SECRET_KEY="your-production-secret-key"
export JWT_SECRET_KEY="your-production-jwt-key"
export DATABASE_URL="postgresql://user:pass@localhost/bankingdb"
```

## 📊 API Response Format

All API responses follow this structure:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "error_code"
}
```

## 🤝 Default Test Account

For testing purposes, an admin account is created automatically:
- **Username:** admin
- **Password:** Admin123!
- **Email:** admin@bank.com

## 📝 API Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## 🔗 Useful Endpoints

- **Health Check:** `GET /api/health`
- **API Documentation:** `GET /api/docs`
- **Interactive API docs:** Visit the `/api/docs` endpoint in your browser

## 🐛 Troubleshooting

### Common Issues

1. **Database not found:** The database is created automatically. Ensure write permissions in the project directory.

2. **JWT token expired:** Use the refresh token endpoint to get a new access token.

3. **Account not found:** Ensure you're using the correct account number and that the account belongs to the authenticated user.

4. **Insufficient balance:** Check account balance before attempting withdrawals or transfers.

## 📞 Support

For issues or questions:
1. Check the API documentation at `/api/docs`
2. Review the example usage in `api_examples.py`
3. Check the console output for detailed error messages

---

**⚠️ Important:** This is a demonstration banking API. For production use, additional security measures, compliance checks, and regulatory requirements must be implemented.
