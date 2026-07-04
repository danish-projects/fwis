import type { RankDescriptionParts } from "@/lib/rankings/build-rank-description";
import type { RankCategory } from "@/lib/rankings/rank-categories";

export type CertificateCategory = Exclude<RankCategory, "all">;

export type RankCertificateData = {
  category: CertificateCategory;
  categoryLabel: string;
  /** Shown after "OF" on the certificate (ACHIEVEMENT, ATTENDANCE, COMPLETION). */
  rankCategoryTitle: string;
  rankDescription: RankDescriptionParts;
  studentName: string;
  studentNumber: string | null;
  gradeName: string;
  sectionName: string;
  gradeWithSection: string;
  rank: number;
  valuePct: number;
  valueKind: "final" | "attendance";
  valueLabel: string;
  schoolName: string;
  /** e.g. FWIS HOUSTON, TX */
  campusLabel: string;
  academicYearName: string;
  academicTerm: string;
  graduationDate: string;
};

export type RankCertificateRequest = {
  enrollmentId: string;
  category: CertificateCategory;
};
