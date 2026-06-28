"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteTeacher,
  getTeacherById,
  getTeacherFormOptions,
  updateTeacher,
} from "@/actions/teachers";
import { TeacherForm } from "@/components/teachers/teacher-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PageProps = { params: Promise<{ id: string }> };

export default function EditTeacherPage({ params }: PageProps) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<Awaited<ReturnType<typeof getTeacherById>>>(null);
  const [options, setOptions] = useState<
    Awaited<ReturnType<typeof getTeacherFormOptions>> | null
  >(null);

  useEffect(() => {
    params.then(async ({ id: teacherId }) => {
      setId(teacherId);
      const teacherData = await getTeacherById(teacherId);
      setTeacher(teacherData);
      const formOptions = await getTeacherFormOptions(teacherData?.schoolId);
      setOptions(formOptions);
      setLoading(false);
    });
  }, [params]);

  async function handleSubmit(data: Parameters<typeof updateTeacher>[1]) {
    try {
      await updateTeacher(id, data);
      toast.success("Teacher updated");
      router.push(`/teachers/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
      throw error;
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this teacher?")) return;
    try {
      await deleteTeacher(id);
      toast.success("Teacher deleted");
      router.push("/teachers");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  if (loading || !teacher || !options) {
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
        <h1 className="text-2xl font-bold">Edit Teacher</h1>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          Delete
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {teacher.firstName} {teacher.lastName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherForm
            options={options}
            defaultValues={{
              schoolId: teacher.schoolId,
              gender: teacher.gender as "MALE" | "FEMALE",
              firstName: teacher.firstName,
              lastName: teacher.lastName,
              email: teacher.email,
              phone: teacher.phone ?? undefined,
              isActive: teacher.isActive,
              classroomIds: teacher.classrooms.map((c) => c.classroom.id),
            }}
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
            cancelHref={`/teachers/${id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
