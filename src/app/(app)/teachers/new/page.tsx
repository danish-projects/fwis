"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createTeacher, getTeacherFormOptions } from "@/actions/teachers";
import { TeacherForm } from "@/components/teachers/teacher-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewTeacherPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<
    Awaited<ReturnType<typeof getTeacherFormOptions>> | null
  >(null);

  useEffect(() => {
    getTeacherFormOptions().then((data) => {
      setOptions(data);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(data: Parameters<typeof createTeacher>[0]) {
    try {
      const teacher = await createTeacher(data);
      toast.success("Teacher created");
      router.push(`/teachers/${teacher.id}`);
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
        <h1 className="text-2xl font-bold">Add Teacher</h1>
        <p className="text-muted-foreground">Create a teacher and assign grades</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Teacher Details</CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherForm
            options={options}
            defaultValues={{ schoolId: options.defaultSchoolId ?? undefined }}
            onSubmit={handleSubmit}
            submitLabel="Create Teacher"
            cancelHref="/teachers"
          />
        </CardContent>
      </Card>
    </div>
  );
}
