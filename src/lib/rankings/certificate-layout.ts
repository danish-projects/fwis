/** PDF export layout (positions/fonts may differ from on-screen certificate-styles). */
export const CERTIFICATE_LAYOUT = {
  category: { top: 0.235, left: 0.5, baseline: "middle" as const },
  studentName: { top: 0.485, left: 0.5, baseline: "middle" as const },
  description: {
    top: 0.54,
    left: 0.5,
    baseline: "top" as const,
    maxWidth: 0.7,
    lineHeight: 1.65,
  },
  campus: { top: 0.775, left: 0.28, baseline: "middle" as const },
  graduationDate: { top: 0.775, left: 0.7, baseline: "middle" as const },
};

/** Fixed font sizes for 1056×816 PDF export (matches print styles). */
export const CERTIFICATE_PDF_FONTS = {
  category: { sizePx: 23.2, weight: "700" },
  studentName: { sizePx: 58 },
  description: { sizePx: 16.32, emphasisScale: 1.14 },
  campus: { sizePx: 13.12, weight: "700" },
  graduationDate: { sizePx: 14.08, weight: "600" },
};
