import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function TeachersEditRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/staff/${id}/edit`);
}
