# Backup & recovery

FWIS uses **PostgreSQL on SmarterASP.NET** as the system of record. Recovery relies on hosting-provider backups, optional manual exports, and application-level soft deletes.

## Layers of protection

| Layer | What it protects | Recovery |
|-------|------------------|----------|
| **SmarterASP PostgreSQL backups** | Full database (schema + data) | Restore via hosting control panel (plan-dependent) |
| **Manual `pg_dump`** | Full database snapshot you control | `pg_restore` to same or new database |
| **Soft deletes** (`deleted_at`) | Most admin “delete” actions in the app | Reversible in DB or via support script |
| **Audit logs** | Who changed what (not full PII) | Forensics, not full row restore |
| **`PII_ENCRYPTION_KEY`** | Ability to read encrypted student fields | Must be backed up separately — not in the database |

## SmarterASP backups

1. Sign in to **SmarterASP.NET** control panel.
2. Open your **PostgreSQL** database.
3. Confirm **automated backups** are enabled for your plan.
4. Note retention window and restore procedure in your runbook.

Also store separately (password manager / secure vault — not in git):

- Database connection string / password
- `PII_ENCRYPTION_KEY` (see [pii-security.md](./pii-security.md))
- `AUTH_SESSION_SECRET`

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

Accidental runs require **database backup restore** (or a manual `pg_dump` if you maintain one).

## Recommended backup & recovery strategy

### Production (fwis.org)

1. **Enable SmarterASP automated PostgreSQL backups** for production.
2. **Weekly manual export** (optional extra safety):

   ```powershell
   # Requires PostgreSQL client; use DIRECT_URL from .env.prod
   pg_dump "%DIRECT_URL%" -Fc -f "fwis-backup-%DATE%.dump"
   ```

   Store dumps encrypted (e.g. encrypted drive), not in git.

3. **Document secrets** in a secure vault: DB password, `PII_ENCRYPTION_KEY`, `AUTH_SESSION_SECRET`.

### Test restore once (required)

Do this on a **staging database** — never first on production.

**Option A — SmarterASP restore**

1. Restore from a backup to a new or staging database in the control panel.
2. Point staging `.env` at the restored DB and verify:
   - Login works
   - Students list loads (PII decrypts with same `PII_ENCRYPTION_KEY`)
   - Enrollments and attendance intact
3. Document pass/fail and date.

**Option B — Manual `pg_dump` / `pg_restore`**

1. Take a dump from production/staging.
2. Create empty test database (local or staging).
3. Restore:

   ```powershell
   pg_restore -d "postgresql://..." --clean --if-exists fwis-backup.dump
   ```

4. Run `npm run dev` against test DB and spot-check critical flows.

## Application backup (Excel export)

The **Data Backup** page (`/backup`) exports a school-year workbook (same format as import). This is useful for:

- Offline copies of operational data
- Re-import after validation (`npm run import:school`)
- Leadership review without DB access

It is **not** a substitute for full PostgreSQL backups (schema, users, audit logs, all schools).

## Recovery scenarios

| Scenario | First action |
|----------|--------------|
| User soft-deleted a student in UI | SQL unset `deleted_at` or restore row from backup if overwritten |
| Ran `db:delete-schools` by mistake | Database backup restore to before run; redeploy app |
| Bad migration | Fix migration + restore DB if migration altered data |
| Lost `PII_ENCRYPTION_KEY` | **Not recoverable** — ciphertext is permanent without key |
| Hosting provider outage | Wait for provider; no app-level fix |

## What this project does not include

- Automated off-site `pg_dump` to cloud storage (add via scheduled task if needed)
- In-app “undelete” UI for soft-deleted records
- Cross-region database replication

## Checklist

- [ ] Confirm automated backups enabled in SmarterASP control panel
- [ ] Back up `PII_ENCRYPTION_KEY` and `AUTH_SESSION_SECRET` outside hosting
- [ ] Perform one test restore to staging
- [ ] Restrict who can run `db:purge` / `db:delete-schools` (production credentials)
- [ ] Optional: schedule weekly `pg_dump` for off-site copies
