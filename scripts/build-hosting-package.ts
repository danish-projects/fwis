/**
 * Builds FWIS and packages a deploy-ready folder for shared Node.js hosting.
 *
 * Usage:
 *   npm run build:hosting -- stage
 *   npm run build:hosting -- prod
 *
 * Requires a matching env file in the project root (e.g. .env.stage, .env.prod).
 * That file is used for the Next.js build (NEXT_PUBLIC_*) and copied to
 * hosting-build-<env>/.env for the server.
 *
 * Output: hosting-build-<env>/  (e.g. hosting-build-stage, hosting-build-prod)
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

const ROOT = process.cwd();
const STANDALONE_DIR = path.join(ROOT, ".next", "standalone");

function hostingOutputDir(envName: string): string {
  return path.join(ROOT, `hosting-build-${envName}`);
}

function hostingZipPath(envName: string): string {
  return path.join(ROOT, `hosting-build-${envName}.zip`);
}

const ENV_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

function listHostingEnvFiles(): string[] {
  return fs
    .readdirSync(ROOT)
    .filter((name) => {
      if (!name.startsWith(".env.") || name === ".env.example") return false;
      if (name.endsWith(".local") || name.endsWith(".example")) return false;
      return fs.statSync(path.join(ROOT, name)).isFile();
    })
    .sort();
}

/**
 * Resolve `stage` | `prod` (or any name) to `.env.<name>`.
 * Exits without building when the argument is missing or the file is absent.
 */
function resolveHostingEnvFile(): { envName: string; envFilePath: string } {
  const envName = process.argv[2]?.trim();
  const available = listHostingEnvFiles();

  if (!envName) {
    console.error("Missing environment parameter.\n");
    console.error("Usage: npm run build:hosting -- <env>");
    console.error("Example: npm run build:hosting -- stage");
    console.error("Example: npm run build:hosting -- prod\n");
    if (available.length > 0) {
      console.error("Available env files:");
      for (const file of available) {
        console.error(`  ${file}  →  npm run build:hosting -- ${file.slice(".env.".length)}`);
      }
    } else {
      console.error("No .env.<name> files found (expected .env.stage, .env.prod, …).");
    }
    process.exit(1);
  }

  if (!ENV_NAME_PATTERN.test(envName)) {
    console.error(
      `Invalid environment name "${envName}". Use letters, numbers, _ or - only.`
    );
    process.exit(1);
  }

  const envFileName = `.env.${envName}`;
  const envFilePath = path.join(ROOT, envFileName);

  if (!fs.existsSync(envFilePath) || !fs.statSync(envFilePath).isFile()) {
    console.error(`Environment file not found: ${envFileName}\n`);
    console.error(`Input "${envName}" must match an existing file .env.${envName}.`);
    if (available.length > 0) {
      console.error("\nAvailable env files:");
      for (const file of available) {
        console.error(`  ${file}  →  npm run build:hosting -- ${file.slice(".env.".length)}`);
      }
    }
    process.exit(1);
  }

  return { envName, envFilePath };
}

function run(command: string, extraEnv: NodeJS.ProcessEnv = {}) {
  console.log(`\n> ${command}\n`);
  execSync(command, {
    stdio: "inherit",
    cwd: ROOT,
    env: {
      ...process.env,
      ...extraEnv,
      NODE_ENV: "production",
      FWIS_HOSTING_BUILD: "1",
    },
  });
}

function copyDir(from: string, to: string) {
  if (!fs.existsSync(from)) {
    throw new Error(`Missing path: ${from}`);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

const HOSTING_ENV_ALLOWLIST = new Set([".env", ".env.production.example"]);

function isSensitiveEnvFile(name: string): boolean {
  if (name === ".env" || name.startsWith(".env.")) return true;
  // Build isolation may store `.env.prod` as `env.prod` in a temp folder.
  return /^env(\.|$)/.test(name);
}

/** Recursively remove env files from a deploy folder (standalone may copy project-root .env*). */
function stripEnvFilesFromDir(
  dir: string,
  keepBasenames: ReadonlySet<string> = new Set()
): string[] {
  const removed: string[] = [];
  if (!fs.existsSync(dir)) return removed;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === ".hosting-env-hidden" ||
        entry.name === "hosting-env-hidden"
      ) {
        fs.rmSync(full, { recursive: true, force: true });
        removed.push(full);
        continue;
      }
      removed.push(...stripEnvFilesFromDir(full, keepBasenames));
      continue;
    }
    if (!isSensitiveEnvFile(entry.name) || keepBasenames.has(entry.name)) continue;
    fs.rmSync(full, { force: true });
    removed.push(full);
  }

  return removed;
}

