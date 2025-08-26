# 🚀 Quick Start Guide - Banking API

## ⚡ Fast Setup (3 steps)

```bash
# 1. Run setup script
./setup.sh

# 2. Start the server
python3 app.py
# OR
python3 run.py

# 3. Test the API
python3 api_examples.py
```

## 🔗 Essential URLs

- **API Server:** http://localhost:5000
- **Documentation:** http://localhost:5000/api/docs
- **Health Check:** http://localhost:5000/api/health

## 🔐 Default Test Account

- **Username:** `admin`
- **Password:** `Admin123!`
- **Email:** `admin@bank.com`

## 📱 Quick API Test

### 1. Register a new user:
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

### 2. Login and get token:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123!"
  }'
```

### 3. Create a bank account:
```bash
curl -X POST http://localhost:5000/api/banking/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "account_type": "checking",
    "currency": "USD"
  }'
```

### 4. Deposit money:
```bash
curl -X POST http://localhost:5000/api/banking/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "account_number": "YOUR_ACCOUNT_NUMBER",
    "amount": 1000,
    "description": "Initial deposit"
  }'
```

## 🛠️ Troubleshooting

### Dependencies Issue?
```bash
# Option 1: Use setup script
./setup.sh

# Option 2: Manual virtual environment
python3 -m venv banking_env
source banking_env/bin/activate
pip install -r requirements.txt

# Option 3: Direct install (not recommended)
pip install --break-system-packages -r requirements.txt
```

### Server Won't Start?
1. Check Python version: `python3 --version` (needs 3.8+)
2. Install missing packages: `./setup.sh`
3. Check port availability: `lsof -i :5000`

### API Not Working?
1. Server running? Check: http://localhost:5000/api/health
2. Valid token? Tokens expire in 1 hour
3. Check request format: Content-Type must be `application/json`

## 📚 Full Documentation

See `README.md` for complete documentation including:
- Detailed API reference
- Security features
- Production deployment
- Advanced configuration

## 🎯 Common Use Cases

### Banking Operations
1. **User Registration** → **Account Creation** → **Deposit Money** → **Check Balance**
2. **Transfer Money** between accounts
3. **View Transaction History**
4. **Withdraw Money**

### Authentication Flow
1. **Register/Login** → Get access token
2. **Use token** in Authorization header
3. **Refresh token** when expired
4. **Logout** to blacklist token

---

**Need help?** Check the full `README.md` or run `python3 api_examples.py` for interactive examples!