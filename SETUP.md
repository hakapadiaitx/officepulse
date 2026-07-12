# OfficePulse Setup Guide

## Prerequisites
- Node.js 20+
- PostgreSQL database
- Stripe account (for subscriptions)

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment

```bash
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env` and fill in:
- `DATABASE_URL` — your PostgreSQL connection string
- `NEXTAUTH_SECRET` — run `openssl rand -base64 32` to generate
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev
- Stripe keys — from your Stripe dashboard

## 3. Set up the database

```bash
cd apps/web
npx prisma migrate dev --name init
npm run db:seed
```

## 4. Create Stripe products (optional for local dev)

In Stripe dashboard, create 3 products (Starter, Professional, Enterprise) each with monthly and yearly prices. Copy the price IDs into `.env`.

To test subscriptions locally:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## 5. Start development

```bash
# From repo root — starts web app on :3000
npm run dev

# For mobile — from apps/mobile
cd apps/mobile
npx expo start
```

## Demo credentials (after seeding)

| Field | Value |
|---|---|
| Company ID | `demo-company` |
| Email | `admin@demo.com` |
| Password | `password123` |

## Employee PINs (demo)

| Employee | PIN |
|---|---|
| Alice Johnson | `1234` |
| Bob Smith | `2345` |
| Carol Davis | `3456` |
| David Wilson | `4567` |
| Eve Martinez | `5678` |

## Architecture

```
apps/
  web/          Next.js 15 + Prisma + PostgreSQL
                - /login, /register, /pricing (public)
                - /dashboard, /attendance, /employees, /reports (protected)
                - /api/* (REST API, supports both session + JWT Bearer)
  mobile/       Expo React Native (iOS + Android)
                - Login with company ID + email + password
                - Employee status board
                - Check out / check in with PIN

packages/       (future: shared types)
```

## Mobile app API URL

Change `extra.apiUrl` in `apps/mobile/app.json` to point to your deployed web app URL for production.
