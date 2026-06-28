"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRoleCode } from "@prisma/client";
import type { UserInput } from "@/lib/validations/user";

type FormOptions = Awaited<
  ReturnType<typeof import("@/actions/users").getUserFormOptions>
>;

type UserFormProps = {
  options: FormOptions;
  defaultValues?: Partial<UserInput>;
  requirePassword?: boolean;
  onSubmit: (data: UserInput) => Promise<void>;
  submitLabel: string;
  cancelHref: string;
};

export function UserForm({
  options,
  defaultValues,
  requirePassword = false,
  onSubmit,
  submitLabel,
  cancelHref,
}: UserFormProps) {
  const [roleCodes, setRoleCodes] = useState<UserRoleCode[]>(
    defaultValues?.roleCodes ?? []
  );
  const [schoolIds, setSchoolIds] = useState<string[]>(
    defaultValues?.schoolIds ?? []
  );
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "">(
    defaultValues?.gender ?? ""
  );

  const isSuperAdmin = roleCodes.includes("SUPER_ADMIN");
  const isSchoolAdminOnly =
    roleCodes.length === 1 && roleCodes.includes("SCHOOL_ADMIN");
  const needsSchools =
    roleCodes.includes("SCHOOL_ADMIN") ||
    roleCodes.includes("TEACHER") ||
    roleCodes.includes("READ_ONLY");

  const visibleSchools = useMemo(() => options.schools, [options.schools]);

  function toggleRole(code: UserRoleCode) {
    if (code === "SUPER_ADMIN") {
      setRoleCodes((prev) =>
        prev.includes("SUPER_ADMIN") ? [] : ["SUPER_ADMIN"]
      );
      if (!roleCodes.includes("SUPER_ADMIN")) setSchoolIds([]);
      return;
    }

    setRoleCodes((prev) => {
      const withoutSuper = prev.filter((r) => r !== "SUPER_ADMIN");
      return withoutSuper.includes(code)
        ? withoutSuper.filter((r) => r !== code)
        : [...withoutSuper, code];
    });
  }

  function toggleSchool(schoolId: string) {
    setSchoolIds((prev) =>
      prev.includes(schoolId)
        ? prev.filter((id) => id !== schoolId)
        : [...prev, schoolId]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = (form.get("password") as string) || undefined;

    await onSubmit({
      email: form.get("email") as string,
      fullName: form.get("fullName") as string,
      password: password || undefined,
      roleCodes,
      schoolIds: isSuperAdmin ? [] : schoolIds,
      gender: isSchoolAdminOnly && gender ? gender : null,
      isActive: form.get("isActive") === "on",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={defaultValues?.fullName ?? ""}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          Password {requirePassword ? "*" : "(leave blank to keep current)"}
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required={requirePassword}
          minLength={requirePassword ? 8 : undefined}
        />
      </div>

      <div className="space-y-2">
        <Label>Roles *</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {options.roles.map((role) => (
            <label
              key={role.code}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={roleCodes.includes(role.code)}
                onChange={() => toggleRole(role.code)}
                className="rounded"
              />
              {role.name}
            </label>
          ))}
        </div>
      </div>

      {!isSuperAdmin && (
        <div className="space-y-2">
          <Label>School Access {needsSchools ? "*" : ""}</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleSchools.map((school) => (
              <label
                key={school.id}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={schoolIds.includes(school.id)}
                  onChange={() => toggleSchool(school.id)}
                  className="rounded"
                />
                {school.name}
              </label>
            ))}
          </div>
          {needsSchools && (
            <p className="text-xs text-muted-foreground">
              Required for School Admin, Teacher, and Read Only roles.
            </p>
          )}
        </div>
      )}

      {isSchoolAdminOnly && (
        <div className="space-y-2">
          <Label htmlFor="gender">Section scope</Label>
          <select
            id="gender"
            value={gender}
            onChange={(e) =>
              setGender(e.target.value as "MALE" | "FEMALE" | "")
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Full school (all sections)</option>
            <option value="MALE">Boys only</option>
            <option value="FEMALE">Girls only</option>
          </select>
          <p className="text-xs text-muted-foreground">
            When set, this admin only sees and manages Boys or Girls grades.
          </p>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaultValues?.isActive ?? true}
          className="rounded"
        />
        Active
      </label>

      <div className="flex gap-3 pt-2">
        <Button type="submit">{submitLabel}</Button>
        <Button asChild variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
