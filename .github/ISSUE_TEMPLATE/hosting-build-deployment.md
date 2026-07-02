---
name: Hosting build deployment
about: Request a contributor to create the hosting deploy package for shared server upload
title: "Create hosting build for shared server deployment"
labels: deployment, help wanted
assignees:
---

## Summary

We need a **hosting build package** created from the latest `dev` branch so the app can be deployed to shared Node.js hosting.

The repo includes a build script that produces a standalone deploy folder — the generated `hosting-build/` output is **not** committed to git (it is gitignored).

## Task

- [ ] Pull the latest `dev` branch
- [ ] Install dependencies (if needed): `npm install`
- [ ] Ensure `.env.local` is configured (required for Prisma generate during build)
- [ ] Run the hosting build command (see below)
- [ ] Upload `hosting-build/` or `hosting-build.zip` to the shared hosting server

## Build command

```bash
npm run build:hosting
```

This command:

- Runs `prisma generate` and `next build` (standalone output)
- Packages everything into **`hosting-build/`**
- Creates **`hosting-build.zip`** for easy upload (Windows)
- Includes `server.js`, static assets, Prisma schema/migrations, and deployment docs

## Output

| Path | Description |
|------|-------------|
| `hosting-build/` | Full deploy folder (~111 MB) |
| `hosting-build.zip` | Compressed archive for upload (~36 MB) |
| `hosting-build/HOSTING.md` | Server setup instructions |
| `hosting-build/.env.production.example` | Production env template |

## Server requirements

- **Node.js 18+** (20+ recommended)
- **PostgreSQL** (Supabase — already configured for this project)
- Shared host must support **long-running Node.js apps** (cPanel Node.js Selector, Passenger, PM2, etc.)
- **Not** plain PHP/static hosting

## After upload

1. Copy `.env.production.example` → `.env` on the server and fill in production values
2. Run migrations from dev machine: `npx prisma migrate deploy`
3. Start the app: `./start.sh` or set startup file to `server.js` in the host panel

See `hosting-build/HOSTING.md` for full cPanel/shared hosting steps.

## Notes

- Do **not** commit `hosting-build/` or `hosting-build.zip` to git
- Supabase credentials go in `.env` on the server — see `.env.example` for required variables
- The hosting build sets `FWIS_HOSTING_BUILD=1` to package the standalone output for deployment
