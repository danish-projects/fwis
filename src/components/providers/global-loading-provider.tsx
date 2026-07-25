"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SHOW_DELAY_MS = 180;

type GlobalLoadingContextValue = {
  /** Manually show loading (e.g. client-side async work). */
  startLoading: () => void;
  stopLoading: () => void;
  runWithLoading: <T>(fn: () => Promise<T>) => Promise<T>;
};

const GlobalLoadingContext = createContext<GlobalLoadingContextValue | null>(
  null
);

function isSameOriginUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return url.startsWith("/");
  }
}

function getRequestMeta(input: RequestInfo | URL, init?: RequestInit) {
  if (input instanceof Request) {
    return { url: input.url, headers: input.headers };
  }

  const url = input instanceof URL ? input.href : input;
  return { url, headers: new Headers(init?.headers) };
}

function classifyFetch(input: RequestInfo | URL, init?: RequestInit) {
  const { url, headers } = getRequestMeta(input, init);
  if (!isSameOriginUrl(url)) return null;

  if (headers.get("Next-Action")) return "action" as const;
  if (
    headers.get("RSC") === "1" ||
    headers.get("Next-Router-State-Tree") ||
    headers.get("Next-Url")
  ) {
    return "navigation" as const;
  }

  return null;
}

function GlobalLoadingIndicator({
  showNavigation,
  showAction,
}: {
  showNavigation: boolean;
  showAction: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!showNavigation && !showAction) {
      setVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [showNavigation, showAction]);

  if (!visible) return null;

  return (
    <>
      {showNavigation && (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-1 overflow-hidden bg-primary/15"
          role="status"
          aria-label="Loading page"
        >
          <div className="global-loading-bar h-full w-1/3 bg-primary" />
        </div>
      )}

      {showAction && (
        <div
          className="fixed inset-0 z-[199] flex items-center justify-center bg-background/45 backdrop-blur-[1px]"
          role="status"
          aria-live="polite"
          aria-label="Loading"
        >
          <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
            <span className="text-sm font-medium">Loading…</span>
          </div>
        </div>
      )}

      {showNavigation && !showAction && (
        <div
          className={cn(
            "pointer-events-none fixed right-4 top-3 z-[200] flex items-center gap-2 rounded-full border",
            "bg-background/95 px-3 py-1.5 shadow-sm"
          )}
          aria-hidden
        >
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Loading…</span>
        </div>
      )}
    </>
  );
}

function GlobalLoadingInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navCount, setNavCount] = useState(0);
  const [actionCount, setActionCount] = useState(0);
  const fetchPatchedRef = useRef(false);

  const startNav = useCallback(() => {
    setNavCount((count) => count + 1);
  }, []);

  const stopNav = useCallback(() => {
    setNavCount((count) => Math.max(0, count - 1));
  }, []);

  const startLoading = useCallback(() => {
    setActionCount((count) => count + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setActionCount((count) => Math.max(0, count - 1));
  }, []);

  const runWithLoading = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      startLoading();
      try {
        return await fn();
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  useEffect(() => {
    setNavCount(0);
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("blob:") ||
        href.startsWith("data:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }
      // File downloads (incl. programmatic blob saves) are not page navigations.
      if (anchor.hasAttribute("download")) return;
      if (anchor.target === "_blank") return;
      if (href.startsWith("http") && !isSameOriginUrl(href)) return;

      const nextPath = href.split("#")[0];
      const currentPath = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;
      if (nextPath === currentPath) return;

      startNav();
    }

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [pathname, searchParams, startNav]);

  useEffect(() => {
    if (fetchPatchedRef.current) return;
    fetchPatchedRef.current = true;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      const kind = classifyFetch(input, init);

      if (kind === "navigation") startNav();
      if (kind === "action") startLoading();

      try {
        return await originalFetch(input, init);
      } finally {
        if (kind === "navigation") stopNav();
        if (kind === "action") stopLoading();
      }
    };

    return () => {
      window.fetch = originalFetch;
      fetchPatchedRef.current = false;
    };
  }, [startNav, stopNav, startLoading, stopLoading]);

  const value: GlobalLoadingContextValue = {
    startLoading,
    stopLoading,
    runWithLoading,
  };

  return (
    <GlobalLoadingContext.Provider value={value}>
      <GlobalLoadingIndicator
        showNavigation={navCount > 0}
        showAction={actionCount > 0}
      />
      {children}
    </GlobalLoadingContext.Provider>
  );
}

export function GlobalLoadingProvider({ children }: { children: ReactNode }) {
  return <GlobalLoadingInner>{children}</GlobalLoadingInner>;
}

export function useGlobalLoading() {
  const context = useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error("useGlobalLoading must be used within GlobalLoadingProvider");
  }
  return context;
}

/** Optional helper when automatic fetch detection is not enough. */
export function useRunWithGlobalLoading() {
  return useGlobalLoading().runWithLoading;
}
