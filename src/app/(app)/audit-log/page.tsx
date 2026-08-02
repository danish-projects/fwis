import Link from "next/link";
import { Search } from "lucide-react";
import type { AuditAction } from "@prisma/client";
import { getAuditLogs } from "@/actions/audit-logs";
import { requireRole } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Audit Log" };

const ACTIONS: AuditAction[] = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "EXPORT",
  "LOGIN",
  "PROMOTION",
];

type PageProps = {
  searchParams: Promise<{
    page?: string;
    schoolId?: string;
    gradeId?: string;
    entity?: string;
    action?: string;
    search?: string;
  }>;
};

function buildQuery(
  params: Record<string, string | undefined>,
  overrides: Record<string, string | undefined> = {}
) {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  Object.entries(merged).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  const str = qs.toString();
  return str ? `?${str}` : "";
}

const ACTION_VARIANT: Record<
  AuditAction,
  "default" | "secondary" | "outline" | "destructive" | "success"
> = {
  CREATE: "success",
  UPDATE: "secondary",
  DELETE: "destructive",
  EXPORT: "outline",
  LOGIN: "outline",
  PROMOTION: "default",
};

export default async function AuditLogPage({ searchParams }: PageProps) {
  await requireRole("NIGRA");
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const gradeIdRaw = params.gradeId ? Number(params.gradeId) : undefined;
  const actionRaw = params.action as AuditAction | undefined;
  const action =
    actionRaw && ACTIONS.includes(actionRaw) ? actionRaw : undefined;

  const { rows, meta, filterOptions } = await getAuditLogs({
    page,
    schoolId: params.schoolId || undefined,
    gradeId: Number.isFinite(gradeIdRaw) ? gradeIdRaw : undefined,
    entity: params.entity || undefined,
    action,
    search: params.search || undefined,
  });

  const queryBase = {
    schoolId: params.schoolId,
    gradeId: params.gradeId,
    entity: params.entity,
    action: params.action,
    search: params.search,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Audit Log</h1>
        <p className="text-muted-foreground">
          Database trail of who changed what (separate from text server logs). Filter by
          school, grade, entity, or action.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" method="get">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Search user id or entity…"
                defaultValue={params.search ?? ""}
                className="pl-9"
              />
            </div>
            <select
              name="schoolId"
              defaultValue={params.schoolId ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All schools</option>
              {filterOptions.schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            <select
              name="gradeId"
              defaultValue={params.gradeId ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All grades</option>
              {filterOptions.grades.map((grade) => (
                <option key={grade.id} value={String(grade.id)}>
                  {grade.name}
                </option>
              ))}
            </select>
            <select
              name="entity"
              defaultValue={params.entity ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All entities</option>
              {filterOptions.entities.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </select>
            <select
              name="action"
              defaultValue={params.action ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All actions</option>
              {filterOptions.actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
              <Button type="submit">Apply filters</Button>
              <Button asChild type="button" variant="outline">
                <Link href="/audit-log">Clear</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-3 font-medium">When (CT)</th>
                  <th className="pb-3 pr-3 font-medium">Action</th>
                  <th className="pb-3 pr-3 font-medium">Entity</th>
                  <th className="pb-3 pr-3 font-medium">School</th>
                  <th className="pb-3 pr-3 font-medium">Grade</th>
                  <th className="pb-3 pr-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-3 pr-3 whitespace-nowrap text-muted-foreground">
                      {row.createdAtLabel}
                    </td>
                    <td className="py-3 pr-3">
                      <Badge variant={ACTION_VARIANT[row.action] ?? "outline"}>
                        {row.action}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{row.entity}</div>
                      {row.entityId && (
                        <div className="text-xs text-muted-foreground">
                          {row.entityId.slice(0, 8)}…
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-3">{row.schoolName ?? "—"}</td>
                    <td className="py-3 pr-3">{row.gradeName ?? "—"}</td>
                    <td className="py-3 pr-3">{row.userIdLabel}</td>
                    <td className="py-3 max-w-[240px] truncate" title={row.summary}>
                      {row.summary}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No audit entries match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <p>
              Page {meta.page} of {meta.totalPages} · {meta.total} total
            </p>
            <div className="flex gap-2">
              {meta.page > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/audit-log${buildQuery(queryBase, {
                      page: String(meta.page - 1),
                    })}`}
                  >
                    Previous
                  </Link>
                </Button>
              )}
              {meta.page < meta.totalPages && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/audit-log${buildQuery(queryBase, {
                      page: String(meta.page + 1),
                    })}`}
                  >
                    Next
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
