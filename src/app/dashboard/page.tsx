import { redirect } from "next/navigation";
import { getPrimaryRole, getLandingPath } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";

export default async function DashboardRedirectPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const role = getPrimaryRole(user.roles);
  redirect(getLandingPath(role));
}
