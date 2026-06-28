"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ConsolidateAttendancePageLayoutProps = {
  title: string;
  description: string;
  backLink: ReactNode;
  children: ReactNode;
};

/** Full-viewport layout — only the matrix table scrolls, not the page. */
export function ConsolidateAttendancePageLayout({
  title,
  description,
  backLink,
  children,
}: ConsolidateAttendancePageLayoutProps) {
  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <div
      className={cn(
        "-m-4 flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden p-4",
        "md:-m-6 md:p-6",
        "lg:-m-8 lg:h-dvh lg:p-8"
      )}
    >
      <header className="shrink-0 space-y-0.5 pb-3">
        {backLink}
        <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
