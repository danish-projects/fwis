import { getNavGroupsForUser, getPrimaryRole } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
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

  const isTeacher = getPrimaryRole(user.roles) === "TEACHER";
  const navGroups = getNavGroupsForUser(user.roles);
  const [academicYears, selectedAcademicYear, schools, selectedSchool] =
    await Promise.all([
      listAcademicYearsForUser(user),
      getSelectedAcademicYear(user),
      listSchoolsForUser(user),
      getSelectedSchool(user),
    ]);

  return (
    <AppShell
      navGroups={navGroups}
      userName={user.fullName ?? user.email}
      userEmail={user.email}
      academicYears={academicYears}
      selectedAcademicYearId={selectedAcademicYear?.id ?? null}
      schools={schools}
      selectedSchoolId={selectedSchool?.id ?? null}
      isTeacher={isTeacher}
    >
      {children}
    </AppShell>
  );
}
