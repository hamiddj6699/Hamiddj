#!/usr/bin/env python3
"""
Banking API Usage Examples
This script demonstrates how to use the banking API with JWT authentication.
"""

import requests
import json
import time

# API Base URL
BASE_URL = "http://localhost:5000/api"

class BankingAPIClient:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.access_token = None
        self.refresh_token = None
        self.session = requests.Session()

    def _make_request(self, method, endpoint, data=None, auth_required=True):
        """Make HTTP request with proper authentication"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, headers=headers, json=data)
            elif method.upper() == 'PUT':
                response = self.session.put(url, headers=headers, json=data)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            return response.json(), response.status_code
        except requests.exceptions.RequestException as e:
            return {'error': str(e)}, 500

    def register(self, user_data):
        """Register a new user"""
        print("🔐 Registering new user...")
        result, status = self._make_request('POST', '/auth/register', user_data, auth_required=False)
        
        if status == 201:
            self.access_token = result['data']['access_token']
            self.refresh_token = result['data']['refresh_token']
            print(f"✅ Registration successful! User ID: {result['data']['user']['id']}")
        else:
            print(f"❌ Registration failed: {result.get('message', 'Unknown error')}")
        
        return result, status

    def login(self, credentials):
        """Login user"""
        print("🔑 Logging in...")
        result, status = self._make_request('POST', '/auth/login', credentials, auth_required=False)
        
        if status == 200:
            self.access_token = result['data']['access_token']
            self.refresh_token = result['data']['refresh_token']
            print(f"✅ Login successful! Welcome {result['data']['user']['full_name']}")
        else:
            print(f"❌ Login failed: {result.get('message', 'Unknown error')}")
        
        return result, status

    def get_profile(self):
        """Get user profile"""
        print("👤 Getting user profile...")
        result, status = self._make_request('GET', '/auth/profile')
        
        if status == 200:
            print(f"✅ Profile retrieved: {result['data']['full_name']}")
        else:
            print(f"❌ Failed to get profile: {result.get('message', 'Unknown error')}")
        
        return result, status

    def create_account(self, account_data):
        """Create a new bank account"""
        print("🏦 Creating new account...")
        result, status = self._make_request('POST', '/banking/accounts', account_data)
        
        if status == 201:
            print(f"✅ Account created! Account Number: {result['data']['account_number']}")
        else:
            print(f"❌ Account creation failed: {result.get('message', 'Unknown error')}")
        
        return result, status

    def get_accounts(self):
        """Get user's accounts"""
        print("📋 Getting user accounts...")
        result, status = self._make_request('GET', '/banking/accounts')
        
        if status == 200:
            print(f"✅ Found {len(result['data'])} account(s)")
            for account in result['data']:
                print(f"   Account: {account['account_number']} ({account['account_type']}) - Balance: {account['balance']} {account['currency']}")
        else:
            print(f"❌ Failed to get accounts: {result.get('message', 'Unknown error')}")
        
        return result, status

    def get_balance(self, account_number):
        """Get account balance"""
        print(f"💰 Getting balance for account {account_number}...")
        result, status = self._make_request('GET', f'/banking/accounts/{account_number}/balance')
        
        if status == 200:
            print(f"✅ Balance: {result['data']['balance']} {result['data']['currency']}")
        else:
            print(f"❌ Failed to get balance: {result.get('message', 'Unknown error')}")
        
        return result, status

    def deposit(self, deposit_data):
        """Deposit money"""
        print(f"💵 Depositing {deposit_data['amount']} to account {deposit_data['account_number']}...")
        result, status = self._make_request('POST', '/banking/deposit', deposit_data)
        
        if status == 200:
            print(f"✅ Deposit successful! New balance: {result['data']['new_balance']}")
        else:
            print(f"❌ Deposit failed: {result.get('message', 'Unknown error')}")
        
        return result, status

    def withdraw(self, withdraw_data):
        """Withdraw money"""
        print(f"💸 Withdrawing {withdraw_data['amount']} from account {withdraw_data['account_number']}...")
        result, status = self._make_request('POST', '/banking/withdraw', withdraw_data)
        
        if status == 200:
            print(f"✅ Withdrawal successful! New balance: {result['data']['new_balance']}")
        else:
            print(f"❌ Withdrawal failed: {result.get('message', 'Unknown error')}")
        
        return result, status

    def transfer(self, transfer_data):
        """Transfer money between accounts"""
        print(f"🔄 Transferring {transfer_data['amount']} from {transfer_data['from_account_number']} to {transfer_data['to_account_number']}...")
        result, status = self._make_request('POST', '/banking/transfer', transfer_data)
        
        if status == 200:
            print(f"✅ Transfer successful!")
        else:
            print(f"❌ Transfer failed: {result.get('message', 'Unknown error')}")
        
        return result, status

    def get_transactions(self, params=None):
        """Get transaction history"""
        print("📊 Getting transaction history...")
        endpoint = '/banking/transactions'
        if params:
            query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
            endpoint += f"?{query_string}"
        
        result, status = self._make_request('GET', endpoint)
        
        if status == 200:
            print(f"✅ Found {len(result['data'])} transaction(s)")
            for txn in result['data'][:5]:  # Show first 5 transactions
                print(f"   {txn['transaction_type']}: {txn['amount']} {txn['currency']} - {txn['status']}")
        else:
            print(f"❌ Failed to get transactions: {result.get('message', 'Unknown error')}")
        
        return result, status

