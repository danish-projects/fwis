import Link from "next/link";
import { getSchoolBackupPageContext } from "@/actions/school-data-backup";
import { SchoolBackupForm } from "@/components/backup/school-backup-form";
import { ImportTemplateDownloadCard } from "@/components/backup/import-template-download-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission, requireRole } from "@/lib/auth/session";

export const metadata = { title: "Data Backup" };

type PageProps = {
  searchParams: Promise<{ school?: string }>;
};

export default async function BackupPage({ searchParams }: PageProps) {
  await requireRole("NIGRA", "SCHOOL_ADMIN");
  await requirePermission("reports:export");

  const params = await searchParams;
  const ctx = await getSchoolBackupPageContext(params.school);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Data Backup</h1>
          <p className="text-muted-foreground">
            Export school data to Excel in the same format used for import
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/reports">Reports</Link>
        </Button>
      </div>

      {ctx.schools.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No schools available for backup export.
          </CardContent>
        </Card>
      ) : (
        <SchoolBackupForm
          schools={ctx.schools}
          academicYears={ctx.academicYears}
          initialSchoolId={ctx.schoolId}
          showSchoolPicker={ctx.showSchoolPicker}
        />
      )}

      <ImportTemplateDownloadCard />
    </div>
  );
}
