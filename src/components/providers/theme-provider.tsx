"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getInitialResolvedTheme,
  parseThemeSetting,
  THEME_STORAGE_KEY,
  type ThemeSetting,
} from "@/lib/theme/theme";

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeSetting;
  resolvedTheme: ResolvedTheme;
  /** False until client theme is synced (avoids hydration mismatch for system theme). */
  mounted: boolean;
  setTheme: (theme: ThemeSetting) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: ThemeSetting): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(theme: ThemeSetting) {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resolved);
  return resolved;
}

function persistTheme(theme: ThemeSetting) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function readStoredTheme(): ThemeSetting {
  if (typeof window === "undefined") return "system";
  return parseThemeSetting(localStorage.getItem(THEME_STORAGE_KEY));
}

type ThemeProviderProps = {
  children: ReactNode;
  /** Theme from the server cookie so SSR matches the first client render. */
  initialTheme?: ThemeSetting;
};

export function ThemeProvider({
  children,
  initialTheme = "system",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeSetting>(initialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    getInitialResolvedTheme(initialTheme)
  );
  // Always false on first render so SSR HTML matches client hydration.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    setResolvedTheme(applyTheme(stored));
    persistTheme(stored);
    setMounted(true);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (theme === "system") {
        setResolvedTheme(applyTheme("system"));
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemeSetting) => {
    setThemeState(next);
    persistTheme(next);
    setResolvedTheme(applyTheme(next));
    setMounted(true);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, mounted, setTheme }),
    [theme, resolvedTheme, mounted, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
