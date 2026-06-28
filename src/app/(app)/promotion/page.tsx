import { ModulePlaceholder } from "@/components/modules/module-placeholder";
import { requirePermission } from "@/lib/auth/session";

export const metadata = { title: "Student Promotion" };

export default async function PromotionPage() {
  await requirePermission("promotion:execute");
  return (
    <ModulePlaceholder
      title="Student Promotion Wizard"
      description="Annual promotion with preview — Grade 1→2 through Grade 6→Graduated."
    />
  );
}