function logRemovedEnvFiles(outputDir: string, removed: string[]) {
  if (removed.length === 0) return;
  console.log(`  Removed ${removed.length} stray env path(s) from package:`);
  for (const file of removed) {
    console.log(`    - ${path.relative(outputDir, file)}`);
  }
}

/** Keep only the selected runtime .env (and optional example template). */
function finalizeHostingEnvFiles(outputDir: string, envContent: string): string[] {
  const removed = stripEnvFilesFromDir(outputDir, HOSTING_ENV_ALLOWLIST);
  fs.writeFileSync(path.join(outputDir, ".env"), envContent, "utf8");
  return removed;
}

function assertHostingEnvFiles(outputDir: string) {
  const unexpected: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (
        isSensitiveEnvFile(entry.name) &&
        !HOSTING_ENV_ALLOWLIST.has(entry.name)
      ) {
        unexpected.push(path.relative(outputDir, full));
      }
    }
  }

  walk(outputDir);
  if (unexpected.length > 0) {
    throw new Error(
      `Hosting package still contains unexpected env files: ${unexpected.join(", ")}`
    );
  }
}

const BUILD_TIME_ENV_FILES = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local",
] as const;

/** Remove leftover hosting build artifacts from the repo and stale OS temp dirs. */
function cleanupStaleHostingArtifacts() {
  let removed = 0;

  for (const name of fs.readdirSync(ROOT)) {
    const full = path.join(ROOT, name);
    const isStaleHostingDir =
      /^hosting-build(?:-[a-zA-Z0-9_-]+)?\.old-\d+$/.test(name) ||
      name === ".hosting-env-hidden";

    if (!isStaleHostingDir) continue;
    if (!fs.existsSync(full)) continue;

    try {
      fs.rmSync(full, { recursive: true, force: true, maxRetries: 2, retryDelay: 200 });
      console.log(`  Removed stale ${name}`);
      removed++;
    } catch {
      console.log(`  Could not remove stale ${name} (may be in use)`);
    }
  }

  const tempRoot = os.tmpdir();
  const maxAgeMs = 60 * 60 * 1000;
  const now = Date.now();

  for (const name of fs.readdirSync(tempRoot)) {
    if (!name.startsWith("fwis-hosting-env-")) continue;

    const full = path.join(tempRoot, name);
    try {
      const stat = fs.statSync(full);
      if (!stat.isDirectory() || now - stat.mtimeMs < maxAgeMs) continue;
      fs.rmSync(full, { recursive: true, force: true });
      console.log(`  Removed stale temp ${name}`);
      removed++;
    } catch {
      // ignore locked temp dirs
    }
  }

  if (removed > 0) {
    console.log(`  Cleaned ${removed} stale hosting artifact(s)\n`);
  }
}

/**
 * Hide every root .env* file during `next build` and expose only the selected
 * environment via `.env.production.local` so stage/prod secrets never mix.
 */
function withIsolatedHostingBuildEnv<T>(envContent: string, fn: () => T): T {
  // Outside the repo so Next.js file tracing cannot bundle other env files.
  const hiddenDir = fs.mkdtempSync(path.join(os.tmpdir(), "fwis-hosting-env-"));
  const moved: Array<{ original: string; hidden: string }> = [];
  const toHide = new Set([...listHostingEnvFiles(), ...BUILD_TIME_ENV_FILES]);

  for (const name of toHide) {
    const original = path.join(ROOT, name);
    if (!fs.existsSync(original) || !fs.statSync(original).isFile()) continue;

    const hidden = path.join(hiddenDir, name);
    fs.renameSync(original, hidden);
    moved.push({ original, hidden });
  }

  const productionLocal = path.join(ROOT, ".env.production.local");
  fs.writeFileSync(productionLocal, envContent, "utf8");

  try {
    const result = fn();
    if (fs.existsSync(STANDALONE_DIR)) {
      stripEnvFilesFromDir(STANDALONE_DIR);
    }
    return result;
  } finally {
    fs.rmSync(productionLocal, { force: true });
    for (const { original, hidden } of moved) {
      if (fs.existsSync(hidden)) {
        fs.renameSync(hidden, original);
      }
    }
    fs.rmSync(hiddenDir, { recursive: true, force: true });
  }
}

