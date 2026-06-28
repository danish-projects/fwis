"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isTeacherRouteAllowed } from "@/lib/auth/teacher-routes";

type TeacherRouteGuardProps = {
  isTeacher: boolean;
  children: React.ReactNode;
};

export function TeacherRouteGuard({ isTeacher, children }: TeacherRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isTeacher) return;
    if (isTeacherRouteAllowed(pathname)) return;
    router.replace("/dashboard/teacher");
  }, [isTeacher, pathname, router]);

  if (isTeacher && !isTeacherRouteAllowed(pathname)) {
    return null;
  }

  return children;
}
