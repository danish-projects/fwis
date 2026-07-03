import type { NextRequest } from "next/server";

function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  return value.split(",")[0]?.trim() ?? null;
}

export function isInternalHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "[::1]"
  );
}

function configuredAppOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/** Public hostname as seen by the browser (IIS/httpPlatformHandler safe). */
export function getPublicHost(request: NextRequest | Request): string {
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  if (forwardedHost) return forwardedHost;

  const host = firstHeaderValue(request.headers.get("host"));
  if (host) {
    const hostname = host.split(":")[0] ?? host;
    if (!isInternalHost(hostname)) return host;
  }

  const configured = configuredAppOrigin();
  if (configured) return new URL(configured).host;

  return host ?? "localhost";
}

/** Public origin (scheme + host) for redirects behind reverse proxies. */
export function getPublicOrigin(request: NextRequest | Request): string {
  const configured = configuredAppOrigin();
  const host = getPublicHost(request);
  const hostname = host.split(":")[0] ?? host;

  if (isInternalHost(hostname) && configured) {
    return configured;
  }

  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  if (forwardedProto === "http" || forwardedProto === "https") {
    return `${forwardedProto}://${host}`;
  }

  if (configured) {
    const scheme = new URL(configured).protocol.replace(":", "");
    return `${scheme}://${host}`;
  }

  return `http://${host}`;
}

export function publicUrl(
  request: NextRequest | Request,
  pathname: string,
  search = ""
): URL {
  const url = new URL(pathname + search, getPublicOrigin(request));
  return url;
}
