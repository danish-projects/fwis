import Link from "next/link";
import { getClassroomsForAttendance } from "@/actions/attendance";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { ClassroomCardsGrid } from "@/components/shared/classroom-cards-grid";
import { Button } from "@/components/ui/button";
import { filterClassroomsForSelectedSchool } from "@/lib/school/filter-classrooms";
import { getSelectedSchool } from "@/lib/school/resolve-school";

export const metadata = { title: "Attendance" };

export default async function AttendancePage() {
  await requirePermission("attendance:read");
  const user = await getSessionUser();
  const [classrooms, selectedSchool] = await Promise.all([
    getClassroomsForAttendance(),
    user ? getSelectedSchool(user) : null,
  ]);

  const visibleClassrooms = filterClassroomsForSelectedSchool(
    classrooms,
    selectedSchool
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Attendance</h1>
          <p className="text-muted-foreground">
            Mark Sunday attendance by grade or review an entire grade level
            {selectedSchool ? ` · ${selectedSchool.name}` : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/attendance/summary">Grade summary view</Link>
        </Button>
      </div>

      <ClassroomCardsGrid
        classrooms={visibleClassrooms.map((c) => ({
          id: c.id,
          name: c.name,
          _count: c._count,
        }))}
        hrefPrefix="/attendance"
        actionLabel="Take Attendance"
      />
    </div>
  );
}
