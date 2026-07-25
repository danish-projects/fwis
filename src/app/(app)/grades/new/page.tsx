"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createGradeRecordsBulk,
  getGradeRecordFormOptions,
} from "@/actions/grades";
import { GradeBulkAddForm } from "@/components/grades/grade-bulk-add-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewGradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<
    Awaited<ReturnType<typeof getGradeRecordFormOptions>> | null
  >(null);

  useEffect(() => {
    getGradeRecordFormOptions().then((data) => {
      setOptions(data);
      setLoading(false);
    });
  }, []);

  async function handleSchoolChange(schoolId: string) {
    return getGradeRecordFormOptions(schoolId);
  }

  async function handleSubmit(
    data: Parameters<typeof createGradeRecordsBulk>[0]
  ) {
    try {
      const result = await createGradeRecordsBulk(data);
      if (result.created.length === 0) {
        toast.message("No new grades created", {
          description:
            result.skipped.length > 0
              ? "Selected grades were already linked to this school."
              : undefined,
        });
        return;
      }

      const skippedNote =
        result.skipped.length > 0
          ? ` (skipped ${result.skipped.length} already linked)`
          : "";
      toast.success(
        `Created ${result.created.length} grade${result.created.length === 1 ? "" : "s"}${skippedNote}`
      );

      if (result.created.length === 1) {
        router.push(`/grades/${result.created[0].id}`);
      } else {
        router.push("/grades");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create");
      throw error;
    }
  }

  if (loading || !options) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add Grades</h1>
        <p className="text-muted-foreground">
          Choose which grade levels and sections this school offers
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Grade levels</CardTitle>
        </CardHeader>
        <CardContent>
          <GradeBulkAddForm
            options={options}
            onSchoolChange={handleSchoolChange}
            onSubmit={handleSubmit}
            cancelHref="/grades"
          />
        </CardContent>
      </Card>
    </div>
  );
}
