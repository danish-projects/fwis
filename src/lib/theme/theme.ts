export const THEME_STORAGE_KEY = "theme";

export type ThemeSetting = "light" | "dark" | "system";

export function parseThemeSetting(value: string | undefined | null): ThemeSetting {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

/** Class applied on `<html>` for explicit light/dark; system uses client + CSS media query. */
export function getThemeHtmlClass(theme: ThemeSetting): "light" | "dark" | undefined {
  if (theme === "light" || theme === "dark") {
    return theme;
  }
  return undefined;
}

/** SSR-safe resolved theme when the stored setting is explicit light/dark. */
export function getInitialResolvedTheme(theme: ThemeSetting): "light" | "dark" {
  if (theme === "light" || theme === "dark") {
    return theme;
  }
  return "light";
}
