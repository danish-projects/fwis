import type { CertificateCategory } from "@/lib/rankings/certificate-types";

function ordinalPosition(rank: number): string {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rank}th`;
  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}

const RANK_CATEGORY_TITLES: Record<CertificateCategory, string> = {
  achievement: "ACHIEVEMENT",
  attendance: "ATTENDANCE",
  completion: "COMPLETION",
};

export type RankDescriptionParts = {
  category: CertificateCategory;
  schoolName: string;
  academicTerm: string;
  sectionGrade?: string;
  positionLabel?: string;
};

type BuildRankDescriptionInput = {
  category: CertificateCategory;
  schoolName: string;
  gradeName: string;
  sectionName: string;
  rank: number;
  academicTerm: string;
};

export function rankCategoryTitle(category: CertificateCategory): string {
  return RANK_CATEGORY_TITLES[category];
}

function sectionGradeLabel(sectionName: string, gradeName: string): string {
  return `${sectionName} ${gradeName}`;
}

export function buildRankDescriptionParts({
  category,
  schoolName,
  gradeName,
  sectionName,
  rank,
  academicTerm,
}: BuildRankDescriptionInput): RankDescriptionParts {
  const sectionGrade = sectionGradeLabel(sectionName, gradeName);

  if (category === "achievement") {
    return {
      category,
      schoolName,
      academicTerm,
      sectionGrade,
      positionLabel: `${ordinalPosition(rank)} Position`,
    };
  }

  if (category === "attendance") {
    return {
      category,
      schoolName,
      academicTerm,
    };
  }

  return {
    category,
    schoolName,
    academicTerm,
    sectionGrade,
  };
}
