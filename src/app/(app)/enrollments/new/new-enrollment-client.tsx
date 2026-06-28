"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createEnrollment } from "@/actions/enrollments";
import { EnrollmentForm } from "@/components/enrollments/enrollment-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  options: Awaited<ReturnType<typeof import("@/actions/enrollments").getEnrollmentFormOptions>>;
  preferredStudentId?: string;
};

export function NewEnrollmentClient({ options, preferredStudentId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Enrollment</h1>
        <p className="text-muted-foreground">
          Enroll a student for an academic year and grade
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Enrollment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <fieldset disabled={loading}>
            <EnrollmentForm
              options={options}
              preferredStudentId={preferredStudentId}
              submitLabel={loading ? "Creating..." : "Create Enrollment"}
              cancelHref="/enrollments"
              onSubmit={async (data) => {
                setLoading(true);
                try {
                  const enrollment = await createEnrollment(data);
                  toast.success("Enrollment created");
                  router.push(`/enrollments/${enrollment.id}`);
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Failed to create"
                  );
                  setLoading(false);
                }
              }}
            />
          </fieldset>
        </CardContent>
      </Card>
    </div>
  );
}
