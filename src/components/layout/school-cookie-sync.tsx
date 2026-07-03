"use client";

import { useEffect, useRef } from "react";
import { ensureSchoolCookie } from "@/actions/school-selection";

type SchoolCookieSyncProps = {
  schoolId: string | null;
};

/** Persists the default school via a Server Action (cookies cannot be set in layouts). */
export function SchoolCookieSync({ schoolId }: SchoolCookieSyncProps) {
  const synced = useRef(false);

  useEffect(() => {
    if (!schoolId || synced.current) return;
    synced.current = true;
    void ensureSchoolCookie(schoolId);
  }, [schoolId]);

  return null;
}
