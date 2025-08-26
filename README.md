# Banking API (FastAPI + JWT)

Minimal banking API with JWT auth (access + refresh), user registration/login, account balance, transfers, and transactions.

## Quickstart (no root, no venv)

Prereqs: python3 available (pip bundled or user-installable)

1) Environment (optional)
- Copy `.env.example` to `.env` and adjust secrets for production.

2) Install dependencies (user scope)
```bash
cd /workspace
python3 -m pip install --user -r requirements.txt
```

3) Run the API
```bash
cd /workspace
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open the docs: http://localhost:8000/docs

## Endpoints
- Auth
  - POST /auth/register
  - POST /auth/login (OAuth2PasswordRequestForm: username=email, password)
  - POST /auth/refresh
  - POST /auth/logout
- Accounts (Bearer token required)
  - GET /accounts/me/balance
  - POST /accounts/transfer
  - GET /accounts/transactions

## Notes
- SQLite database at `/workspace/banking.db` by default.
- Access/Refresh token secrets read from `.env`.
- Adjust JWT expiry and algorithm in `.env`.
