import type { GenderCode } from "@/lib/setup-types";

/** Classroom section names aligned with staff gender. */
export const GENDER_SECTION_MAP: Record<GenderCode, string> = {
  MALE: "Boys",
  FEMALE: "Girls",
};

export function sectionNameForGender(gender: GenderCode): string {
  return GENDER_SECTION_MAP[gender];
}

export function genderForSectionName(sectionName: string): GenderCode | null {
  if (sectionName === "Boys") return "MALE";
  if (sectionName === "Girls") return "FEMALE";
  return null;
}
