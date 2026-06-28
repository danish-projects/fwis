import { ModulePlaceholder } from "@/components/modules/module-placeholder";
import { requirePermission } from "@/lib/auth/session";

export const metadata = { title: "Grade Performance Report" };

export default async function GradePerformanceReportPage() {
  await requirePermission("reports:read");
  return (
    <ModulePlaceholder
      title="Grade Performance Report"
      description="Filter by school, year, grade, section. Export CSV, Excel, PDF."
    />
  );
}
