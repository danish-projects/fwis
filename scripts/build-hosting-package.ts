/**
 * Builds FWIS and packages a deploy-ready folder for shared Node.js hosting.
 *
 * Usage: npm run build:hosting
 * Output: hosting-build/
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "hosting-build");
const STANDALONE_DIR = path.join(ROOT, ".next", "standalone");

function run(command: string) {
  console.log(`\n> ${command}\n`);
  execSync(command, {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", FWIS_HOSTING_BUILD: "1" },
  });
}

function copyDir(from: string, to: string) {
  if (!fs.existsSync(from)) {
    throw new Error(`Missing path: ${from}`);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

function writeFile(relativePath: string, content: string) {
  const target = path.join(OUTPUT_DIR, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

/**
 * Next.js standalone file tracing often copies only package.json stubs for pg
 * sub-dependencies. Dashboard routes fail at runtime with 500 (Cannot find module
 * pg-types/postgres-array/...). Copy complete packages from the dev tree instead.
 */
const PG_RUNTIME_PACKAGES = [
  "pg-types",
  "pg-int8",
  "pg-pool",
  "pg-protocol",
  "pg-connection-string",
  "pgpass",
  "pg-cloudflare",
  "postgres-array",
  "postgres-bytea",
  "postgres-date",
  "postgres-interval",
  "split2",
  "xtend",
];

function resolvePackageDir(packageName: string): string | null {
  const nested = path.join(ROOT, "node_modules", "pg", "node_modules", packageName);
  if (fs.existsSync(nested)) return nested;

  const topLevel = path.join(ROOT, "node_modules", packageName);
  if (fs.existsSync(topLevel)) return topLevel;

  return null;
}

function copyPgRuntimePackages() {
  const destNodeModules = path.join(OUTPUT_DIR, "node_modules");
  fs.mkdirSync(destNodeModules, { recursive: true });

  for (const packageName of PG_RUNTIME_PACKAGES) {
    const src = resolvePackageDir(packageName);
    if (!src) continue;

    const dest = path.join(destNodeModules, packageName);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(src, dest, { recursive: true });
  }

  console.log("  Copied complete pg runtime packages for standalone hosting");
}

/** Windows often locks hosting-build when a local server.js is still running. */
function clearOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) return;

  try {
    fs.rmSync(OUTPUT_DIR, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 300,
    });
    return;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "EBUSY" && code !== "EPERM" && code !== "ENOTEMPTY") {
      throw err;
    }
  }

  const staleDir = `${OUTPUT_DIR}.old-${Date.now()}`;
  fs.renameSync(OUTPUT_DIR, staleDir);
  console.log(
    `  Previous hosting-build was locked; moved to ${path.basename(staleDir)}`
  );
  console.log(
    "  Tip: stop any local server.js from hosting-build before rebuilding."
  );
}

