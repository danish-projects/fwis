"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CALENDAR_SUMMARY_LINE_TYPES,
  CALENDAR_SUMMARY_SINGLE_DAY_TYPES,
  pickSessionTypeCounts,
  type SessionTypeCount,
} from "@/lib/calendar/session-type-counts";

type CalendarSessionSummaryProps = {
  schoolName: string;
  academicYearName: string;
  counts: SessionTypeCount[];
  totalDays: number;
  attendanceNeededCount: number;
};

function StatHighlight({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-muted/30 px-4 py-3", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold tabular-nums leading-none">{value}</p>
    </div>
  );
}

function SessionTypeTile({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-center">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold tabular-nums leading-none",
          count === 0 && "text-muted-foreground"
        )}
      >
        {count}
      </p>
    </div>
  );
}

function CompactStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="text-sm text-muted-foreground">
      {label}:{" "}
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </span>
  );
}

export function CalendarSessionSummary({
  schoolName,
  academicYearName,
  counts,
  totalDays,
  attendanceNeededCount,
}: CalendarSessionSummaryProps) {
  const [open, setOpen] = useState(true);
  const lineCounts = pickSessionTypeCounts(counts, CALENDAR_SUMMARY_LINE_TYPES);
  const singleDayCounts = pickSessionTypeCounts(
    counts,
    CALENDAR_SUMMARY_SINGLE_DAY_TYPES
  );
  const instructionalCount =
    lineCounts.find((item) => item.sessionType === "INSTRUCTIONAL")?.count ?? 0;
  const holidayCount =
    lineCounts.find((item) => item.sessionType === "HOLIDAY")?.count ?? 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 text-left"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
              Session summary
            </CardTitle>
            <CardDescription>
              {academicYearName} · {schoolName}
            </CardDescription>
            {totalDays > 0 ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                <CompactStat label="Instructional Day" value={instructionalCount} />
                <CompactStat label="Holiday" value={holidayCount} />
                <CompactStat label="Attendance needed" value={attendanceNeededCount} />
                <CompactStat label="Total Sundays" value={totalDays} />
              </div>
            ) : null}
          </div>
          <ChevronDown
            className={cn(
              "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </button>
      </CardHeader>

      {open ? (
        <CardContent>
          {totalDays === 0 ? (
            <p className="text-sm text-muted-foreground">
              No calendar days for this school and academic year yet.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <StatHighlight label="Attendance needed" value={attendanceNeededCount} />
                <StatHighlight label="Total Sundays" value={totalDays} />
              </div>

              <section className="space-y-2">
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Variable sessions
                </h4>
                <div className="grid gap-2 sm:grid-cols-3">
                  {lineCounts.map((item) => (
                    <SessionTypeTile
                      key={item.sessionType}
                      label={item.label}
                      count={item.count}
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  One day each
                </h4>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
                  {singleDayCounts.map((item) => (
                    <SessionTypeTile
                      key={item.sessionType}
                      label={item.label}
                      count={item.count}
                    />
                  ))}
                </div>
              </section>
            </div>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}
