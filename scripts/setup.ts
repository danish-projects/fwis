/**
 * FWIS one-command setup after .env.local is configured.
 * Usage: npm run setup
 */
import { config } from "dotenv";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { DEMO_AUTH_USERS } from "./demo-users";
import { assertDevOnlyScript } from "./lib/assert-dev-only";

config({ path: ".env.local" });
config({ path: ".env" });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.includes("[YOUR-PASSWORD]") || value.includes("[") || value.includes("your-")) {
    throw new Error(`Missing or placeholder env: ${name}. Configure .env.local first.`);
  }
  return value;
}

async function ensureSupabaseAuthUser(
  supabase: ReturnType<typeof createClient>,
  demo: (typeof DEMO_AUTH_USERS)[number]
) {
  const { data: existing, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const found =
    existing?.users?.find((u) => u.id === demo.id) ??
    existing?.users?.find((u) => u.email?.toLowerCase() === demo.email.toLowerCase());

  if (found) {
    const { error } = await supabase.auth.admin.updateUserById(found.id, {
      email: demo.email,
      password: demo.password,
      email_confirm: true,
      user_metadata: { full_name: demo.fullName },
    });
    if (error) throw error;
    console.log(`   Updated auth user: ${demo.email}`);
    return;
  }

  const { error } = await supabase.auth.admin.createUser({
    id: demo.id,
    email: demo.email,
    password: demo.password,
    email_confirm: true,
    user_metadata: { full_name: demo.fullName },
  });
  if (error) throw error;
  console.log(`   Created auth user: ${demo.email}`);
}

async function main() {
  assertDevOnlyScript("npm run setup");
  console.log("FWIS Setup\n==========\n");

  requireEnv("DATABASE_URL");
  requireEnv("DIRECT_URL");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  console.log("1/5 Running database migrations...");
  execSync("npm run db:deploy", { stdio: "inherit" });

  console.log("\n2/5 Regenerating Prisma client...");
  execSync("npm run db:generate", { stdio: "inherit" });

  console.log("\n3/5 Seeding database...");
  execSync("npm run db:seed", { stdio: "inherit" });

  console.log("\n4/5 Creating Supabase Auth users...");
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const demo of DEMO_AUTH_USERS) {
    await ensureSupabaseAuthUser(supabase, demo);
  }

  console.log("\n5/5 Setup complete!\n");
  console.log("Demo login credentials are defined in scripts/demo-users.ts (local dev only).\n");
  console.log("Start the app: npm run dev");
  console.log("Open: http://localhost:3000/login\n");
}

main().catch((err) => {
  console.error("\nSetup failed:", err.message ?? err);
  process.exit(1);
});