function main() {
  console.log("FWIS hosting package build\n");

  clearOutputDir();

  run("npm run build");

  if (!fs.existsSync(STANDALONE_DIR)) {
    throw new Error(
      "Standalone output not found. Ensure next.config.ts has output: \"standalone\"."
    );
  }

  console.log("\nPackaging hosting-build/ ...");
  copyDir(STANDALONE_DIR, OUTPUT_DIR);
  copyDir(path.join(ROOT, ".next", "static"), path.join(OUTPUT_DIR, ".next", "static"));
  copyDir(path.join(ROOT, "public"), path.join(OUTPUT_DIR, "public"));
  copyPgRuntimePackages();

  if (fs.existsSync(path.join(ROOT, "src", "generated", "prisma"))) {
    copyDir(
      path.join(ROOT, "src", "generated", "prisma"),
      path.join(OUTPUT_DIR, "src", "generated", "prisma")
    );
  }

  copyDir(path.join(ROOT, "prisma"), path.join(OUTPUT_DIR, "prisma"));

  if (fs.existsSync(path.join(ROOT, ".env.example"))) {
    fs.copyFileSync(
      path.join(ROOT, ".env.example"),
      path.join(OUTPUT_DIR, ".env.production.example")
    );
  }

  writeFile(
    "start.sh",
    `#!/bin/sh
cd "$(dirname "$0")"
export NODE_ENV=production
export PORT=\${PORT:-3000}
export HOSTNAME=\${HOSTNAME:-0.0.0.0}
exec node server.js
`
  );

  writeFile(
    "start.bat",
    `@echo off
cd /d "%~dp0"
set NODE_ENV=production
if not defined PORT set PORT=3000
if not defined HOSTNAME set HOSTNAME=0.0.0.0
node server.js
`
  );

  writeFile(
    "web.config",
    `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="httpPlatformHandler" path="*" verb="*" modules="httpPlatformHandler" />
    </handlers>
    <httpPlatform
      processPath="node"
      arguments="server.js"
      startupTimeLimit="60"
      startupRetryCount="3"
      stdoutLogEnabled="true"
      stdoutLogFile=".\\logs\\node-stdout.log">
      <environmentVariables>
        <environmentVariable name="PORT" value="%HTTP_PLATFORM_PORT%" />
        <environmentVariable name="NODE_ENV" value="production" />
        <!-- Add production secrets here (or use a .env file — see web.config.env.example): -->
        <!-- <environmentVariable name="DATABASE_URL" value="..." /> -->
        <!-- <environmentVariable name="DIRECT_URL" value="..." /> -->
        <!-- <environmentVariable name="NEXT_PUBLIC_SUPABASE_URL" value="..." /> -->
        <!-- <environmentVariable name="NEXT_PUBLIC_SUPABASE_ANON_KEY" value="..." /> -->
        <!-- <environmentVariable name="SUPABASE_SERVICE_ROLE_KEY" value="..." /> -->
        <!-- <environmentVariable name="NEXT_PUBLIC_APP_URL" value="http://razarajwani-001-site17.dtempurl.com" /> -->
        <!-- <environmentVariable name="PII_ENCRYPTION_KEY" value="..." /> -->
      </environmentVariables>
    </httpPlatform>
  </system.webServer>
</configuration>
`
  );

  writeFile(
    "web.config.env.example",
    `# SmarterASP.NET / IIS — copy values into web.config <environmentVariables>
# or create a .env file next to server.js (SmarterASP Next.js guide supports .env).
#
# IMPORTANT: NEXT_PUBLIC_* vars are baked in at build time. Set them in .env.local
# BEFORE running npm run build:hosting (especially NEXT_PUBLIC_APP_URL).

DATABASE_URL=postgresql://...pooler...
DIRECT_URL=postgresql://...direct...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://yourdomain.com
PII_ENCRYPTION_KEY=base64-32-byte-key

# Optional email notifications
# RESEND_API_KEY=re_...
# EMAIL_FROM=FWIS <notifications@yourdomain.com>
`
  );

  writeFile(
    "HOSTING.md",
    `# FWIS — Shared hosting deployment

This folder is a **standalone Node.js build** of FWIS. Upload the entire \`hosting-build\` directory to your server.

## Requirements

- **Node.js 20+** (18 LTS minimum)
- **PostgreSQL** database (Supabase recommended — already used by this project)
- Shared host must support **long-running Node.js apps** (cPanel Node.js Selector, Passenger, PM2, etc.)
- This is **not** a static HTML site — PHP-only hosting will not work.

## Quick start

1. Upload all files in this folder to your hosting account (e.g. \`~/fwis/\`).
2. Copy \`.env.production.example\` to \`.env\` and fill in production values.
3. On the server (SSH or host terminal), from this folder, start the app (step 4 below).

   Run database migrations from your dev machine before deploy:

   \`\`\`bash
   # On your computer, with production DIRECT_URL configured
   npx prisma migrate deploy
   \`\`\`

4. Start the app:

   \`\`\`bash
   chmod +x start.sh
   ./start.sh
   \`\`\`

   Or set the host panel **startup file** to \`server.js\` with \`NODE_ENV=production\`.

5. Point your domain to the app port (reverse proxy / Node.js app URL in cPanel).

## Environment variables

See \`.env.production.example\`. Required in production:

| Variable | Purpose |
|----------|---------|
| \`DATABASE_URL\` | Postgres connection (pooler URL) |
| \`DIRECT_URL\` | Direct Postgres URL (migrations) |
| \`NEXT_PUBLIC_SUPABASE_URL\` | Supabase project URL |
| \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` | Supabase anon key |
| \`SUPABASE_SERVICE_ROLE_KEY\` | Server-side Supabase admin |
| \`NEXT_PUBLIC_APP_URL\` | Public site URL (https://yourdomain.com) |
| \`PII_ENCRYPTION_KEY\` | 32-byte base64 key for student PII |

Optional: \`PORT\` (default 3000), \`HOSTNAME\` (default 0.0.0.0), \`RESEND_API_KEY\`, \`EMAIL_FROM\`.

## cPanel (Node.js Selector)

1. **Setup Node.js App** → Create application
2. **Application root:** folder containing \`server.js\`
3. **Application URL:** your subdomain or domain
4. **Application startup file:** \`server.js\`
5. Add environment variables in the panel (same as \`.env\`)
6. Run \`npm install\` is **not** required — dependencies are bundled in standalone output
7. Click **Restart** after uploading a new build

## SmarterASP.NET (Windows / IIS / FTP)

This build includes \`web.config\` for IIS **httpPlatformHandler** (required on SmarterASP).

### Before you build (on your PC)

1. Create \`.env.local\` with Supabase credentials (see README).
2. Set \`NEXT_PUBLIC_APP_URL=https://your-actual-domain.com\` — this is embedded at build time.
3. Run \`npm run build:hosting\` on **Windows** (SmarterASP runs Windows; avoids SWC/native module mismatches).

### Upload via FTP

1. Upload \`hosting-build.zip\` to your site root, then unzip in **Control Panel → File Manager**,  
   **or** upload the entire \`hosting-build/\` folder contents via FTP (FileZilla).
2. Ensure these files are in the **site root** (same folder as \`web.config\`):
   \`server.js\`, \`web.config\`, \`.next/\`, \`node_modules/\`, \`public/\`
3. Create a \`logs/\` folder (for \`web.config\` stdout logging) if it does not exist.

### Enable Node.js on SmarterASP

1. Control Panel → your website → **Node.js App** (or enable Node.js for the folder).
2. Confirm \`web.config\` points to \`server.js\` (already configured in this package).
3. Add production environment variables:
   - Edit \`web.config\` \`<environmentVariables>\` (see comments in file), **or**
   - Place a \`.env\` file beside \`server.js\` (see \`web.config.env.example\`).

### Database (Supabase — not on SmarterASP)

PostgreSQL stays on **Supabase**. From your dev machine (with production \`DIRECT_URL\` in \`.env.local\`):

\`\`\`bash
npm run db:deploy
\`\`\`

Also run \`supabase/migrations/002_app_user_self_read.sql\` in Supabase SQL Editor if not done yet.

### Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank page / 500 | Check \`logs/node-stdout.log\`; verify env vars in \`web.config\` or \`.env\` |
| SWC / native module error | Rebuild on Windows, re-upload \`node_modules\` |
| Auth redirect loops | \`NEXT_PUBLIC_APP_URL\` must match your live URL (rebuild if wrong) |
| Redirect to \`localhost:PORT\` | IIS internal port — fixed in app; rebuild + set \`NEXT_PUBLIC_APP_URL\` to your public URL (http:// for dtempurl) |
| DB connection errors | Use Supabase **session pooler** on port **5432** for \`DATABASE_URL\` (SmarterASP blocks 6543). SSL: relaxed by default for Supabase. |
| Dashboard 500 after login | Rebuild with latest \`npm run build:hosting\` (pg deps fix). If still failing: DB SSL/port — see above; check \`logs/node-stdout.log\` |

KB: [Next.js on SmarterASP](https://www.smarterasp.net/support/kb/a2233/how-to-publish-a-next_js-project-to-your-hosting-account.aspx)

## Updating

1. Build locally: \`npm run build:hosting\`
2. Upload the new \`hosting-build\` contents (replace files)
3. Restart the Node.js app on the host

## Folder contents

| Path | Purpose |
|------|---------|
| \`server.js\` | Next.js standalone server entry |
| \`web.config\` | IIS / SmarterASP httpPlatformHandler config |
| \`.next/\` | Compiled app + static assets |
| \`public/\` | Public static files |
| \`prisma/\` | Schema and migrations |
| \`src/generated/prisma/\` | Prisma client (if present) |
| \`node_modules/\` | Minimal runtime dependencies |
| \`web.config.env.example\` | Env var template for IIS / .env |

Built: ${new Date().toISOString()}
`
  );

  const pkgPath = path.join(OUTPUT_DIR, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.scripts = {
    ...pkg.scripts,
    start: "node server.js",
  };
  pkg.devDependencies = undefined;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

  try {
    fs.chmodSync(path.join(OUTPUT_DIR, "start.sh"), 0o755);
  } catch {
    // Windows may not support chmod
  }

  const sizeMb =
    Math.round(
      getDirSize(OUTPUT_DIR) / (1024 * 1024)
    );

  console.log("\nHosting package ready:");
  console.log(`  ${OUTPUT_DIR}`);
  console.log(`  Approx. size: ${sizeMb} MB`);
  console.log("\nNext steps:");
  console.log("  1. Upload hosting-build/ to your server");
  console.log("  2. Configure .env (see .env.production.example)");
  console.log("  3. Run ./start.sh or point Node app to server.js");
  console.log("  4. See HOSTING.md for cPanel / shared hosting details");

  const zipPath = path.join(ROOT, "hosting-build.zip");
  try {
    if (process.platform === "win32") {
      if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });
      execSync(
        `powershell -NoProfile -Command "Compress-Archive -Path '${OUTPUT_DIR.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force"`,
        { stdio: "inherit", cwd: ROOT }
      );
      console.log(`\nZip archive: ${zipPath}`);
    }
  } catch {
    console.log("\nTip: zip hosting-build/ manually for upload if needed.");
  }
}

function getDirSize(dir: string): number {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += getDirSize(full);
    } else {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

main();
