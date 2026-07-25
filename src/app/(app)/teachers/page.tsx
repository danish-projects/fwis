import { redirect } from "next/navigation";

/** Legacy path — Staff directory lives at /staff. */
export default function TeachersRedirectPage() {
  redirect("/staff");
}
