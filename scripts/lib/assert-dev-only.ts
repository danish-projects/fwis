/**
 * Blocks demo/setup scripts from running on hosted production unless explicitly allowed.
 */
export function assertDevOnlyScript(scriptName: string): void {
  const allowDemoSeed = process.env.ALLOW_DEMO_SEED === "true";
  const isHosted =
    process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  if (isHosted && !allowDemoSeed) {
    throw new Error(
      `${scriptName} cannot run in production. Demo credentials must not be seeded on live environments. Set ALLOW_DEMO_SEED=true only for intentional staging resets.`
    );
  }
}
