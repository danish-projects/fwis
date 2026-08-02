import { getNavGroupsForUser, getPrimaryRole } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { canSwitchAcademicYear } from "@/lib/academic-year/can-switch-year";
import { listAcademicYearsForUser } from "@/lib/academic-year/list-years";
import { getSelectedAcademicYear } from "@/lib/academic-year/resolve-year";
import { listSchoolsForUser } from "@/lib/school/list-schools";
import { getSelectedSchool } from "@/lib/school/resolve-school";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const primaryRole = getPrimaryRole(user.roles);
  const isTeacher = primaryRole === "TEACHER" || primaryRole === "SUBSTITUTE";
  const allowYearSwitch = canSwitchAcademicYear(user.roles);
  const navGroups = getNavGroupsForUser(user.roles);
  const [academicYears, selectedAcademicYear, schools, selectedSchool] =
    await Promise.all([
      listAcademicYearsForUser(user),
      getSelectedAcademicYear(user),
      listSchoolsForUser(user),
      getSelectedSchool(user),
    ]);

  const yearsForSidebar =
    allowYearSwitch || !selectedAcademicYear
      ? academicYears
      : academicYears.filter((y) => y.id === selectedAcademicYear.id);

  return (
    <AppShell
      navGroups={navGroups}
      userName={user.staffFullName ?? user.fullName ?? user.userId}
      userEmail={user.userId}
      academicYears={yearsForSidebar}
      selectedAcademicYearId={selectedAcademicYear?.id ?? null}
      canSwitchAcademicYear={allowYearSwitch}
      schools={schools}
      selectedSchoolId={selectedSchool?.id ?? null}
      isTeacher={isTeacher}
    >
      {children}
    </AppShell>
  );
}
