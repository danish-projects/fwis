"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getSchoolById, updateSchool, deleteSchool } from "@/actions/schools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSchoolCode } from "@/lib/school/format-school-code";

type PageProps = { params: Promise<{ id: string }> };

export default function EditSchoolPage({ params }: PageProps) {
  const router = useRouter();
  const [id, setId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState<Awaited<ReturnType<typeof getSchoolById>>>(null);
  const [cityCode, setCityCode] = useState("");

  useEffect(() => {
    params.then(async ({ id: schoolId }) => {
      setId(schoolId);
      const data = await getSchoolById(schoolId);
      setSchool(data);
      setCityCode(data?.cityCode ?? "");
      setLoading(false);
    });
  }, [params]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!school) return;
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const codeInput = (form.get("cityCode") as string)?.trim().toUpperCase();
    try {
      await updateSchool(id, {
        name: form.get("name") as string,
        address: form.get("address") as string,
        city: form.get("city") as string,
        cityCode: codeInput || undefined,
        state: form.get("state") as string,
        zipCode: form.get("zipCode") as string,
        phone: (form.get("phone") as string) || undefined,
        email: (form.get("email") as string) || undefined,
        isActive: form.get("isActive") === "on",
        createDefaultUsers: false,
      });
      toast.success("School updated");
      router.push(`/schools/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Soft-delete this school?")) return;
    try {
      await deleteSchool(id);
      toast.success("School deleted");
      router.push("/schools");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!school) {
    return <p>School not found.</p>;
  }

  const schoolCodePreview = cityCode.trim()
    ? formatSchoolCode(cityCode.trim().toUpperCase())
    : school.code;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit School</h1>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          Delete
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{school.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">School Name *</Label>
              <Input id="name" name="name" defaultValue={school.name} required />
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
                  onChange={(e) =>
                    setCityCode(
                      e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3)
                    )
                  }
                  placeholder="HOU"
                  className="font-mono uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  3 letters. Used in student IDs (e.g. HOU-B1).
                </p>
              </div>
              <div className="space-y-2">
                <Label>Full Code</Label>
                <Input
                  value={schoolCodePreview}
                  readOnly
                  className="font-mono bg-muted/40"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                name="address"
                defaultValue={school.address ?? ""}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input id="city" name="city" defaultValue={school.city} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input id="state" name="state" defaultValue={school.state} required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="zipCode">Postal Code *</Label>
                <Input
                  id="zipCode"
                  name="zipCode"
                  defaultValue={school.zipCode ?? ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={school.phone ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={school.email ?? ""} />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={school.isActive}
                className="rounded"
              />
              Active
            </label>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button asChild variant="outline">
                <Link href={`/schools/${id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
