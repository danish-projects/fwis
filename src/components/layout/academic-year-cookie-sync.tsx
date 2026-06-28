"use client";

import { useEffect, useRef } from "react";
import { ensureAcademicYearCookie } from "@/actions/academic-year";

type AcademicYearCookieSyncProps = {
  yearId: string | null;
};

/** Persists the default academic year via a Server Action (cookies cannot be set in layouts). */
export function AcademicYearCookieSync({ yearId }: AcademicYearCookieSyncProps) {
  const synced = useRef(false);

  useEffect(() => {
    if (!yearId || synced.current) return;
    synced.current = true;
    void ensureAcademicYearCookie(yearId);
  }, [yearId]);

  return null;
}
