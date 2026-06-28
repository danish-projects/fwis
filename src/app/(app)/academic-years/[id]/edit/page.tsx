"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteAcademicYear,
  getAcademicYearById,
  getAcademicYearFormOptions,
  updateAcademicYear,
} from "@/actions/academic-years";
import { AcademicYearForm } from "@/components/academic-years/academic-year-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PageProps = { params: Promise<{ id: string }> };

export default function EditAcademicYearPage({ params }: PageProps) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<Awaited<ReturnType<typeof getAcademicYearById>>>(null);
  const [options, setOptions] = useState<
    Awaited<ReturnType<typeof getAcademicYearFormOptions>> | null
  >(null);

  useEffect(() => {
    params.then(async ({ id: yearId }) => {
      setId(yearId);
      const [yearData, formOptions] = await Promise.all([
        getAcademicYearById(yearId),
        getAcademicYearFormOptions(),
      ]);
      setYear(yearData);
      setOptions(formOptions);
      setLoading(false);
    });
  }, [params]);

  async function handleSubmit(data: Parameters<typeof updateAcademicYear>[1]) {
    try {
      await updateAcademicYear(id, { ...data, generateCalendar: false });
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

  if (loading || !year || !options) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
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
            options={options}
            defaultValues={{
              schoolId: year.schoolId,
              name: year.name,
              startDate: year.startDate.toISOString(),
              endDate: year.endDate.toISOString(),
              isActive: year.isActive,
              generateCalendar: false,
            }}
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
            cancelHref={`/academic-years/${id}`}
            showGenerateCalendar={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
