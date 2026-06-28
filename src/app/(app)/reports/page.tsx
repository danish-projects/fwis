import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requirePermission("reports:read");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Reports</h1>
        <p className="text-muted-foreground">Export grade and student reports</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Grade Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/reports/grade-performance">Open Report</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Student Report Card</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/reports/student-report-card">Open Report</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
