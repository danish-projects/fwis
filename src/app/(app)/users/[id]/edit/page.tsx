import { notFound } from "next/navigation";
import { getUserById, getUserFormOptions } from "@/actions/users";
import { EditUserForm } from "@/components/users/edit-user-form";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export const metadata = { title: "Edit User" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditUserPage({ params }: PageProps) {
  await requirePermission("users:update");
  const sessionUser = await getSessionUser();
  const { id } = await params;

  const [appUser, options] = await Promise.all([
    getUserById(id),
    getUserFormOptions(),
  ]);
  if (!appUser) notFound();

  const canDelete =
    sessionUser !== null && hasPermission(sessionUser.roles, "users:delete");

  return (
    <EditUserForm
      userId={id}
      appUser={appUser}
      options={options}
      canDelete={canDelete}
    />
  );
}
