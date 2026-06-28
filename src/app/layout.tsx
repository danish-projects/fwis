import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { GlobalLoadingProvider } from "@/components/providers/global-loading-provider";
import { AppToaster } from "@/components/providers/app-toaster";
import {
  getThemeHtmlClass,
  parseThemeSetting,
  THEME_STORAGE_KEY,
} from "@/lib/theme/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FWIS | Faizan Weekend Islamic School",
    template: "%s | FWIS",
  },
  description:
    "Faizan Weekend Islamic School Management System — multi-school administration for attendance, academics, and reporting.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeCookie = (await cookies()).get(THEME_STORAGE_KEY)?.value;
  const themeSetting = parseThemeSetting(themeCookie);
  const themeClass = getThemeHtmlClass(themeSetting);

  return (
    <html lang="en" className={themeClass} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <ThemeProvider initialTheme={themeSetting}>
          <Suspense fallback={null}>
            <GlobalLoadingProvider>{children}</GlobalLoadingProvider>
          </Suspense>
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
