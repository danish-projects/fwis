/**
 * FWIS one-command setup after .env.local is configured.
 * Usage: npm run setup
 */
import { config } from "dotenv";
import { execSync } from "node:child_process";

config({ path: ".env.local" });
config({ path: ".env" });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.includes("[YOUR-PASSWORD]") || value.includes("[") || value.includes("your-")) {
    throw new Error(`Missing or placeholder env: ${name}. Configure .env.local first.`);
  }
  return value;
}

async function main() {
  console.log("FWIS Setup\n==========\n");

  requireEnv("DATABASE_URL");
  requireEnv("DIRECT_URL");
  requireEnv("AUTH_SESSION_SECRET");
  requireEnv("SEED_SUPER_ADMIN_PASSWORD");

  console.log("1/4 Running database migrations...");
  execSync("npm run db:deploy", { stdio: "inherit" });

  console.log("\n2/4 Regenerating Prisma client...");
  execSync("npm run db:generate", { stdio: "inherit" });

  console.log("\n3/4 Seeding database...");
  execSync("npm run db:seed", { stdio: "inherit" });

  console.log("\n4/4 Setup complete!\n");
  console.log(
    "Super admin user id: SEED_SUPER_ADMIN_USER_ID / SEED_SUPER_ADMIN_EMAIL or majlis"
  );
  console.log("Password: value of SEED_SUPER_ADMIN_PASSWORD in .env.local\n");
  console.log("Start the app: npm run dev");
  console.log("Open: http://localhost:3000/login\n");
}

main().catch((err) => {
  console.error("\nSetup failed:", err.message ?? err);
  process.exit(1);
});
