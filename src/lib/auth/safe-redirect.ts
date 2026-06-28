const DEFAULT_PATH = "/dashboard";

/** Allow only same-origin relative paths (blocks open redirects). */
export function getSafeRedirectPath(
  input: string | null | undefined,
  fallback: string = DEFAULT_PATH
): string {
  if (!input) return fallback;

  const trimmed = input.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }
  if (trimmed.includes("://") || trimmed.includes("\\")) {
    return fallback;
  }

  return trimmed;
}
