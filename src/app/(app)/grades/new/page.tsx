"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createGradeRecord, getGradeRecordFormOptions } from "@/actions/grades";
import { GradeForm } from "@/components/grades/grade-form";
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

  async function handleSubmit(data: Parameters<typeof createGradeRecord>[0]) {
    try {
      const record = await createGradeRecord(data);
      toast.success("Grade created");
      router.push(`/grades/${record.id}`);
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
        <h1 className="text-2xl font-bold">Add Grade</h1>
        <p className="text-muted-foreground">Create a grade level for a school</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Grade Details</CardTitle>
        </CardHeader>
        <CardContent>
          <GradeForm
            options={options}
            onSubmit={handleSubmit}
            submitLabel="Create Grade"
            cancelHref="/grades"
          />
        </CardContent>
      </Card>
    </div>
  );
}
