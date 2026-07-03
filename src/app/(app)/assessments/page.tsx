import { getClassroomsForAssessment } from "@/actions/enrollments";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { ClassroomCardsGrid } from "@/components/shared/classroom-cards-grid";
import { filterClassroomsForSelectedSchool } from "@/lib/school/filter-classrooms";
import { getSelectedSchool } from "@/lib/school/resolve-school";

export const metadata = { title: "Assessments" };

export default async function AssessmentsPage() {
  await requirePermission("assessments:read");
  const user = await getSessionUser();
  const [classrooms, selectedSchool] = await Promise.all([
    getClassroomsForAssessment(),
    user ? getSelectedSchool(user) : null,
  ]);

  const visibleClassrooms = filterClassroomsForSelectedSchool(
    classrooms,
    selectedSchool
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Assessments</h1>
        <p className="text-muted-foreground">
          Enter quiz, midterm, and final exam scores by grade
          {selectedSchool ? ` · ${selectedSchool.name}` : ""}
        </p>
      </div>

      <ClassroomCardsGrid
        classrooms={visibleClassrooms.map((c) => ({
          id: c.id,
          name: c.name,
          _count: c._count,
        }))}
        hrefPrefix="/assessments"
        actionLabel="Enter Scores"
      />
    </div>
  );
}
