# Banking API با JWT

این پروژه یک API ساده بانکی با FastAPI و JWT (توکن دسترسی و رفرش) است.

## اجرا

1) نصب پیش‌نیازها:

```bash
pip install -r requirements.txt
```

2) اجرای سرور:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## اندپوینت‌ها

- ثبت‌نام: `POST /auth/register`
- ورود: `POST /auth/login`
- رفرش توکن: `POST /auth/refresh`
- اطلاعات کاربر: `GET /auth/whoami`
- لیست حساب‌ها: `GET /bank/accounts`
- موجودی حساب: `GET /bank/balance/{account_id}`
- انتقال وجه: `POST /bank/transfer`

## نمونه درخواست‌ها

- ثبت‌نام:

```bash
curl -X POST http://localhost:8000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"ali","password":"Secret123","initial_deposit":1000.00}'
```

- ورود و دریافت توکن‌ها:

```bash
curl -X POST http://localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"ali","password":"Secret123"}'
```

- فراخوانی اندپوینت‌های بانکی با توکن دسترسی:

```bash
ACCESS=eyJ... # مقدار access_token
curl -H "Authorization: Bearer $ACCESS" http://localhost:8000/bank/accounts
```

- رفرش توکن:

```bash
curl -X POST http://localhost:8000/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refresh_token":"REFRESH_TOKEN_HERE"}'
```

## داکر

بدون نصب محلی پایتون می‌توانید با داکر اجرا کنید:

```bash
# ساخت ایمیج
docker build -t banking-api .

# اجرا
docker run --rm -p 8000:8000 -e JWT_SECRET_KEY="StrongSecret" banking-api
```

پس از اجرا: `http://localhost:8000/docs`
