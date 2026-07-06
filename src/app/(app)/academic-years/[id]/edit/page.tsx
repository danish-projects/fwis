import { notFound } from "next/navigation";
import {
  getAcademicYearById,
  getAcademicYearFormOptions,
} from "@/actions/academic-years";
import { EditAcademicYearClient } from "@/components/academic-years/edit-academic-year-client";
import { requirePermission } from "@/lib/auth/session";

export const metadata = { title: "Edit Academic Year" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditAcademicYearPage({ params }: PageProps) {
  await requirePermission("academic-years:update");
  const { id } = await params;
  const year = await getAcademicYearById(id);
  if (!year) notFound();

  const options = await getAcademicYearFormOptions();

  return <EditAcademicYearClient id={id} year={year} options={options} />;
}
