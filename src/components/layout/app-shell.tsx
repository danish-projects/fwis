"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AcademicYearCookieSync } from "@/components/layout/academic-year-cookie-sync";
import { TeacherRouteGuard } from "@/components/layout/teacher-route-guard";
import type { NavGroup } from "@/lib/auth/permissions";
import type { AcademicYearSummary } from "@/lib/academic-year/constants";

type AppShellProps = {
  children: React.ReactNode;
  navGroups: NavGroup[];
  userName: string;
  userEmail: string;
  academicYears: AcademicYearSummary[];
  selectedAcademicYearId: string | null;
  sidebarSchoolName?: string | null;
  isTeacher?: boolean;
};

export function AppShell({
  children,
  navGroups,
  userName,
  userEmail,
  academicYears,
  selectedAcademicYearId,
  sidebarSchoolName = null,
  isTeacher = false,
}: AppShellProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AcademicYearCookieSync yearId={selectedAcademicYearId} />
      <AppSidebar
        navGroups={navGroups}
        userName={userName}
        userEmail={userEmail}
        academicYears={academicYears}
        selectedAcademicYearId={selectedAcademicYearId}
        sidebarSchoolName={sidebarSchoolName}
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
