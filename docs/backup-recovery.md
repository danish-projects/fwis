# Backup & recovery

FWIS uses **Supabase PostgreSQL** as the system of record. Recovery relies on a combination of Supabase infrastructure backups and application-level soft deletes.

## Layers of protection

| Layer | What it protects | Recovery |
|-------|------------------|----------|
| **Supabase automated backups** | Full database (schema + data) | Restore to a point in time (plan-dependent) |
| **Soft deletes** (`deleted_at`) | Most admin “delete” actions in the app | Reversible in DB or via support script |
| **Audit logs** | Who changed what (not full PII) | Forensics, not full row restore |
| **`PII_ENCRYPTION_KEY`** | Ability to read encrypted student fields | Must be backed up separately — not in Supabase |

## What Supabase provides

Check your plan in **Project Settings → Billing**:

| Plan | Automated backups | Typical retention |
|------|-------------------|-------------------|
| **Free** | Limited / project-dependent | Shorter window — verify in dashboard |
| **Pro** | Daily automated backups | 7 days |
| **Pro + PITR add-on** | Point-in-time recovery | Granular restore (recommended for production PII) |

Backups are managed by Supabase (AWS). You do **not** configure cron jobs in this repo for database snapshots.

### Enable / verify (Supabase dashboard)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your **fwis** project.
2. **Project Settings → Database → Backups** (or **Infrastructure** on some plans).
3. Confirm **automated backups are enabled**.
4. For production with student PII, enable **Point in Time Recovery (PITR)** if available on your plan.

Also store separately (password manager / Vercel secrets):

- Database password
- `PII_ENCRYPTION_KEY` (see [pii-security.md](./pii-security.md))
- `SUPABASE_SERVICE_ROLE_KEY`

Without `PII_ENCRYPTION_KEY`, a restored database still has ciphertext you cannot read.

## Application behavior vs backups

### Soft delete (recoverable without full restore)

Most entities use `deleted_at` instead of hard `DELETE`:

- Students, enrollments, schools, teachers, calendar days, etc.

“Delete” in the UI usually sets `deleted_at`. Rows remain in Postgres until purged.

**To undo a soft delete:** update the row in SQL (or add an admin “restore” feature later):

```sql
UPDATE students SET deleted_at = NULL, is_active = true WHERE id = '<uuid>';
```

### Hard delete (needs backup restore)

These scripts **permanently remove** data:

| Script | Scope |
|--------|--------|
| `npm run db:purge` | One school or all schools |
| `npm run db:delete-schools` | Specific school UUIDs |
| `npm run import:school -- --yes` | Purges one school + academic year before re-import |

Accidental runs of the above require **Supabase backup restore** (or a manual `pg_dump` if you maintain one).

## Recommended backup & recovery strategy

### Production (fwis.org)

1. **Supabase Pro** (or higher) with **automated daily backups**.
2. **Enable PITR** if the project stores real student/parent PII.
3. **Weekly manual export** (optional extra safety):

   ```powershell
   # Requires PostgreSQL client; use DIRECT_URL from .env.local
   pg_dump "%DIRECT_URL%" -Fc -f "fwis-backup-%DATE%.dump"
   ```

   Store dumps encrypted (e.g. encrypted drive), not in git.

4. **Document secrets** in a secure vault: DB password, `PII_ENCRYPTION_KEY`, service role key.

### Test restore once (required)

Do this on a **separate Supabase project** or staging project — never first on production.

**Option A — Supabase dashboard (Pro / PITR)**

1. Create a new project e.g. `fwis-restore-test`.
2. In production project: **Database → Backups → Restore** (or contact Supabase support per plan docs).
3. Restore to the test project, or restore to a timestamp before a known test deletion.
4. Point a staging `.env.local` at the test DB and verify:
   - Login works
   - Students list loads (PII decrypts with same `PII_ENCRYPTION_KEY`)
   - Enrollments and attendance intact
5. Delete the test project when done.

**Option B — Manual `pg_dump` / `pg_restore`**

1. Take a dump from production/staging.
2. Create empty test project or local Postgres.
3. Restore:

   ```powershell
   pg_restore -d "postgresql://..." --clean --if-exists fwis-backup.dump
   ```

4. Run `npm run dev` against test DB and spot-check critical flows.

Record the date and result of the test (pass/fail) in your runbook.

## Recovery scenarios

| Scenario | First action |
|----------|--------------|
| User soft-deleted a student in UI | SQL unset `deleted_at` or restore row from backup if overwritten |
| Ran `db:delete-schools` by mistake | Supabase backup restore to before run; redeploy app |
| Bad migration | `prisma migrate` rollback + restore DB if migration altered data |
| Lost `PII_ENCRYPTION_KEY` | **Not recoverable** — ciphertext is permanent without key |
| Supabase region outage | Wait for provider; no app-level fix |

## What this project does not include

- Automated off-site `pg_dump` to S3 (add via GitHub Actions or cron if needed)
- In-app “undelete” UI for soft-deleted records
- Cross-region replication (Supabase plan / enterprise feature)

## Checklist

- [ ] Confirm automated backups enabled in Supabase dashboard
- [ ] Enable PITR for production (if on Pro)
- [ ] Back up `PII_ENCRYPTION_KEY` outside Vercel/Supabase
- [ ] Perform one test restore to a staging project
- [ ] Restrict who can run `db:purge` / `db:delete-schools` (production credentials)
