import { getSchoolRankings } from "@/actions/rankings";
import { requirePermission } from "@/lib/auth/session";
import { RankingsView } from "@/components/rankings/rankings-view";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Rankings" };

export default async function RankingsPage() {
  await requirePermission("assessments:read");
  const data = await getSchoolRankings();

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Rankings</h1>
          <p className="text-muted-foreground">
            Achievement, attendance, and completion ranks for the selected school
          </p>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Select a school in the sidebar to view rankings.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Rankings</h1>
        <p className="text-muted-foreground">
          {data.schoolName}
          {data.academicYearName
            ? ` · ${data.academicYearName}`
            : " · No active academic year"}
        </p>
      </div>

      <RankingsView data={data} />
    </div>
  );
}
