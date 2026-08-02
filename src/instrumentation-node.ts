/**
 * Node-only: load runtime `.env` for shared hosting (SmarterASP / IIS).
 * Kept out of instrumentation.ts so Edge builds never see node:path / dotenv.
 */
export async function loadHostingEnv() {
  const { config } = await import("dotenv");
  const path = await import("node:path");
  const cwd = process.cwd();
  // Do not override vars already set in the host panel / web.config.
  config({ path: path.join(cwd, ".env"), override: false });
  config({ path: path.join(cwd, ".env.production"), override: false });
  config({ path: path.join(cwd, ".env.local"), override: false });

  // SmarterASP hosts often run in Pacific; FWIS school time is Central.
  // Set process TZ early so any remaining local-time APIs match SCHOOL_TIMEZONE.
  const schoolTz = process.env.SCHOOL_TIMEZONE?.trim() || "America/Chicago";
  if (!process.env.TZ) {
    process.env.TZ = schoolTz;
  }

  // Appears in logs/node-stdout.log when stdout logging is enabled.
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "info",
      message: "FWIS hosting env loaded",
      fields: {
        cwd,
        schoolTimezone: schoolTz,
        tz: process.env.TZ,
        nodeEnv: process.env.NODE_ENV,
      },
    })
  );
}
