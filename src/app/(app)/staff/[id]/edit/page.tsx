"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteStaff,
  getStaffById,
  getStaffFormOptions,
  updateStaff,
} from "@/actions/staff";
import { StaffForm } from "@/components/staff/staff-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PageProps = { params: Promise<{ id: string }> };

export default function EditStaffPage({ params }: PageProps) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Awaited<ReturnType<typeof getStaffById>>>(null);
  const [options, setOptions] = useState<
    Awaited<ReturnType<typeof getStaffFormOptions>> | null
  >(null);

  useEffect(() => {
    params.then(async ({ id: staffId }) => {
      setId(staffId);
      const staffData = await getStaffById(staffId);
      setStaff(staffData);
      const formOptions = await getStaffFormOptions(staffData?.schoolId);
      setOptions(formOptions);
      setLoading(false);
    });
  }, [params]);

  async function handleSubmit(data: Parameters<typeof updateStaff>[1]) {
    try {
      await updateStaff(id, data);
      toast.success("Staff member updated");
      router.push(`/staff/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
      throw error;
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this staff member?")) return;
    try {
      await deleteStaff(id);
      toast.success("Staff member deleted");
      router.push("/staff");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  if (loading || !staff || !options) {
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
        <h1 className="text-2xl font-bold">Edit Staff</h1>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          Delete
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {staff.firstName} {staff.lastName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StaffForm
            options={options}
            defaultValues={{
              schoolId: staff.schoolId,
              gender: staff.gender as "MALE" | "FEMALE",
              roleId: staff.roleId ?? undefined,
              firstName: staff.firstName,
              lastName: staff.lastName,
              email: staff.email,
              phone: staff.phone ?? undefined,
              isActive: staff.isActive,
              classroomIds: staff.classrooms.map((c) => c.classroom.id),
            }}
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
            cancelHref={`/staff/${id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
