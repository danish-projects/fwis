"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { BulkGradeRecordInput } from "@/lib/validations/grade-record";

type FormOptions = Awaited<
  ReturnType<typeof import("@/actions/grades").getGradeRecordFormOptions>
>;

type GradeBulkAddFormProps = {
  options: FormOptions;
  onSchoolChange: (schoolId: string) => Promise<FormOptions>;
  onSubmit: (data: BulkGradeRecordInput) => Promise<void>;
  cancelHref: string;
};

function pairKey(gradeId: number, sectionId: number) {
  return `${gradeId}:${sectionId}`;
}

export function GradeBulkAddForm({
  options,
  onSchoolChange,
  onSubmit,
  cancelHref,
}: GradeBulkAddFormProps) {
  const [schoolId, setSchoolId] = useState(
    options.defaultSchoolId ?? options.schools[0]?.id ?? ""
  );
  const [existingPairs, setExistingPairs] = useState(options.existingPairs);
  const [grades, setGrades] = useState(options.grades);
  const [sections, setSections] = useState(options.sections);
  const [schools, setSchools] = useState(options.schools);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isActive, setIsActive] = useState(true);
  const [pending, startTransition] = useTransition();

  const existingSet = useMemo(
    () =>
      new Set(existingPairs.map((pair) => pairKey(pair.gradeId, pair.sectionId))),
    [existingPairs]
  );

  const selectableKeys = useMemo(() => {
    const keys: string[] = [];
    for (const grade of grades) {
      for (const section of sections) {
        const key = pairKey(grade.id, section.id);
        if (!existingSet.has(key)) keys.push(key);
      }
    }
    return keys;
  }, [grades, sections, existingSet]);

  useEffect(() => {
    setSchools(options.schools);
    setGrades(options.grades);
    setSections(options.sections);
    setExistingPairs(options.existingPairs);
    if (options.defaultSchoolId) {
      setSchoolId(options.defaultSchoolId);
    }
  }, [options]);

  function togglePair(gradeId: number, sectionId: number, checked: boolean) {
    const key = pairKey(gradeId, sectionId);
    if (existingSet.has(key)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function setMany(keys: string[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        if (existingSet.has(key)) continue;
        if (checked) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }

  function rowKeys(gradeId: number) {
    return sections
      .map((section) => pairKey(gradeId, section.id))
      .filter((key) => !existingSet.has(key));
  }

  function columnKeys(sectionId: number) {
    return grades
      .map((grade) => pairKey(grade.id, sectionId))
      .filter((key) => !existingSet.has(key));
  }

  function allChecked(keys: string[]) {
    return keys.length > 0 && keys.every((key) => selected.has(key));
  }

  function someChecked(keys: string[]) {
    return keys.some((key) => selected.has(key)) && !allChecked(keys);
  }

  async function handleSchoolChange(nextSchoolId: string) {
    setSchoolId(nextSchoolId);
    setSelected(new Set());
    if (!nextSchoolId) {
      setExistingPairs([]);
      return;
    }
    startTransition(async () => {
      const next = await onSchoolChange(nextSchoolId);
      setSchools(next.schools);
      setGrades(next.grades);
      setSections(next.sections);
      setExistingPairs(next.existingPairs);
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!schoolId) return;
    const pairs = [...selected].map((key) => {
      const [gradeId, sectionId] = key.split(":").map(Number);
      return { gradeId, sectionId };
    });
    await onSubmit({ schoolId, pairs, isActive });
  }

  const selectableSelected = selectableKeys.filter((key) => selected.has(key));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="schoolId">School *</Label>
        <select
          id="schoolId"
          name="schoolId"
          required
          value={schoolId}
          onChange={(e) => void handleSchoolChange(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Select school</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <Label>Grade levels & sections *</Label>
            <p className="text-xs text-muted-foreground">
              Check each grade and section to offer at this school. Existing ones
              are already linked.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded"
              checked={allChecked(selectableKeys)}
              ref={(el) => {
                if (el) el.indeterminate = someChecked(selectableKeys);
              }}
              disabled={selectableKeys.length === 0 || pending}
              onChange={(e) => setMany(selectableKeys, e.target.checked)}
            />
            Select all available
          </label>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[20rem] text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left font-medium">Grade</th>
                {sections.map((section) => {
                  const keys = columnKeys(section.id);
                  return (
                    <th key={section.id} className="px-3 py-2 text-center font-medium">
                      <div className="flex flex-col items-center gap-1">
                        <span>{section.name}</span>
                        <input
                          type="checkbox"
                          className="rounded"
                          title={`Select all ${section.name}`}
                          aria-label={`Select all ${section.name}`}
                          checked={allChecked(keys)}
                          ref={(el) => {
                            if (el) el.indeterminate = someChecked(keys);
                          }}
                          disabled={keys.length === 0 || pending}
                          onChange={(e) => setMany(keys, e.target.checked)}
                        />
                      </div>
                    </th>
                  );
                })}
                <th className="px-3 py-2 text-center font-medium">All</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((grade) => {
                const keys = rowKeys(grade.id);
                return (
                  <tr key={grade.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{grade.name}</td>
                    {sections.map((section) => {
                      const key = pairKey(grade.id, section.id);
                      const exists = existingSet.has(key);
                      const checked = exists || selected.has(key);
                      return (
                        <td key={section.id} className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            className={cn("rounded", exists && "opacity-60")}
                            checked={checked}
                            disabled={exists || pending}
                            title={
                              exists
                                ? `${grade.name} ${section.name} already linked`
                                : `${grade.name} ${section.name}`
                            }
                            aria-label={`${grade.name} ${section.name}`}
                            onChange={(e) =>
                              togglePair(grade.id, section.id, e.target.checked)
                            }
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        className="rounded"
                        title={`Select all sections for ${grade.name}`}
                        aria-label={`Select all sections for ${grade.name}`}
                        checked={allChecked(keys)}
                        ref={(el) => {
                          if (el) el.indeterminate = someChecked(keys);
                        }}
                        disabled={keys.length === 0 || pending}
                        onChange={(e) => setMany(keys, e.target.checked)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          {selectableSelected.length} selected
          {existingSet.size > 0 ? ` · ${existingSet.size} already linked` : ""}
          {pending ? " · Loading…" : ""}
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded"
        />
        Active
      </label>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={!schoolId || selectableSelected.length === 0 || pending}
        >
          {selectableSelected.length > 0
            ? `Create ${selectableSelected.length} grade${selectableSelected.length === 1 ? "" : "s"}`
            : "Create grades"}
        </Button>
        <Button asChild variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
