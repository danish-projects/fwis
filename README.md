# Faizan Weekend Islamic School Management System (FWIS)

Multi-tenant school management for Faizan Weekend Islamic Schools under Faizan Dawat-e-Islami.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui-style components
- **Backend:** Next.js Server Actions & API Routes
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth
- **ORM:** Prisma
- **Hosting:** Vercel

## Features

- Multi-tenant architecture with role-based access (Super Admin, School Admin, Teacher, Read Only)
- Global student records with per-year enrollments
- Sunday academic calendar with bulk generation
- Mobile-first attendance entry with behavior tracking
- Weighted grade calculation (attendance, behavior, quizzes, midterm, final)
- Audit logging and soft deletes
- Dark/light mode, responsive sidebar, toast notifications
- CSV & Excel export utilities

## Prerequisites

- Node.js 20+ (LTS recommended)
- Supabase project with PostgreSQL
- npm or pnpm

## Setup

### 1. Clone and install

```bash
cd C:\Users\Home\Projects\fwis
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:


| Variable                        | Description                                 |
| ------------------------------- | ------------------------------------------- |
| `DATABASE_URL`                  | Supabase pooler connection string           |
| `DIRECT_URL`                    | Supabase direct connection (for migrations) |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key                           |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key (server only)              |


### 3. Database

Use the npm scripts (recommended) or plain Prisma CLI — both load `**.env.local**` via `prisma.config.ts`. You need `**DATABASE_URL**` and `**DIRECT_URL**` (see `.env.example`).

```bash
npm run db:deploy    # apply pending migrations (production/CI)
npm run db:migrate   # create + apply migrations in dev
npm run db:seed
```

Equivalent without npm scripts:

```bash
npx prisma migrate deploy
```

**Troubleshooting:** If migrate says a migration was *modified after it was applied* and asks to reset, run `npm run db:fix-checksums` first (syncs checksums without deleting data), then `npm run db:migrate` again. Only use `npx dotenv -e .env.local -- prisma migrate reset` if you are okay losing all database data.

After pulling security updates, also run in Supabase SQL Editor: `supabase/migrations/002_app_user_self_read.sql` (enables middleware inactive-user check).

**PII encryption:** Set `PII_ENCRYPTION_KEY` (see `docs/pii-security.md`), run `npm run db:deploy`, then `npm run db:encrypt-pii` to encrypt existing student records.

**Backups:** Enable Supabase automated backups and test a restore once — see `docs/backup-recovery.md`.

If you see `Environment variable not found: DIRECT_URL`, add `DIRECT_URL` to `.env.local` (Supabase **direct** connection, port 5432 — not the pooler).

### 4. Auth users (all roles)

Run the full setup (migrations, seed, and Supabase Auth users):

```bash
npm run setup
```

Or create users manually in Supabase Auth — user UUIDs must match the seed.


| Role                                 | Email                          | Password          | Landing page              |
| ------------------------------------ | ------------------------------ | ----------------- | ------------------------- |
| Super Admin                          | `superadmin@fwis.org`          | `FwisAdmin786!`   | `/dashboard/super-admin`  |
| School Admin (Houston, all sections) | `admin.houston@fwis.org`       | `FwisAdmin786!`   | `/dashboard/school-admin` |
| Boys Admin (Houston)                 | `admin.m.houston@fwis.org`     | `FwisAdmin786!`   | `/dashboard/school-admin` |
| Girls Admin (Houston)                | `admin.f.houston@fwis.org`     | `FwisAdmin786!`   | `/dashboard/school-admin` |
| Teacher (Houston, Grade 1 Boys)      | `grade1.boys.houston@fwis.org` | `FwisTeacher786!` | `/dashboard/teacher`      |


Each school also has `admin.m.{city}@fwis.org` (Boys) and `admin.f.{city}@fwis.org` (Girls), e.g. `admin.m.chicago@fwis.org`. City slugs: `houston`, `chicago`, `newyork`, `dallas`, `atlanta`.

Super Admin UUID: `00000000-0000-4000-8000-000000000001`

### 5. RLS policies (optional, recommended)

Run `supabase/migrations/001_rls_policies.sql` in the Supabase SQL Editor.

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 7. Import historical school data (Excel)

Generate the multi-school import template and share it with each campus:

```bash
npm run import:template
```

See [docs/DATA_IMPORT.md](docs/DATA_IMPORT.md) for sheet/column details, import commands, and **Google Sheets** workflow (no Microsoft Office required).

## Project Structure

```
src/
├── app/
│   ├── (app)/          # Authenticated app routes with sidebar
│   ├── auth/           # Supabase auth callback
│   ├── login/          # Login page
│   └── page.tsx        # Public landing page
├── actions/            # Server Actions (schools, attendance, ...)
├── components/
│   ├── layout/         # Sidebar, app shell
│   ├── ui/             # shadcn-style components
│   └── modules/        # Shared module components
└── lib/
    ├── auth/           # Session, permissions, RBAC
    ├── security/       # HTTPS headers, secure cookies
    ├── supabase/       # Supabase clients
    ├── grades/         # Final grade calculation
    ├── behavior/       # Behavior score logic
    ├── calendar/       # Sunday generation
    ├── export/         # CSV, Excel export
    └── audit/          # Audit logging
prisma/
├── schema.prisma       # Full database schema
└── seed.ts             # Sample data
supabase/
└── migrations/         # RLS policies
```

## Role Landing Pages


| Role         | Default Route             |
| ------------ | ------------------------- |
| Super Admin  | `/dashboard/super-admin`  |
| School Admin | `/dashboard/school-admin` |
| Teacher      | `/dashboard/teacher`      |
| Read Only    | `/dashboard/read-only`    |


## Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables from `.env.example`
4. Set `**NEXT_PUBLIC_APP_URL**` to your production URL with `**https://**` (e.g. `https://fwis.yourdomain.com`)
5. Add build command: `prisma generate && next build`
6. Run `npx prisma migrate deploy` against production DB

**HTTPS (automatic on Vercel):** Production builds enforce HTTPS via middleware (HTTP → HTTPS redirect), **HSTS** headers, and **Secure** session cookies. Local dev stays on `http://localhost:3000`.

## Grade Weights


| Component       | Weight  |
| --------------- | ------- |
| Attendance      | 10%     |
| Behavior        | 10%     |
| Quiz 1–5        | 5% each |
| Midterm Project | 15%     |
| Final Exam      | 40%     |


## License

Private — Faizan Dawat-e-Islami