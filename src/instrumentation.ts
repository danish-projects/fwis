/**
 * Load runtime secrets for shared hosting (SmarterASP / IIS).
 * Next standalone does not always pick up a `.env` next to server.js;
 * Git Auto Build also does not ship gitignored `.env.stage` / `.env.prod`.
 *
 * Node-only work lives in `./instrumentation-node` so Edge Runtime analysis
 * never sees `node:path` / `dotenv`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { loadHostingEnv } = await import("./instrumentation-node");
    await loadHostingEnv();
  } catch (error) {
    console.error(
      "[instrumentation] Failed to load .env:",
      error instanceof Error ? error.message : error
    );
  }
}
