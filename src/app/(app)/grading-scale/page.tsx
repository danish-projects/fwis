import { loadGradingScaleForPage } from "@/actions/grading-scale";
import { GradingScaleEditor } from "@/components/grading-scale/grading-scale-editor";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export const metadata = { title: "Grading Scale" };

export default async function GradingScalePage() {
  await requirePermission("grading-scale:read");
  const user = await getSessionUser();
  const scale = await loadGradingScaleForPage();
  const canEdit =
    user !== null && hasPermission(user.roles, "grading-scale:update");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Grading Scale</h1>
        <p className="text-muted-foreground">
          System-wide weights and letter grades used on transcripts and final scores
        </p>
      </div>

      <GradingScaleEditor initialScale={scale} canEdit={canEdit} />
    </div>
  );
}
