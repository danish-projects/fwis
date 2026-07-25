"use client";

import { useRouter } from "next/navigation";
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
      />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
          <TeacherRouteGuard isTeacher={isTeacher}>{children}</TeacherRouteGuard>
        </div>
      </main>
    </div>
  );
}
