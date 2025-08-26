# Banking API with JWT Authentication

This is a minimal demonstration of a banking API secured with JSON Web Tokens (JWT) built with Node.js and Express.

## Prerequisites

* Node.js >= 18
* npm >= 9

## Setup

```bash
# Clone / copy the repository, then:
cd /workspace
npm install
cp .env.example .env # and set JWT_SECRET to a strong value
```

## Running the Server

```bash
npm start  # or npm run dev for hot-reloading with nodemon
```

The server will start on the port specified in `.env` (default 3000).

## API Endpoints

### Authentication

* `POST /api/auth/register` – Register a new user.
  * Body: `{ "username": "alice", "password": "password123" }`
* `POST /api/auth/login` – Obtain a JWT.
  * Body: `{ "username": "alice", "password": "password123" }`
  * Response: `{ "token": "<JWT>" }`

### Banking (Protected – require `Authorization: Bearer <JWT>` header)

* `GET /api/bank/balance` – Get current balance.
* `POST /api/bank/transfer` – Transfer funds.
  * Body: `{ "toUsername": "bob", "amount": 50 }`

## Notes

* **Demo purposes only** – Data is stored in memory and will reset when the server restarts.
* Hashing is performed with `bcrypt`; never store passwords in plain text.
* Make sure to set a strong `JWT_SECRET` in production.
