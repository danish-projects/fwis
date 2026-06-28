export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** True when the public app URL is configured for HTTPS (production). */
export function isHttpsAppUrl(): boolean {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  return Boolean(url?.startsWith("https://"));
}
