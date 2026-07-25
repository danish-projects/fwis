import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function TeachersDetailRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/staff/${id}`);
}
