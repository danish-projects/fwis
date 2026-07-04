"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SchoolRankingsData } from "@/actions/rankings";
import {
  RANK_CATEGORIES,
  RANK_CATEGORY_LABELS,
  type RankCategory,
} from "@/lib/rankings/rank-categories";
import { formatPercent } from "@/lib/utils";
import { RankingsExportPdf } from "@/components/rankings/rankings-export-pdf";

const ALL_FILTER = "all";

type RankingsViewProps = {
  data: SchoolRankingsData;
};

type RankGridRow = {
  key: string;
  enrollmentId: string;
  category: Exclude<RankCategory, "all">;
  categoryLabel: string;
  studentName: string;
  studentNumber: string | null;
  gradeName: string;
  sectionName: string;
  gradeWithSection: string;
  gradeSortOrder: number;
  rank: number;
  valuePct: number;
  valueKind: "final" | "attendance";
};

function buildGridRows(data: SchoolRankingsData): RankGridRow[] {
  const rows: RankGridRow[] = [];

  for (const group of data.achievement) {
    for (const student of group.students) {
      rows.push({
        key: `achievement:${student.enrollmentId}`,
        enrollmentId: student.enrollmentId,
        category: "achievement",
        categoryLabel: RANK_CATEGORY_LABELS.achievement,
        studentName: student.studentName,
        studentNumber: student.studentNumber,
        gradeName: student.gradeName,
        sectionName: student.sectionName,
        gradeWithSection: `${student.gradeName} ${student.sectionName}`,
        gradeSortOrder: student.gradeSortOrder,
        rank: student.rank,
        valuePct: student.finalPct,
        valueKind: "final",
      });
    }
  }

  for (const entry of data.attendance) {
    const student = entry.student;
    if (!student) continue;
    rows.push({
      key: `attendance:${student.enrollmentId}`,
      enrollmentId: student.enrollmentId,
      category: "attendance",
      categoryLabel: RANK_CATEGORY_LABELS.attendance,
      studentName: student.studentName,
      studentNumber: student.studentNumber,
      gradeName: student.gradeName,
      sectionName: student.sectionName,
      gradeWithSection: `${student.gradeName} ${student.sectionName}`,
      gradeSortOrder: student.gradeSortOrder,
      rank: student.rank,
      valuePct: student.attendancePct,
      valueKind: "attendance",
    });
  }

  for (const group of data.completion) {
    for (const student of group.students) {
      rows.push({
        key: `completion:${student.enrollmentId}`,
        enrollmentId: student.enrollmentId,
        category: "completion",
        categoryLabel: RANK_CATEGORY_LABELS.completion,
        studentName: student.studentName,
        studentNumber: student.studentNumber,
        gradeName: student.gradeName,
        sectionName: student.sectionName,
        gradeWithSection: `${student.gradeName} ${student.sectionName}`,
        gradeSortOrder: student.gradeSortOrder,
        rank: student.rank,
        valuePct: student.finalPct,
        valueKind: "final",
      });
    }
  }

  const categoryOrder: Record<Exclude<RankCategory, "all">, number> = {
    achievement: 0,
    attendance: 1,
    completion: 2,
  };

  return rows.sort((a, b) => {
    const catDiff = categoryOrder[a.category] - categoryOrder[b.category];
    if (catDiff !== 0) return catDiff;
    if (a.gradeSortOrder !== b.gradeSortOrder) {
      return a.gradeSortOrder - b.gradeSortOrder;
    }
    const gradeDiff = a.gradeWithSection.localeCompare(b.gradeWithSection);
    if (gradeDiff !== 0) return gradeDiff;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.studentName.localeCompare(b.studentName);
  });
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 sm:max-w-xs">
      <label htmlFor={id} className="shrink-0 text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function RankingsView({ data }: RankingsViewProps) {
  const [category, setCategory] = useState<RankCategory>("all");
  const [gradeFilter, setGradeFilter] = useState(ALL_FILTER);
  const [sectionFilter, setSectionFilter] = useState(ALL_FILTER);

  const allRows = useMemo(() => buildGridRows(data), [data]);

  const gradeOptions = useMemo(() => {
    const byName = new Map<string, number>();
    for (const row of allRows) {
      if (!byName.has(row.gradeName)) {
        byName.set(row.gradeName, row.gradeSortOrder);
      }
    }
    return [...byName.entries()]
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .map(([name]) => ({ value: name, label: name }));
  }, [allRows]);

  const sectionOptions = useMemo(() => {
    const names = new Set(allRows.map((row) => row.sectionName));
    const preferred = ["Boys", "Girls"];
    const ordered = [
      ...preferred.filter((name) => names.has(name)),
      ...[...names].filter((name) => !preferred.includes(name)).sort(),
    ];
    return ordered.map((name) => ({ value: name, label: name }));
  }, [allRows]);

  const rows = useMemo(() => {
    return allRows.filter((row) => {
      if (category !== "all" && row.category !== category) return false;
      if (gradeFilter !== ALL_FILTER && row.gradeName !== gradeFilter) return false;
      if (sectionFilter !== ALL_FILTER && row.sectionName !== sectionFilter) {
        return false;
      }
      return true;
    });
  }, [allRows, category, gradeFilter, sectionFilter]);

  const exportRequests = useMemo(
    () =>
      rows.map((row) => ({
        enrollmentId: row.enrollmentId,
        category: row.category,
      })),
    [rows]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <FilterSelect
          id="rankCategory"
          label="Rank category"
          value={category}
          onChange={(value) => setCategory(value as RankCategory)}
          options={RANK_CATEGORIES.map((value) => ({
            value,
            label: RANK_CATEGORY_LABELS[value],
          }))}
        />
        <FilterSelect
          id="rankGrade"
          label="Grade"
          value={gradeFilter}
          onChange={setGradeFilter}
          options={[
            { value: ALL_FILTER, label: "All" },
            ...gradeOptions,
          ]}
        />
        <FilterSelect
          id="rankSection"
          label="Section"
          value={sectionFilter}
          onChange={setSectionFilter}
          options={[
            { value: ALL_FILTER, label: "All" },
            ...sectionOptions,
          ]}
        />
        </div>
        <RankingsExportPdf
          requests={exportRequests}
          schoolName={data.schoolName}
          categoryFilter={category}
          gradeFilter={gradeFilter}
          sectionFilter={sectionFilter}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full max-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-3 py-2 font-medium">Rank category</th>
              <th className="px-3 py-2 font-medium">Student</th>
              <th className="px-3 py-2 font-medium">Grade / Section</th>
              <th className="px-3 py-2 font-medium">Rank</th>
              <th className="px-3 py-2 font-medium">Rank value</th>
              <th className="px-3 py-2 font-medium">Certificate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b last:border-0">
                <td className="px-3 py-2">{row.categoryLabel}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{row.studentName}</div>
                  {row.studentNumber ? (
                    <div className="font-mono text-xs text-muted-foreground">
                      {row.studentNumber}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{row.gradeWithSection}</td>
                <td className="px-3 py-2 tabular-nums font-medium">{row.rank}</td>
                <td className="px-3 py-2 tabular-nums">
                  {formatPercent(row.valuePct)}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {row.valueKind === "attendance" ? "present" : "final"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/rankings/certificate?enrollmentId=${encodeURIComponent(row.enrollmentId)}&category=${row.category}`}
                    className="text-sm font-medium text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Certificate
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  No ranking data for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
