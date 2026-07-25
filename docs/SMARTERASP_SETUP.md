# SmarterASP.NET PostgreSQL setup

FWIS uses **PostgreSQL on SmarterASP.NET** for all application data and **built-in app authentication** (passwords stored hashed in `app_users`).

For a **cost and platform comparison** (SmarterASP vs Vercel + Neon), see [HOSTING_COMPARISON.md](./HOSTING_COMPARISON.md).

## 1. Create PostgreSQL database

In the SmarterASP control panel:

1. Open **Databases → PostgreSQL**
2. Note **host**, **port**, **database name**, **username**, and **password**
3. Enable **SSL** if offered

## 2. Configure `.env.local`

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6432/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:6432/DATABASE?sslmode=require"
AUTH_SESSION_SECRET="<openssl rand -base64 32>"
SEED_SUPER_ADMIN_USER_ID="majlis"
SEED_SUPER_ADMIN_PASSWORD="<strong password>"
PII_ENCRYPTION_KEY="<openssl rand -base64 32>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

URL-encode special characters in the password (`@` → `%40`).

## 3. Initialize database

```bash
npm run setup
```

This runs migrations, seeds **lookup tables + roles + super admin only**, and does **not** create schools, calendars, students, or teachers.

## 4. Import school data

```bash
npm run import:school -- --file path/to/workbook.xlsx
```

## 5. Stage and production

Use **separate** PostgreSQL databases (or separate accounts) for stage and prod:

| File | Purpose |
|------|---------|
| `.env.stage` | `npm run build:hosting:stage` |
| `.env.prod` | `npm run build:hosting:prod` |

Each file needs its own `DATABASE_URL`, `DIRECT_URL`, `AUTH_SESSION_SECRET`, and `PII_ENCRYPTION_KEY`.

## 6. Deploy migrations to hosted DB

From your dev machine (with production `DIRECT_URL` in env):

```bash
npx dotenv -e .env.prod -- prisma migrate deploy
npx dotenv -e .env.prod -- npm run db:seed
```

Set `SEED_SUPER_ADMIN_PASSWORD` in that env file for the first seed (suggested default: `FwisMajlis786!`). School default users (principal/admin/teacher/sub) are created when adding a school with **Create default app users** — each role has its own password.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| SSL errors | Try `?sslmode=require` on the URL; leave `DATABASE_SSL_REJECT_UNAUTHORIZED` unset unless you need strict certs |
| Connection refused | Confirm host/port from panel; SmarterASP often uses port **6432** |
| Connection timeout | Use port **6432**, not **5432** (5432 usually hangs until timeout). Confirm `.env.local` is loaded — bare `.env` may still point at localhost Prisma. |
| Login fails after seed | Confirm `SEED_SUPER_ADMIN_PASSWORD` matches what you type on `/login` |
| Empty schools | Expected after seed — run `import:school` |
