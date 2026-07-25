"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteAcademicYear,
  updateAcademicYear,
} from "@/actions/academic-years";
import { AcademicYearForm } from "@/components/academic-years/academic-year-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AcademicYearRecord = NonNullable<
  Awaited<ReturnType<typeof import("@/actions/academic-years").getAcademicYearById>>
>;

type FormOptions = Awaited<
  ReturnType<typeof import("@/actions/academic-years").getAcademicYearFormOptions>
>;

function toDateInputValue(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

type EditAcademicYearClientProps = {
  id: string;
  year: AcademicYearRecord;
  options: FormOptions;
};

export function EditAcademicYearClient({
  id,
  year,
  options,
}: EditAcademicYearClientProps) {
  const router = useRouter();

  async function handleSubmit(data: Parameters<typeof updateAcademicYear>[1]) {
    const visibleSchoolIds = new Set(options.schools.map((s) => s.id));
    const hiddenLinked = year.linkedSchoolIds.filter((id) => !visibleSchoolIds.has(id));
    const schoolIds = [...new Set([...data.schoolIds, ...hiddenLinked])];

    try {
      await updateAcademicYear(id, { ...data, schoolIds, generateCalendar: false });
      toast.success("Academic year updated");
      router.push(`/academic-years/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
      throw error;
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this academic year? This cannot be undone if enrollments exist.")) {
      return;
    }
    try {
      await deleteAcademicYear(id);
      toast.success("Academic year deleted");
      router.push("/academic-years");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Academic Year</h1>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          Delete
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{year.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <AcademicYearForm
            mode="edit"
            options={options}
            defaultValues={{
              linkedSchoolIds: year.linkedSchoolIds,
              name: year.name,
              startDate: toDateInputValue(year.startDate),
              endDate: toDateInputValue(year.endDate),
              isActive: year.schoolLinks.some((link) => link.isActive),
            }}
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
            cancelHref={`/academic-years/${id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
