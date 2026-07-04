import { formatDate } from "@/lib/utils";

/** Short organization label used on printed certificates (e.g. FWIS HOUSTON, TX). */
export const CERTIFICATE_ORG_SHORT_NAME = "FWIS";

export function formatCertificateCampus(city: string, state: string): string {
  return `${CERTIFICATE_ORG_SHORT_NAME} ${city.toUpperCase()}, ${state}`;
}

export function formatAcademicTerm(startDate: Date, endDate: Date): string {
  const monthYear = (date: Date) => {
    const month = date.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    });
    return `${month}, ${date.getUTCFullYear()}`;
  };

  return `${monthYear(startDate)} – ${monthYear(endDate)}`;
}

export function formatGraduationDate(date: Date): string {
  return formatDate(date);
}
