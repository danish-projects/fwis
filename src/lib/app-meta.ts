/**
 * App branding / release metadata for UI (sidebar, etc.).
 * Version is baked at build from package.json via next.config.ts.
 * Env label comes from NEXT_PUBLIC_APP_ENV (stage | prod | local).
 */

export const APP_PRODUCT_NAME = "FWIS Portal";

export function getAppVersion(): string {
  return (
    process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
    process.env.npm_package_version?.trim() ||
    "0.0.0"
  );
}

/** Normalized env label for display: local | stage | prod */
export function getAppEnvLabel(): string {
  const raw = (
    process.env.NEXT_PUBLIC_APP_ENV ||
    process.env.APP_ENV ||
    ""
  )
    .trim()
    .toLowerCase();

  if (raw === "stage" || raw === "staging") return "stage";
  if (raw === "prod" || raw === "production") return "prod";
  if (raw === "local" || raw === "development" || raw === "dev") return "local";

  // Legacy hosting files used NODE_ENV=stage
  if (process.env.NODE_ENV === "stage" || process.env.NODE_ENV === "staging") {
    return "stage";
  }
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "local"
  ) {
    return "local";
  }
  // Production builds without an explicit env → treat as prod
  if (process.env.NODE_ENV === "production") return "prod";

  return raw || "local";
}

/** e.g. "stage · v0.1.2" or "v0.1.2" for local */
export function formatAppVersionLine(options?: {
  version?: string;
  env?: string;
  /** When true, always include env (default: hide "local"). */
  alwaysShowEnv?: boolean;
}): string {
  const version = options?.version ?? getAppVersion();
  const env = options?.env ?? getAppEnvLabel();
  const showEnv = options?.alwaysShowEnv || env !== "local";
  return showEnv ? `${env} · v${version}` : `v${version}`;
}
