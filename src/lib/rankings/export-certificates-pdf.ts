import { renderCertificateToCanvas } from "@/lib/rankings/render-certificate-canvas";

type JsPDFConstructor = typeof import("jspdf")["jsPDF"];

declare global {
  interface Window {
    jspdf?: { jsPDF: JsPDFConstructor };
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function loadJsPdf(): Promise<JsPDFConstructor> {
  try {
    const jspdfMod = await import("jspdf");
    return jspdfMod.jsPDF;
  } catch {
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js"
    );
    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) {
      throw new Error("PDF library failed to load");
    }
    return jsPDF;
  }
}

async function waitForCertificateSheets(
  container: HTMLElement,
  expectedCount: number
): Promise<HTMLElement[]> {
  for (let attempt = 0; attempt < 120; attempt++) {
    const sheets = [
      ...container.querySelectorAll<HTMLElement>(".certificate-sheet"),
    ];
    if (sheets.length >= expectedCount) {
      return sheets.slice(0, expectedCount);
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  throw new Error("Timed out preparing certificates for export");
}

export type ExportPdfProgress = {
  phase: "loading" | "rendering" | "capturing" | "saving";
  percent: number;
  message: string;
};

export function buildCertificatesPdfFilename({
  schoolName,
  category,
  grade,
  section,
}: {
  schoolName: string;
  category: string;
  grade: string;
  section: string;
}): string {
  const slug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const parts = [
    "fwis-certificates",
    slug(schoolName),
    slug(category),
    grade !== "all" ? slug(grade) : null,
    section !== "all" ? slug(section) : null,
  ].filter(Boolean);

  return `${parts.join("-")}.pdf`;
}

export async function exportCertificateElementsToPdf(
  container: HTMLElement,
  expectedCount: number,
  filename: string,
  onProgress?: (progress: ExportPdfProgress) => void
): Promise<number> {
  onProgress?.({
    phase: "rendering",
    percent: 20,
    message: "Loading PDF library…",
  });

  const jsPDF = await loadJsPdf();

  onProgress?.({
    phase: "rendering",
    percent: 30,
    message: "Preparing certificates…",
  });

  const sheets = await waitForCertificateSheets(container, expectedCount);
  await document.fonts.ready;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "in",
    format: "letter",
  });

  const captureStart = 35;
  const captureRange = 60;

  for (let index = 0; index < sheets.length; index++) {
    const itemPercent =
      captureStart +
      Math.round((index / sheets.length) * captureRange);

    onProgress?.({
      phase: "capturing",
      percent: itemPercent,
      message: `Generating certificate ${index + 1} of ${sheets.length}…`,
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));
    const canvas = await renderCertificateToCanvas(sheets[index]);
    const imageData = canvas.toDataURL("image/jpeg", 0.92);

    if (index > 0) {
      pdf.addPage("letter", "landscape");
    }
    pdf.addImage(imageData, "JPEG", 0, 0, 11, 8.5);

    onProgress?.({
      phase: "capturing",
      percent:
        captureStart +
        Math.round(((index + 1) / sheets.length) * captureRange),
      message: `Completed certificate ${index + 1} of ${sheets.length}`,
    });
  }

  onProgress?.({
    phase: "saving",
    percent: 98,
    message: "Downloading PDF…",
  });

  pdf.save(filename);

  onProgress?.({
    phase: "saving",
    percent: 100,
    message: "Download complete",
  });

  return sheets.length;
}
