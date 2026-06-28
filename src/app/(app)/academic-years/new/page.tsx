"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createAcademicYear,
  getAcademicYearFormOptions,
} from "@/actions/academic-years";
import { AcademicYearForm } from "@/components/academic-years/academic-year-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewAcademicYearPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<
    Awaited<ReturnType<typeof getAcademicYearFormOptions>> | null
  >(null);

  useEffect(() => {
    getAcademicYearFormOptions().then((data) => {
      setOptions(data);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(
    data: Parameters<typeof createAcademicYear>[0]
  ) {
    try {
      const { year, calendarResult } = await createAcademicYear(data);
      toast.success(
        calendarResult.created
          ? `Academic year created with ${calendarResult.created} calendar days`
          : "Academic year created"
      );
      router.push(`/academic-years/${year.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create");
      throw error;
    }
  }

  if (loading || !options) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Academic Year</h1>
        <p className="text-muted-foreground">Create a year and optionally generate Sundays</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Year Details</CardTitle>
        </CardHeader>
        <CardContent>
          <AcademicYearForm
            options={options}
            onSubmit={handleSubmit}
            submitLabel="Create Academic Year"
            cancelHref="/academic-years"
          />
        </CardContent>
      </Card>
    </div>
  );
}
