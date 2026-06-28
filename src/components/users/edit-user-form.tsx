"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteUser, updateUser } from "@/actions/users";
import { UserForm } from "@/components/users/user-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserRoleCode } from "@prisma/client";

type EditUserFormProps = {
  userId: string;
  appUser: NonNullable<Awaited<ReturnType<typeof import("@/actions/users").getUserById>>>;
  options: Awaited<ReturnType<typeof import("@/actions/users").getUserFormOptions>>;
  canDelete: boolean;
};

export function EditUserForm({
  userId,
  appUser,
  options,
  canDelete,
}: EditUserFormProps) {
  const router = useRouter();

  async function handleSubmit(data: Parameters<typeof updateUser>[1]) {
    try {
      await updateUser(userId, data);
      toast.success("User updated");
      router.push(`/users/${userId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
      throw error;
    }
  }

  async function handleDelete() {
    if (!confirm("Deactivate this user? They will no longer be able to sign in.")) {
      return;
    }
    try {
      await deleteUser(userId);
      toast.success("User deactivated");
      router.push("/users");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit User</h1>
        {canDelete && (
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Deactivate
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{appUser.fullName ?? appUser.email}</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm
            options={options}
            defaultValues={{
              email: appUser.email,
              fullName: appUser.fullName ?? "",
              roleCodes: appUser.roles.map((r) => r.role.code as UserRoleCode),
              schoolIds: appUser.schools.map((s) => s.schoolId),
              gender: appUser.gender as "MALE" | "FEMALE" | null | undefined,
              isActive: appUser.isActive,
            }}
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
            cancelHref={`/users/${userId}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
