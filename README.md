# Faizan Weekend Islamic School Management System (FWIS)

Multi-tenant school management for Faizan Weekend Islamic Schools under Faizan Dawat-e-Islami.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js Server Actions & API Routes
- **Database:** PostgreSQL (SmarterASP.NET)
- **Auth:** App-managed sessions (`app_users` + signed cookie; passwords hashed with scrypt)
- **ORM:** Prisma
- **Hosting:** SmarterASP.NET (Node.js + PostgreSQL)

## Prerequisites

- Node.js 20+ (LTS recommended)
- PostgreSQL database (SmarterASP.NET or local)
- npm

## Features

- Multi-tenant architecture with role-based access control
- Global student records with per-year enrollments
- Global academic years linked to schools via `academic_year_schools`
- Sunday academic calendar with bulk generation and session types
- Mobile-first attendance with behavior tracking
- Weighted grade calculation (attendance, behavior, quizzes, midterm, final)
- Excel import/export for historical school data
- Student PII encryption at rest (AES-256-GCM)
- Audit logging and soft deletes
- Dark/light mode, responsive sidebar

## Users, roles & permissions

FWIS uses four roles. Each login is an **App User** (`app_users`) with one or more roles and access to one or more schools.

| Role | Scope | Typical use |
|------|--------|-------------|
| **Super Admin** | All schools, all modules | FWIS central staff |
| **School Admin** | Assigned school(s); optional Boys/Girls or single-grade scope | Principal, section heads, grade leads |
| **Teacher** | Assigned classroom only | Sunday attendance & assessments |
| **Read Only** | View assigned school(s); no writes | Auditors, observers |

### Permission highlights

| Area | Super Admin | School Admin | Teacher | Read Only |
|------|:-----------:|:------------:|:-------:|:---------:|
| Schools (create/delete) | Yes | No | — | View |
| Academic years & calendar | Yes | Yes (their schools) | — | View |
| Students & enrollments | Yes | Yes | — | View |
| Attendance & assessments | Yes | Yes | Own grade | View |
| Users management | Yes | Yes (their schools) | — | — |
| Data backup / import template | Yes | Yes | — | — |
| Grading scale (system-wide) | Yes | View | — | — |

Navigation and server actions enforce permissions via `src/lib/auth/permissions.ts`. School Admins with a **gender** and linked **classroom** are scoped to Boys or Girls sections, or a single grade.

### Default logins

After `npm run setup`, sign in with:

| Role | User ID | Password |
|------|---------|----------|
| Super Admin (majlis) | `majlis` | `SEED_SUPER_ADMIN_PASSWORD` (suggested: `FwisMajlis786!`) |

When you **create a school** with “Create default app users”, FWIS creates **17** logins from the 3-letter school code (e.g. `HOU` → `hou`):

| Pattern | Role | Default password |
|---------|------|------------------|
| `{code}.principal` | Principal | `FwisPrincipal786!` |
| `{code}.m.admin` / `{code}.f.admin` | School Admin | `FwisAdmin786!` |
| `{code}.b.g1`–`g6` / `{code}.g.g1`–`g6` | Teacher | `FwisTeacher786!` |
| `{code}.m.sub` / `{code}.f.sub` | Substitute | `FwisSub786!` |

Example Houston: `hou.principal`, `hou.b.g1`, `hou.f.admin`. Import **links** Staff rows to these existing logins — it does not create passwords. See [docs/DATA_IMPORT.md](docs/DATA_IMPORT.md) and [docs/LEADERSHIP_DEMO.md](docs/LEADERSHIP_DEMO.md).

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in credentials (see [docs/SMARTERASP_SETUP.md](docs/SMARTERASP_SETUP.md)):

| Variable | Description |
| -------- | ----------- |
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | Same URL for Prisma CLI migrations |
| `AUTH_SESSION_SECRET` | Random 32+ char secret for session cookies |
| `SEED_SUPER_ADMIN_USER_ID` | Initial super admin login id (default `majlis`) |
| `SEED_SUPER_ADMIN_PASSWORD` | Initial super admin password (seed only) |
| `PII_ENCRYPTION_KEY` | 32-byte base64 key for student PII |
| `NEXT_PUBLIC_APP_URL` | Public site URL (required for hosting builds) |

Optional role password overrides: `DEFAULT_PRINCIPAL_PASSWORD`, `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_TEACHER_PASSWORD` (or legacy `IMPORT_TEACHER_DEFAULT_PASSWORD`), `DEFAULT_SUBSTITUTE_PASSWORD`.

