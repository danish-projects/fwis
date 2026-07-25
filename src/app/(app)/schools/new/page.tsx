"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSchool } from "@/actions/schools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildSchoolDefaultLoginSpecs,
  defaultSchoolPasswordsByRole,
  SCHOOL_DEFAULT_LOGIN_COUNT,
} from "@/lib/school/default-login-specs";
import { formatSchoolCode } from "@/lib/school/format-school-code";
import { deriveCityCode } from "@/lib/students/student-number";

export default function NewSchoolPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [cityCodeTouched, setCityCodeTouched] = useState(false);
  const [createDefaultUsers, setCreateDefaultUsers] = useState(true);

  const resolvedCityCode =
    cityCode.trim().toUpperCase() ||
    (city.trim() ? deriveCityCode(city) : "");
  const schoolCodePreview = resolvedCityCode
    ? formatSchoolCode(resolvedCityCode)
    : "";

  const passwordsByRole = useMemo(() => defaultSchoolPasswordsByRole(), []);

  const loginPreview = useMemo(() => {
    if (!resolvedCityCode) return [];
    return buildSchoolDefaultLoginSpecs({
      cityCode: resolvedCityCode,
      cityLabel: city.trim() || resolvedCityCode,
    }).map((s) => `${s.loginUserId}  (${s.roleCode})`);
  }, [resolvedCityCode, city]);

  function handleCityChange(value: string) {
    setCity(value);
    if (!cityCodeTouched) {
      setCityCode(value.trim() ? deriveCityCode(value) : "");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const codeInput = (form.get("cityCode") as string)?.trim().toUpperCase();
    try {
      const { school, defaultLogins } = await createSchool({
        name: form.get("name") as string,
        address: form.get("address") as string,
        city: form.get("city") as string,
        cityCode: codeInput || undefined,
        state: form.get("state") as string,
        zipCode: form.get("zipCode") as string,
        phone: (form.get("phone") as string) || undefined,
        email: (form.get("email") as string) || undefined,
        isActive: form.get("isActive") === "on",
        createDefaultUsers,
      });

      if (defaultLogins) {
        const { passwordsByRole: pw } = defaultLogins;
        toast.success(
          `School created with ${defaultLogins.created} logins — principal: ${pw.PRINCIPAL}, admin: ${pw.SCHOOL_ADMIN}, teacher: ${pw.TEACHER}, sub: ${pw.SUBSTITUTE}`
        );
      } else {
        toast.success("School created");
      }
      router.push(`/schools/${school.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create school");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add School</h1>
        <p className="text-muted-foreground">Create a new weekend Islamic school</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>School Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">School Name *</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cityCode">School Code *</Label>
                <Input
                  id="cityCode"
                  name="cityCode"
                  required
                  maxLength={3}
                  value={cityCode}
                  onChange={(e) => {
                    setCityCodeTouched(true);
                    setCityCode(
                      e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3)
                    );
                  }}
                  placeholder="HOU"
                  className="font-mono uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  3 letters. Becomes{" "}
                  <span className="font-mono">
                    {schoolCodePreview || "FWIS-XXX"}
                  </span>{" "}
                  and drives login IDs (e.g.{" "}
                  <span className="font-mono">
                    {(resolvedCityCode || "HOU").toLowerCase()}.b.g1
                  </span>
                  ).
                </p>
              </div>
              <div className="space-y-2">
                <Label>Full Code</Label>
                <Input
                  value={schoolCodePreview || "FWIS-XXX"}
                  readOnly
                  className="font-mono bg-muted/40"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input id="address" name="address" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  name="city"
                  required
                  value={city}
                  onChange={(e) => handleCityChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input id="state" name="state" required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="zipCode">Postal Code *</Label>
                <Input id="zipCode" name="zipCode" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked
                className="rounded"
              />
              Active
            </label>

            <div className="space-y-2 rounded-md border border-dashed border-input p-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded"
                  checked={createDefaultUsers}
                  onChange={(e) => setCreateDefaultUsers(e.target.checked)}
                />
                <span>
                  <span className="font-medium">
                    Create default app users ({SCHOOL_DEFAULT_LOGIN_COUNT})
                  </span>
                  <span className="mt-0.5 block text-muted-foreground">
                    Principal, 2 section admins, 12 grade teachers (Boys/Girls G1–G6),
                    and 2 substitutes. Passwords differ by role: principal{" "}
                    <code className="text-xs">{passwordsByRole.PRINCIPAL}</code>,
                    admin{" "}
                    <code className="text-xs">{passwordsByRole.SCHOOL_ADMIN}</code>,
                    teacher{" "}
                    <code className="text-xs">{passwordsByRole.TEACHER}</code>,
                    sub{" "}
                    <code className="text-xs">{passwordsByRole.SUBSTITUTE}</code>.
                  </span>
                </span>
              </label>
              {createDefaultUsers && loginPreview.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-y-auto rounded bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
                  {loginPreview.map((login) => (
                    <li key={login}>{login}</li>
                  ))}
                </ul>
              )}
              {createDefaultUsers && loginPreview.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Enter a school code to preview login IDs (e.g. HOU → hou.principal,
                  hou.b.g1).
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create School"}
              </Button>
              <Button asChild variant="outline">
                <Link href="/schools">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