function writeFile(outputDir: string, relativePath: string, content: string) {
  const target = path.join(outputDir, relativePath);
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

function copyPgRuntimePackages(outputDir: string) {
  const destNodeModules = path.join(outputDir, "node_modules");
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

/** Windows often locks the output folder when a local server.js is still running. */
function clearOutputDir(outputDir: string) {
  if (!fs.existsSync(outputDir)) return;

  console.log(`  Removing existing ${path.basename(outputDir)}/ ...`);

  try {
    fs.rmSync(outputDir, {
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

  const staleDir = `${outputDir}.old-${Date.now()}`;
  fs.renameSync(outputDir, staleDir);
  console.log(
    `  Previous ${path.basename(outputDir)} was locked; moved to ${path.basename(staleDir)}`
  );
  console.log(
    `  Tip: stop any local server.js from ${path.basename(outputDir)} before rebuilding.`
  );
}

function main() {
  const { envName, envFilePath } = resolveHostingEnvFile();
  const outputDir = hostingOutputDir(envName);
  const outputFolderName = path.basename(outputDir);

  console.log("FWIS hosting package build\n");
  cleanupStaleHostingArtifacts();
  console.log(`Environment: ${envName}`);
  console.log(`Env file:     ${path.basename(envFilePath)}`);
  console.log(`Output:       ${outputFolderName}/`);

  // Load into this process so NEXT_PUBLIC_* are available to `next build`.
  const loaded = loadDotenv({ path: envFilePath, override: true });
  if (loaded.error) {
    console.error(`Failed to load ${path.basename(envFilePath)}:`, loaded.error.message);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envFilePath, "utf8");

  clearOutputDir(outputDir);

  console.log("\nRunning L1 BDD tests (mock data + typecheck)...");
  run("npm run test:l1");

  console.log("\nIsolating build env (only selected .env file is used) ...");
  withIsolatedHostingBuildEnv(envContent, () => {
    run("npm run build");
  });

  if (!fs.existsSync(STANDALONE_DIR)) {
    throw new Error(
      "Standalone output not found. Ensure next.config.ts has output: \"standalone\"."
    );
  }

  console.log(`\nPackaging ${outputFolderName}/ ...`);
  stripEnvFilesFromDir(STANDALONE_DIR);
  copyDir(STANDALONE_DIR, outputDir);
  copyDir(path.join(ROOT, ".next", "static"), path.join(outputDir, ".next", "static"));
  copyDir(path.join(ROOT, "public"), path.join(outputDir, "public"));
  copyPgRuntimePackages(outputDir);

  if (fs.existsSync(path.join(ROOT, "src", "generated", "prisma"))) {
    copyDir(
      path.join(ROOT, "src", "generated", "prisma"),
      path.join(outputDir, "src", "generated", "prisma")
    );
  }

  copyDir(path.join(ROOT, "prisma"), path.join(outputDir, "prisma"));

  logRemovedEnvFiles(outputDir, stripEnvFilesFromDir(outputDir));

  if (fs.existsSync(path.join(ROOT, ".env.example"))) {
    fs.copyFileSync(
      path.join(ROOT, ".env.example"),
      path.join(outputDir, ".env.production.example")
    );
  }

  writeFile(
    outputDir,
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
    outputDir,
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
    outputDir,
    "web.config",
    `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <!-- Force HTTPS at IIS (do not rely on Node alone behind httpPlatformHandler). -->
    <rewrite>
      <rules>
        <rule name="HTTP to HTTPS" stopProcessing="true">
          <match url="(.*)" />
          <conditions>
            <add input="{HTTPS}" pattern="off" ignoreCase="true" />
          </conditions>
          <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
        </rule>
      </rules>
    </rewrite>
    <httpProtocol>
      <customHeaders>
        <remove name="X-Powered-By" />
      </customHeaders>
    </httpProtocol>
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
        <!-- <environmentVariable name="NEXT_PUBLIC_APP_URL" value="https://fwis-stage.codewithraza.com" /> -->
        <!-- <environmentVariable name="PII_ENCRYPTION_KEY" value="..." /> -->
      </environmentVariables>
    </httpPlatform>
  </system.webServer>
</configuration>
`
  );

  writeFile(
    outputDir,
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
# Must be https:// for Secure cookies and HSTS-related app behavior
NEXT_PUBLIC_APP_URL=https://fwis-stage.codewithraza.com
PII_ENCRYPTION_KEY=base64-32-byte-key

# Optional email notifications
# RESEND_API_KEY=re_...
# EMAIL_FROM=FWIS <notifications@yourdomain.com>
`
  );

  writeFile(
    outputDir,
    "HOSTING.md",
    `# FWIS — Shared hosting deployment

This folder is a **standalone Node.js build** of FWIS. Upload the entire \`${outputFolderName}\` directory to your server.

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

1. Create \`.env.stage\` and/or \`.env.prod\` with full credentials (see \`.env.example\`).
2. Set \`NEXT_PUBLIC_APP_URL=https://your-actual-domain.com\` in that file — embedded at build time.
3. Run on **Windows** (SmarterASP runs Windows; avoids SWC/native module mismatches):

\`\`\`bash
npm run build:hosting -- stage   # uses .env.stage → hosting-build-stage/
npm run build:hosting -- prod    # uses .env.prod  → hosting-build-prod/
\`\`\`

The script exits without building if the name does not match an existing \`.env.<name>\` file.

### Upload via FTP

1. Upload \`hosting-build-${envName}.zip\` to your site root, then unzip in **Control Panel → File Manager**,  
   **or** upload the entire \`${outputFolderName}/\` folder contents via FTP (FileZilla).
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
| HTTP not redirecting to HTTPS | Ensure \`web.config\` has the HTTP→HTTPS rewrite rule; URL Rewrite module must be enabled on IIS |
| \`X-Powered-By\` still present | Redeploy latest \`web.config\` (removes ASP.NET header); Next.js header is disabled via \`poweredByHeader: false\` |
| Redirect to \`localhost:PORT\` | IIS internal port — fixed in app; rebuild + set \`NEXT_PUBLIC_APP_URL\` to your public **https://** URL |
| DB connection errors | Use Supabase **session pooler** on port **5432** for \`DATABASE_URL\` (SmarterASP blocks 6543). SSL: relaxed by default for Supabase. |
| Dashboard 500 after login | Rebuild with latest \`npm run build:hosting\` (pg deps fix). If still failing: DB SSL/port — see above; check \`logs/node-stdout.log\` |

KB: [Next.js on SmarterASP](https://www.smarterasp.net/support/kb/a2233/how-to-publish-a-next_js-project-to-your-hosting-account.aspx)

## Updating

1. Build locally: \`npm run build:hosting -- stage\` (or \`prod\`)
2. Upload the new \`${outputFolderName}\` contents (replace files), including \`.env\`
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
| \`.env\` | Runtime secrets for this environment only (from \`.env.${envName}\`) |

Built: ${new Date().toISOString()} (env: ${envName})
`
  );

  const pkgPath = path.join(outputDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.scripts = {
    ...pkg.scripts,
    start: "node server.js",
  };
  pkg.devDependencies = undefined;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

  logRemovedEnvFiles(outputDir, finalizeHostingEnvFiles(outputDir, envContent));
  assertHostingEnvFiles(outputDir);
  console.log(
    `  Wrote ${outputFolderName}/.env only (from ${path.basename(envFilePath)})`
  );

  try {
    fs.chmodSync(path.join(outputDir, "start.sh"), 0o755);
  } catch {
    // Windows may not support chmod
  }

  const sizeMb =
    Math.round(
      getDirSize(outputDir) / (1024 * 1024)
    );

  console.log("\nHosting package ready:");
  console.log(`  ${outputDir}`);
  console.log(`  Environment: ${envName} (from ${path.basename(envFilePath)})`);
  console.log(`  Approx. size: ${sizeMb} MB`);
  console.log("\nNext steps:");
  console.log(`  1. Upload ${outputFolderName}/ to your server (includes .env)`);
  console.log("  2. Run ./start.sh or point Node app to server.js");
  console.log("  3. See HOSTING.md for cPanel / shared hosting details");

  const zipPath = hostingZipPath(envName);
  try {
    if (process.platform === "win32") {
      if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });
      execSync(
        `powershell -NoProfile -Command "Compress-Archive -Path '${outputDir.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force"`,
        { stdio: "inherit", cwd: ROOT }
      );
      console.log(`\nZip archive: ${zipPath}`);
    }
  } catch {
    console.log(`\nTip: zip ${outputFolderName}/ manually for upload if needed.`);
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

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
