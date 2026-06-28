"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteGradeRecord,
  getGradeRecordById,
  getGradeRecordFormOptions,
  updateGradeRecord,
} from "@/actions/grades";
import { GradeForm } from "@/components/grades/grade-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PageProps = { params: Promise<{ id: string }> };

export default function EditGradePage({ params }: PageProps) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(true);
  const [grade, setGrade] = useState<Awaited<ReturnType<typeof getGradeRecordById>>>(null);
  const [options, setOptions] = useState<
    Awaited<ReturnType<typeof getGradeRecordFormOptions>> | null
  >(null);

  useEffect(() => {
    params.then(async ({ id: gradeId }) => {
      setId(gradeId);
      const gradeData = await getGradeRecordById(gradeId);
      setGrade(gradeData);
      const formOptions = await getGradeRecordFormOptions(gradeData?.schoolId);
      setOptions(formOptions);
      setLoading(false);
    });
  }, [params]);

  async function handleSubmit(data: Parameters<typeof updateGradeRecord>[1]) {
    try {
      await updateGradeRecord(id, data);
      toast.success("Grade updated");
      router.push(`/grades/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
      throw error;
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this grade?")) return;
    try {
      await deleteGradeRecord(id);
      toast.success("Grade deleted");
      router.push("/grades");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  if (loading || !grade || !options) {
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
        <h1 className="text-2xl font-bold">Edit Grade</h1>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          Delete
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{grade.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <GradeForm
            options={options}
            defaultValues={{
              schoolId: grade.schoolId,
              gradeId: grade.gradeId,
              sectionId: grade.sectionId,
              name: grade.name,
              isActive: grade.isActive,
            }}
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
            cancelHref={`/grades/${id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