def demo_banking_api():
    """Comprehensive demo of the banking API"""
    client = BankingAPIClient()
    
    print("🏦 Banking API Demo Starting...")
    print("=" * 50)
    
    # 1. Check API health
    print("\n1. Health Check")
    result, _ = client._make_request('GET', '/health', auth_required=False)
    print(f"✅ API Status: {result.get('message', 'Unknown')}")
    
    # 2. Register new user
    print("\n2. User Registration")
    user_data = {
        "username": "johndoe",
        "email": "john.doe@example.com",
        "password": "SecurePass123!",
        "full_name": "John Doe",
        "phone_number": "+1234567890",
        "national_id": "9876543210"
    }
    
    register_result, _ = client.register(user_data)
    
    if not client.access_token:
        print("❌ Registration failed, trying to login with existing user...")
        # Try login if registration failed (user might already exist)
        login_result, _ = client.login({
            "username": "johndoe",
            "password": "SecurePass123!"
        })
        
        if not client.access_token:
            print("❌ Demo cannot continue without authentication")
            return
    
    # 3. Get user profile
    print("\n3. User Profile")
    client.get_profile()
    
    # 4. Create checking account
    print("\n4. Create Checking Account")
    checking_account_result, _ = client.create_account({
        "account_type": "checking",
        "currency": "USD"
    })
    
    # 5. Create savings account
    print("\n5. Create Savings Account")
    savings_account_result, _ = client.create_account({
        "account_type": "savings",
        "currency": "USD"
    })
    
    # 6. Get all accounts
    print("\n6. List All Accounts")
    accounts_result, _ = client.get_accounts()
    
    if accounts_result.get('success') and accounts_result['data']:
        account1 = accounts_result['data'][0]['account_number']
        account2 = accounts_result['data'][1]['account_number'] if len(accounts_result['data']) > 1 else account1
        
        # 7. Deposit money
        print("\n7. Deposit Money")
        client.deposit({
            "account_number": account1,
            "amount": 1000,
            "description": "Initial deposit"
        })
        
        # 8. Check balance
        print("\n8. Check Balance")
        client.get_balance(account1)
        
        # 9. Withdraw money
        print("\n9. Withdraw Money")
        client.withdraw({
            "account_number": account1,
            "amount": 200,
            "description": "ATM withdrawal"
        })
        
        # 10. Transfer money (if we have 2 accounts)
        if len(accounts_result['data']) > 1:
            print("\n10. Transfer Money")
            client.deposit({
                "account_number": account2,
                "amount": 500,
                "description": "Initial deposit to second account"
            })
            
            client.transfer({
                "from_account_number": account1,
                "to_account_number": account2,
                "amount": 100,
                "description": "Transfer between my accounts"
            })
        
        # 11. Get transaction history
        print("\n11. Transaction History")
        client.get_transactions({"limit": 10})
        
        # 12. Get filtered transactions
        print("\n12. Filtered Transactions (Deposits only)")
        client.get_transactions({"type": "deposit", "limit": 5})
    
    print("\n" + "=" * 50)
    print("🎉 Banking API Demo Completed!")

def test_authentication_flow():
    """Test JWT authentication flow"""
    client = BankingAPIClient()
    
    print("🔐 Testing Authentication Flow...")
    print("=" * 40)
    
    # Test registration with various scenarios
    test_cases = [
        {
            "name": "Valid Registration",
            "data": {
                "username": f"testuser_{int(time.time())}",
                "email": f"test_{int(time.time())}@example.com",
                "password": "TestPass123!",
                "full_name": "Test User",
                "national_id": f"{int(time.time())}"
            }
        },
        {
            "name": "Weak Password",
            "data": {
                "username": "weakpass",
                "email": "weak@example.com",
                "password": "123",
                "full_name": "Weak Password User",
                "national_id": "1111111111"
            }
        },
        {
            "name": "Invalid Email",
            "data": {
                "username": "bademail",
                "email": "not-an-email",
                "password": "GoodPass123!",
                "full_name": "Bad Email User",
                "national_id": "2222222222"
            }
        }
    ]
    
    for test_case in test_cases:
        print(f"\nTesting: {test_case['name']}")
        result, status = client.register(test_case['data'])
        if status == 201:
            print("✅ Registration successful")
            break
        else:
            print(f"❌ Registration failed: {result.get('message', 'Unknown error')}")
    
    print("\n🔐 Authentication Flow Test Completed!")

if __name__ == "__main__":
    print("Banking API Examples")
    print("Choose an option:")
    print("1. Run full demo")
    print("2. Test authentication flow")
    print("3. Interactive mode")
    
    choice = input("\nEnter your choice (1-3): ").strip()
    
    if choice == "1":
        demo_banking_api()
    elif choice == "2":
        test_authentication_flow()
    elif choice == "3":
        print("Interactive mode - Create your own BankingAPIClient instance")
        client = BankingAPIClient()
        print("Client created. Use client.method_name() to interact with the API")
        print("Available methods: register, login, get_profile, create_account, get_accounts, etc.")
    else:
        print("Invalid choice. Running full demo...")
        demo_banking_api()