### 3. Database

```bash
npm run db:deploy    # apply pending migrations (production/CI)
npm run db:migrate   # create + apply migrations in dev
npm run db:seed      # lookups, roles, majlis, 5 schools, 2026-2027 calendar, default logins
```

**PII encryption:** Set `PII_ENCRYPTION_KEY` (see [docs/pii-security.md](docs/pii-security.md)), then run `npm run db:encrypt-pii` if legacy plaintext student fields exist.

**Backups:** SmarterASP PostgreSQL backups — see [docs/backup-recovery.md](docs/backup-recovery.md).

**Troubleshooting migrations:** If Prisma reports a modified migration checksum, run `npm run db:fix-checksums` before retrying.

### 4. Initial data

```bash
npm run setup          # migrate + seed (lookups + super admin)
# Create school in app with “Create default app users” checked
npm run import:template   # generate Excel template
npm run import:school -- --file path/to/workbook.xlsx --dry-run
npm run import:school -- --file path/to/workbook.xlsx
```

The import links Staff/Students to an **existing** school, academic year, and app user logins.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Import & backup

| Command | Purpose |
|---------|---------|
| `npm run import:template` | Generate blank Excel template |
| `npm run import:school -- --file …` | Import school year from Excel |
| Backup page in app | Export school year workbook; download import template |

See [docs/DATA_IMPORT.md](docs/DATA_IMPORT.md) for the Google Sheets workflow and column reference.

## Project structure

```
src/
├── app/
│   ├── (app)/          # Authenticated routes (sidebar shell)
│   ├── login/          # Sign-in
│   └── page.tsx        # Public landing
├── actions/            # Server Actions
├── components/
│   ├── layout/         # Sidebar, school/year switchers
│   └── ui/
└── lib/
    ├── auth/           # Session, permissions, RBAC, section scope
    ├── crypto/         # PII encryption (AES-256-GCM)
    ├── students/       # PII encrypt/decrypt helpers
    ├── calendar/       # Sunday generation, session types
    ├── grades/         # Final grade calculation
    └── import/         # Excel template spec & builder
prisma/
├── schema.prisma
├── seed.ts             # Lookups + super admin only
└── migrations/
scripts/
├── import-school-data.ts
├── setup.ts
└── build-hosting-package.ts
docs/
├── SMARTERASP_SETUP.md
├── DATA_IMPORT.md
├── LEADERSHIP_DEMO.md
└── pii-security.md
```

## Role landing pages

| Role | Default route |
| ---- | ------------- |
| Super Admin | `/dashboard/super-admin` |
| School Admin | `/dashboard/school-admin` |
| Teacher | `/dashboard/teacher` |
| Read Only | `/dashboard/read-only` |

## Deploy to SmarterASP.NET

1. Configure `.env.stage` / `.env.prod` (separate DB and secrets per environment)
2. Run migrations against hosted DB: `npx dotenv -e .env.prod -- prisma migrate deploy`
3. Seed once: `npx dotenv -e .env.prod -- npm run db:seed`
4. Build hosting package: `npm run build:hosting:prod`
5. Upload output to SmarterASP Node.js site

See [docs/SMARTERASP_SETUP.md](docs/SMARTERASP_SETUP.md) and `scripts/build-hosting-package.ts`.

## Grade weights

| Component | Weight |
| --------- | ------ |
| Attendance | 10% |
| Behavior | 10% |
| Quiz 1–5 | 5% each (25% total) |
| Midterm Project | 10% |
| Final Exam | 45% |

Pass threshold: **70%**.

Letter grades: **A** ≥90, **B** ≥80, **C** ≥70, **D** &lt;70 (no F). Pass/Fail uses the same 70% threshold (D = Fail).

## Documentation

| Document | Contents |
| -------- | -------- |
| [docs/SMARTERASP_SETUP.md](docs/SMARTERASP_SETUP.md) | Database, env, deploy |
| [docs/HOSTING_COMPARISON.md](docs/HOSTING_COMPARISON.md) | SmarterASP vs Vercel cost comparison |
| [docs/DATA_IMPORT.md](docs/DATA_IMPORT.md) | Excel import workflow |
| [docs/LEADERSHIP_DEMO.md](docs/LEADERSHIP_DEMO.md) | Leadership deck & demo accounts |
| [docs/pii-security.md](docs/pii-security.md) | Student PII encryption |
| [docs/backup-recovery.md](docs/backup-recovery.md) | Backups & recovery |

## License

Private — Faizan Dawat-e-Islami
