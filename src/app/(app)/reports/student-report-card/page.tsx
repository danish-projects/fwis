import { ModulePlaceholder } from "@/components/modules/module-placeholder";
import { requirePermission } from "@/lib/auth/session";

export const metadata = { title: "Student Report Card" };

export default async function StudentReportCardPage() {
  await requirePermission("reports:read");
  return (
    <ModulePlaceholder
      title="Individual Student Report Card"
      description="Attendance, behavior, assessments, and teacher comments with export."
    />
  );
}
