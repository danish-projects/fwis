import Link from "next/link";
import { notFound } from "next/navigation";
import { getRankCertificate } from "@/actions/rankings";
import { CertificateDocument } from "@/components/rankings/certificate-document";
import { CertificatePrintActions } from "@/components/rankings/certificate-print-actions";
import { CertificateStyles } from "@/components/rankings/certificate-styles";
import type { CertificateCategory } from "@/lib/rankings/certificate-types";
import { requirePermission } from "@/lib/auth/session";

export const metadata = { title: "Certificate" };

const CERTIFICATE_CATEGORIES = new Set<CertificateCategory>([
  "achievement",
  "attendance",
  "completion",
]);

type PageProps = {
  searchParams: Promise<{
    enrollmentId?: string;
    category?: string;
  }>;
};

export default async function RankCertificatePage({ searchParams }: PageProps) {
  await requirePermission("assessments:read");
  const { enrollmentId, category } = await searchParams;

  if (
    !enrollmentId ||
    !category ||
    !CERTIFICATE_CATEGORIES.has(category as CertificateCategory)
  ) {
    notFound();
  }

  const data = await getRankCertificate(
    enrollmentId,
    category as CertificateCategory
  );
  if (!data) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
        <h1 className="text-xl font-semibold">Certificate not available</h1>
        <p className="text-muted-foreground">
          This student is not currently listed for that rank category in the
          selected school and academic year.
        </p>
        <Link href="/rankings" className="text-primary underline">
          Back to rankings
        </Link>
      </div>
    );
  }

  return (
    <div className="certificate-page">
      <CertificateStyles />
      <CertificatePrintActions />
      <CertificateDocument data={data} />
    </div>
  );
}
