# FWIS hosting comparison — SmarterASP vs Vercel

One-page summary for leadership and deployment planning. FWIS is a **Next.js + PostgreSQL** school management system (not a student-information-only tool).

---

## Executive summary

| | **SmarterASP.NET** | **Vercel + Neon** |
|---|---|---|
| **Best fit** | Lowest cost, already integrated in FWIS | Best Next.js experience, Git-based deploys |
| **Annual cost (realistic)** | **~$107/yr** | **~$310–375/yr** |
| **Recommendation today** | **Yes — budget & scale match FWIS** | Consider later if team grows or uptime/deploy needs increase |

---

## Annual cost comparison

Assumes: production + staging, custom domain, HTTPS, PostgreSQL for student/attendance data.

| Item | SmarterASP (.NET Premium) | Vercel + Neon (commercial) |
|------|---------------------------|----------------------------|
| **Hosting** | $7.95/mo → **~$95/yr** | Vercel Pro **$20/mo** → **$240/yr** |
| **Database** | Included (10 GB PostgreSQL) | Neon Launch **~$5–10/mo** → **$60–120/yr** |
| **Staging DB** | Second DB on same account | Neon Free **$0** |
| **Domain** | **~$12/yr** | **~$12–15/yr** |
| **SSL** | Free (Let’s Encrypt) | Free (automatic on Vercel) |
| **WHOIS privacy** (optional) | ~$8/yr | ~$0–8/yr |
| **Total (core)** | **~$107/yr** | **~$310–375/yr** |

**Cheapest Vercel path (Hobby + Neon Free):** ~**$12–15/yr** (domain only) — **not recommended** for an official multi-school system (Hobby is non-commercial; Neon Free has cold starts and 0.5 GB cap per project).

---

## Database storage estimate (FWIS)

Per **school per academic year** (~100 students, 12 teachers, 16 logins, 36 Sundays):

| Table | Rows (approx.) | Share of storage |
|-------|----------------|------------------|
| Attendance | 3,600 | ~50% |
| Assessments | 700 | ~5% |
| Students (with encrypted PII) | 100 | ~8% |
| Enrollments, users, calendar, etc. | ~500 | ~37% |
| **Total per school per year** | **~5,100 rows** | **~1–2 MB** |

| Scale | Estimated DB size |
|-------|-------------------|
| 1 school, 1 year | ~1.3 MB |
| 10 schools, 5 years | ~55–65 MB |
| 20 schools, 10 years | ~250–300 MB |

**Conclusion:** Even aggressive growth stays **well under 1 GB** for years. SmarterASP’s **10 GB** allocation and Neon’s **0.5 GB free tier** are both sufficient at current scale; Neon paid tier removes free-tier limits and cold-start tradeoffs.

---

## Feature comparison

| | SmarterASP | Vercel + Neon |
|---|---|---|
| **Deploy** | Manual zip (`npm run build:hosting`) | Git push, preview URLs |
| **Migrations** | Run from dev machine (`prisma migrate deploy`) | Same (or CI pipeline) |
| **Next.js support** | Node.js on Windows/IIS (secondary focus) | Native platform |
| **PostgreSQL** | Shared, included | Managed Neon (separate billing) |
| **Uptime risk** | Shared pool; some reports of daily Node restarts | Generally strong; serverless cold starts on DB if scale-to-zero |
| **Team / previews** | Manual stage + prod env files | Built-in preview deployments |
| **Support** | 24/7 ticket/chat; .NET-oriented | Email (Pro); strong Next.js docs |
| **Student PII** | App-level encryption + HTTPS + backups | Same app code; HTTPS + Neon backups |

---

## SmarterASP — pros and cons

**Pros**
- **Lowest cost** (~$9/mo all-in)
- **PostgreSQL + Node on one bill**
- **10 GB database** — far more than FWIS needs
- **Already documented** in repo (`SMARTERASP_SETUP.md`, `build:hosting` scripts)
- **Adequate** for Sunday-school traffic and modest concurrent users

**Cons**
- Windows/IIS host; **Node.js is not the primary platform**
- **Manual deploy** (zip upload), no Git CI out of the box
- **Shared application pool** — possible brief downtime or slow first request after restarts
- **Proprietary control panel** — learning curve for new admins
- **Migrations and backups** largely operator-managed
- Mixed public reviews on **incident support / backups** — keep `PII_ENCRYPTION_KEY` and DB dumps off-site

---

## Vercel + Neon — pros and cons

**Pros**
- **Best fit for Next.js** — git deploy, previews, automatic SSL
- **Cleaner ops** for developers (push to deploy)
- **Neon** scales with usage; branching for staging
- Strong path if the team or school count grows

**Cons**
- **~3× higher annual cost** than SmarterASP at FWIS scale
- **Two vendors** (Vercel + Neon) — two bills, two dashboards
- Neon **scale-to-zero** on free/low tiers can add latency on first Sunday login unless paid/always-on compute is configured
- Would require **new deploy workflow** (not the current `hosting-build` zip path)

---

## Recommendation

| Phase | Suggestion |
|-------|------------|
| **Now (launch)** | **SmarterASP .NET Premium** — cost, capacity, and existing FWIS tooling align |
| **Later** | Revisit **Vercel + Neon** if you need Git-based releases, more preview environments, or stricter Sunday-morning uptime SLAs |

Regardless of host:
- Store **`PII_ENCRYPTION_KEY`** and **`AUTH_SESSION_SECRET`** outside the host
- Run **stage and prod** on separate databases
- Enable **HTTPS** on the production domain
- Test **restore** from backup once per year

---

## Manager email (copy/paste)

**Subject:** FWIS hosting options — cost comparison

Dear [Manager Name],

We evaluated hosting for **FWIS** (Faizan Weekend Islamic School Management System). The app uses **Next.js + PostgreSQL** and stores student attendance and enrollment data.

**Option 1 — SmarterASP.NET (recommended for launch)**  
~**$107/year** (hosting $95 + domain $12; SSL free; 10 GB database included)

**Option 2 — Vercel + Neon (modern cloud)**  
~**$310–375/year** (Vercel Pro $240 + database ~$60–120 + domain; SSL free)

Our database growth estimate is modest: **~1–2 MB per school per year** (~65 MB for 10 schools over 5 years), so storage is not a cost driver on either platform.

**SmarterASP** is the better value today and matches our current deploy process. **Vercel** costs more but offers easier Git-based updates and is a good future option if usage or the dev team grows.

I recommend approving **SmarterASP .NET Premium** for production and staging, plus domain registration with free SSL.

Happy to discuss.

Best regards,  
[Your Name]

---

## Related docs

| Document | Contents |
|----------|----------|
| [SMARTERASP_SETUP.md](./SMARTERASP_SETUP.md) | Deploy steps for current host |
| [backup-recovery.md](./backup-recovery.md) | Backups and restore |
| [pii-security.md](./pii-security.md) | Student PII encryption |
