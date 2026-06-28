# FWIS Supabase Setup Guide

Follow these steps in the Supabase dashboard (should open in your browser).

## Step 1 — Create account / sign in

Go to: https://supabase.com/dashboard

Sign in with GitHub or email.

## Step 2 — Create a new project

1. Click **New project**
2. Fill in:
   - **Name:** `fwis`
   - **Database password:** choose a strong password and **save it**
   - **Region:** pick closest to you (e.g. `East US`)
3. Click **Create new project** (takes ~2 minutes)

## Step 3 — Copy connection strings

In your project go to: **Project Settings → Database**

Copy these values:

| Setting | Where to find it |
|---------|------------------|
| **Project URL** | Settings → API → Project URL |
| **anon public key** | Settings → API → anon public |
| **service_role key** | Settings → API → service_role (secret) |
| **DATABASE_URL (pooler)** | Settings → Database → Connection string → URI → **Transaction pooler** (port 6543) |
| **DIRECT_URL** | Settings → Database → Connection string → URI → **Direct connection** (port 5432) |

Replace `[YOUR-PASSWORD]` in connection strings with your database password.

## Step 4 — Paste into `.env.local`

Open `C:\Users\Home\Projects\fwis\.env.local` and fill in:

```env
DATABASE_URL="postgresql://postgres.xxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Step 5 — Run setup (in Cursor Agent or terminal)

```powershell
cd C:\Users\Home\Projects\fwis
npm run setup
npm run dev
```

## Step 6 — Login (local dev only)

- URL: http://localhost:3000/login
- Demo credentials are in `scripts/demo-users.ts` — **never use these in production**
- Do **not** run `npm run setup` or `npm run db:seed` against production

---

After you finish Step 4, tell the agent: **"Supabase keys are in .env.local — run setup"**
