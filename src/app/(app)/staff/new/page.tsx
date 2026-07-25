"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createStaff, getStaffFormOptions } from "@/actions/staff";
import { StaffForm } from "@/components/staff/staff-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewStaffPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<
    Awaited<ReturnType<typeof getStaffFormOptions>> | null
  >(null);

  useEffect(() => {
    getStaffFormOptions().then((data) => {
      setOptions(data);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(data: Parameters<typeof createStaff>[0]) {
    try {
      const staff = await createStaff(data);
      toast.success("Staff member created");
      router.push(`/staff/${staff.id}`);
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
        <h1 className="text-2xl font-bold">Add Staff</h1>
        <p className="text-muted-foreground">Create a staff member and assign grades</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Staff Details</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffForm
            options={options}
            defaultValues={{ schoolId: options.defaultSchoolId ?? undefined }}
            onSubmit={handleSubmit}
            submitLabel="Create Staff"
            cancelHref="/staff"
          />
        </CardContent>
      </Card>
    </div>
  );
}
