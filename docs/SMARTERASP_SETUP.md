# SmarterASP.NET PostgreSQL setup

FWIS uses **PostgreSQL on SmarterASP.NET** for all application data and **built-in app authentication** (passwords stored hashed in `app_users`).

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
SCHOOL_TIMEZONE="America/Chicago"
TZ="America/Chicago"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

`SCHOOL_TIMEZONE` / `TZ` should be `America/Chicago` (Central). SmarterASP Node hosts are often Pacific; without this, audit timestamps and “today” follow the host zone.

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

## 7. Lesson plans on SmarterASP (Google Drive)

The Lesson Plans page needs these **runtime** env vars on the host (they are **not** in git):

| Variable | Notes |
|----------|--------|
| `GOOGLE_DRIVE_FWIS_DOCS_FOLDER_ID` | Parent “FWIS Docs” folder ID |
| `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY` | Preferred on SmarterASP (avoids broken multiline JSON) |
| or `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` | Full JSON — works best in a `.env` file next to `server.js` |

**Git Auto Build:** add the vars in the SmarterASP site **Environment Variables** panel, then restart the app. Copy values from your local `.env.stage` / `.env.prod`.

**File upload deploy:** ensure the packaged `.env` (from `npm run build:hosting:stage`) is uploaded next to `server.js`, or set the same vars in the panel.

Drive layout: `FWIS Docs/{academic year name}/Lesson Plans/{Grade name}/…`. Share the folder with the service account email (Viewer).

## 8. Logging (not CloudWatch)

SmarterASP does **not** provide AWS CloudWatch-style log monitoring, alerts, or a hosted log console.

What you get instead:

1. **IIS stdout file** — `web.config` sets `stdoutLogEnabled="true"` and `stdoutLogFile=".\logs\node-stdout.log"`. Download via FTP/File Manager, or open **Server Logs** in the app (NIGRA / Super Admin only).
2. **App audit trail** — business actions on the Super Admin dashboard (who changed what), not stack traces.
3. **Structured `console` JSON** — errors/warnings from the app logger land in that same stdout file.

There is no built-in search/alerts/metrics dashboard on SmarterASP. For CloudWatch-like SaaS (Sentry, Better Stack, etc.), you would add a third-party service separately.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| SSL errors | Try `?sslmode=require` on the URL; leave `DATABASE_SSL_REJECT_UNAUTHORIZED` unset unless you need strict certs |
| Connection refused | Confirm host/port from panel; SmarterASP often uses port **6432** |
| Connection timeout | Use port **6432**, not **5432** (5432 usually hangs until timeout). Confirm `.env.local` is loaded — bare `.env` may still point at localhost Prisma. |
| Login fails after seed | Confirm `SEED_SUPER_ADMIN_PASSWORD` matches what you type on `/login` |
| Empty schools | Expected after seed — run `import:school` |
| Lesson Plans: “Google Drive not configured” | Host is missing `GOOGLE_DRIVE_FWIS_DOCS_FOLDER_ID` and/or service account credentials — set them in the panel (see §7) and restart |
| No `logs/node-stdout.log` | Create/upload `logs/` folder, confirm `stdoutLogEnabled="true"` in `web.config`, restart Node, hit the site, then refresh FTP or **Server Logs** |
| Need CloudWatch-style monitoring | Not offered by SmarterASP — use FTP/`logs/` or in-app **Server Logs**, or a third-party APM |

## 9. Consolidate SQL view

After `prisma migrate deploy`, query consolidated roster × calendar day data:

```sql
SELECT *
FROM v_consolidate_attendance_day
WHERE school_code = 'HOU'
  AND academic_year_name = '2026-2027'
  AND grade_name = 'Grade 1'
ORDER BY calendar_date, student_last_name, student_first_name;
```

Columns include school, academic year, staff, grade/section/classroom, calendar date, session type, student, attendance code, behavior code, and assessment scores (`assessment_quiz_1` … `assessment_final_exam`) when present.
