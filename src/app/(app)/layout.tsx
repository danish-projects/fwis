import { getNavGroupsForUser, getPrimaryRole } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { listAcademicYearsForUser } from "@/lib/academic-year/list-years";
import { getSelectedAcademicYear } from "@/lib/academic-year/resolve-year";
import { getSidebarSchoolName } from "@/lib/school/sidebar-school";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isTeacher = getPrimaryRole(user.roles) === "TEACHER";
  const navGroups = getNavGroupsForUser(user.roles);
  const [academicYears, selectedAcademicYear, sidebarSchoolName] = await Promise.all([
    listAcademicYearsForUser(user),
    getSelectedAcademicYear(user),
    getSidebarSchoolName(user),
  ]);

  return (
    <AppShell
      navGroups={navGroups}
      userName={user.fullName ?? user.email}
      userEmail={user.email}
      academicYears={academicYears}
      selectedAcademicYearId={selectedAcademicYear?.id ?? null}
      sidebarSchoolName={sidebarSchoolName}
      isTeacher={isTeacher}
    >
      {children}
    </AppShell>
  );
}

