---
name: Hosting build deployment
about: Request a contributor to create the hosting deploy package for shared server upload
title: "Create hosting build for shared server deployment"
labels: deployment, help wanted
assignees:
---

## Summary

We need a **hosting build package** created from the latest `dev` branch so the app can be deployed to shared Node.js hosting.

The repo includes a build script that produces a standalone deploy folder — generated `hosting-build-<env>/` output is **not** committed to git (it is gitignored).

## Task

- [ ] Pull the latest `dev` branch
- [ ] Install dependencies (if needed): `npm install`
- [ ] Create `.env.stage` and/or `.env.prod` with target environment secrets (see `.env.example`)
- [ ] Run the hosting build command (see below)
- [ ] Upload `hosting-build-<env>/` or `hosting-build-<env>.zip` to the shared hosting server

## Build command

```bash
npm run build:hosting -- stage   # uses .env.stage → hosting-build-stage/
npm run build:hosting -- prod    # uses .env.prod  → hosting-build-prod/
```

This command:

- Runs **L1 BDD tests** (`npm run test:l1`) — mock-data Vitest + TypeScript check
- Runs `prisma generate` and `next build` (standalone output) using only the selected `.env.<env>` file
- Packages everything into **`hosting-build-<env>/`**
- Creates **`hosting-build-<env>.zip`** for easy upload (Windows)
- Copies **`.env`** into the package from `.env.<env>` (no separate example file)
- Includes `server.js`, static assets, Prisma schema/migrations, and `HOSTING.md`

## Output

| Path | Description |
|------|-------------|
| `hosting-build-stage/` or `hosting-build-prod/` | Full deploy folder |
| `hosting-build-<env>.zip` | Compressed archive for upload (Windows) |
| `hosting-build-<env>/HOSTING.md` | Server setup instructions |
| `hosting-build-<env>/.env` | Runtime secrets (from `.env.stage` or `.env.prod`) |

## Server requirements

- **Node.js 18+** (20+ recommended)
- **PostgreSQL** (SmarterASP.NET — see [docs/SMARTERASP_SETUP.md](../../docs/SMARTERASP_SETUP.md))
- Shared host must support **long-running Node.js apps** (cPanel Node.js Selector, Passenger, PM2, etc.)
- **Not** plain PHP/static hosting

## After upload

1. **`.env` is already in the package** — review on the server if needed; do not commit the build folder to git
2. Run migrations from dev machine: `npx prisma migrate deploy`
3. Start the app: `./start.sh` or set startup file to `server.js` in the host panel

See `hosting-build-<env>/HOSTING.md` for full cPanel/shared hosting steps.

## Notes

- Do **not** commit `hosting-build-*` or `hosting-build-*.zip` to git
- Do **not** commit `.env.stage` or `.env.prod` to git
- To change `NEXT_PUBLIC_*` values, edit `.env.<env>` locally and rebuild
- The hosting build sets `FWIS_HOSTING_BUILD=1` to package the standalone output for deployment
