"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AcademicYearCookieSync } from "@/components/layout/academic-year-cookie-sync";
import { SchoolCookieSync } from "@/components/layout/school-cookie-sync";
import { TeacherRouteGuard } from "@/components/layout/teacher-route-guard";
import type { NavGroup } from "@/lib/auth/permissions";
import type { AcademicYearSummary } from "@/lib/academic-year/constants";
import type { SchoolSummary } from "@/lib/school/constants";

type AppShellProps = {
  children: React.ReactNode;
  navGroups: NavGroup[];
  userName: string;
  userEmail: string;
  academicYears: AcademicYearSummary[];
  selectedAcademicYearId: string | null;
  canSwitchAcademicYear?: boolean;
  schools: SchoolSummary[];
  selectedSchoolId: string | null;
  isTeacher?: boolean;
};

export function AppShell({
  children,
  navGroups,
  userName,
  userEmail,
  academicYears,
  selectedAcademicYearId,
  canSwitchAcademicYear = true,
  schools,
  selectedSchoolId,
  isTeacher = false,
}: AppShellProps) {
  const router = useRouter();
  const [schoolPending, setSchoolPending] = useState(false);

  async function handleSignOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AcademicYearCookieSync yearId={selectedAcademicYearId} />
      <SchoolCookieSync schoolId={selectedSchoolId} />
      <AppSidebar
        navGroups={navGroups}
        userName={userName}
        userEmail={userEmail}
        academicYears={academicYears}
        selectedAcademicYearId={selectedAcademicYearId}
        canSwitchAcademicYear={canSwitchAcademicYear}
        schools={schools}
        selectedSchoolId={selectedSchoolId}
        onSignOut={handleSignOut}
        onSchoolPendingChange={setSchoolPending}
      />
      <main className="relative flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
          <TeacherRouteGuard isTeacher={isTeacher}>{children}</TeacherRouteGuard>
        </div>
        {schoolPending && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 backdrop-blur-[1px]"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="flex flex-col items-center gap-2 text-primary">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
              <span className="text-sm font-medium">Updating school…</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
