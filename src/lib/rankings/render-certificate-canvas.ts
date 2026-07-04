import { getCertificateTemplateDataUrl } from "@/lib/rankings/certificate-template-data-url";
import {
  CERTIFICATE_LAYOUT,
  CERTIFICATE_PDF_FONTS,
} from "@/lib/rankings/certificate-layout";

const CAPTURE_WIDTH_PX = 1056;
const CAPTURE_HEIGHT_PX = 816;
const RENDER_SCALE = 2;

const FONT = {
  category: '"Cinzel", Georgia, serif',
  name: '"Great Vibes", "Segoe Script", cursive',
  description: '"Cormorant Garamond", Georgia, serif',
  footer: '"Source Sans 3", Arial, sans-serif',
} as const;

type TextSegment = {
  text: string;
  bold: boolean;
  italic: boolean;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load certificate image"));
    img.src = src;
  });
}

function setFont(
  ctx: CanvasRenderingContext2D,
  sizePx: number,
  family: string,
  options: { weight?: string; italic?: boolean } = {}
): void {
  const size = sizePx * RENDER_SCALE;
  const weight = options.weight ?? "400";
  const style = options.italic ? "italic " : "";
  ctx.font = `${style}${weight} ${size}px ${family}`;
}

function collectDescriptionLines(root: HTMLElement): TextSegment[][] {
  const lines: TextSegment[][] = [[]];

  function pushSegment(text: string, bold: boolean, italic: boolean) {
    if (!text) return;
    const current = lines[lines.length - 1];
    const last = current[current.length - 1];
    if (last && last.bold === bold && last.italic === italic) {
      last.text += text;
    } else {
      current.push({ text, bold, italic });
    }
  }

  function walk(node: Node, bold: boolean, italic: boolean) {
    if (node.nodeType === Node.TEXT_NODE) {
      pushSegment(node.textContent ?? "", bold, italic);
      return;
    }
    if (node.nodeName === "BR") {
      lines.push([]);
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const isEmphasis = el.classList.contains("certificate-description-emphasis");
      const nextBold = bold || isEmphasis;
      const nextItalic = isEmphasis ? false : italic;
      for (const child of el.childNodes) {
        walk(child, nextBold, nextItalic);
      }
    }
  }

  for (const child of root.childNodes) {
    walk(child, false, true);
  }

  return lines.filter((line) =>
    line.some((segment) => segment.text.replace(/\s+/g, "").length > 0)
  );
}

type MeasuredSegment = TextSegment & {
  font: string;
  width: number;
};

function measureSegments(
  ctx: CanvasRenderingContext2D,
  segments: TextSegment[],
  baseSizePx: number
): MeasuredSegment[] {
  const emphasisScale = CERTIFICATE_PDF_FONTS.description.emphasisScale;
  return segments.map((segment) => {
    const sizePx = segment.bold ? baseSizePx * emphasisScale : baseSizePx;
    const font = segment.bold
      ? segment.italic
        ? `italic 700 ${sizePx * RENDER_SCALE}px ${FONT.description}`
        : `700 ${sizePx * RENDER_SCALE}px ${FONT.description}`
      : `italic 400 ${sizePx * RENDER_SCALE}px ${FONT.description}`;
    ctx.font = font;
    return {
      ...segment,
      font,
      width: ctx.measureText(segment.text).width,
    };
  });
}

function lineWidth(
  ctx: CanvasRenderingContext2D,
  segments: TextSegment[],
  baseSizePx: number
): number {
  return measureSegments(ctx, segments, baseSizePx).reduce(
    (sum, part) => sum + part.width,
    0
  );
}

function wrapDescriptionLines(
  ctx: CanvasRenderingContext2D,
  lines: TextSegment[][],
  maxWidth: number,
  baseSizePx: number
): TextSegment[][] {
  const wrapped: TextSegment[][] = [];

  for (const line of lines) {
    const words: TextSegment[] = [];
    for (const segment of line) {
      const parts = segment.text.split(/(\s+)/);
      for (const part of parts) {
        if (!part) continue;
        words.push({
          text: part,
          bold: segment.bold,
          italic: segment.italic,
        });
      }
    }

    let current: TextSegment[] = [];
    for (const word of words) {
      const candidate = [...current, word];
      if (lineWidth(ctx, candidate, baseSizePx) > maxWidth && current.length > 0) {
        wrapped.push(current);
        current = [word];
      } else {
        current = candidate;
      }
    }
    if (current.length > 0) {
      wrapped.push(current);
    }
  }

  return wrapped;
}

function drawCenteredSegments(
  ctx: CanvasRenderingContext2D,
  segments: TextSegment[],
  centerX: number,
  y: number,
  baseSizePx: number
) {
  const measured = measureSegments(ctx, segments, baseSizePx);
  const totalWidth = measured.reduce((sum, part) => sum + part.width, 0);
  let x = centerX - totalWidth / 2;

  for (const part of measured) {
    ctx.font = part.font;
    ctx.fillStyle = part.bold ? "#111827" : "#1a1a1a";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(part.text, x, y);
    x += part.width;
  }
}

/** Render a certificate DOM node to canvas using the same layout as certificate-styles.tsx */
export async function renderCertificateToCanvas(
  sheet: HTMLElement
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;

  const width = CAPTURE_WIDTH_PX * RENDER_SCALE;
  const height = CAPTURE_HEIGHT_PX * RENDER_SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create certificate canvas");
  }

  const background = await loadImage(await getCertificateTemplateDataUrl());
  ctx.drawImage(background, 0, 0, width, height);

  const categoryEl = sheet.querySelector(".certificate-rank-category");
  if (categoryEl instanceof HTMLElement) {
    const layout = CERTIFICATE_LAYOUT.category;
    const fonts = CERTIFICATE_PDF_FONTS.category;
    setFont(ctx, fonts.sizePx, FONT.category, { weight: fonts.weight });
    ctx.fillStyle = "#1e3a5f";
    ctx.textAlign = "center";
    ctx.textBaseline = layout.baseline;
    ctx.fillText(
      (categoryEl.textContent ?? "").trim(),
      layout.left * width,
      layout.top * height
    );
  }

  const nameEl = sheet.querySelector(".certificate-student-name");
  if (nameEl instanceof HTMLElement) {
    const layout = CERTIFICATE_LAYOUT.studentName;
    const fonts = CERTIFICATE_PDF_FONTS.studentName;
    setFont(ctx, fonts.sizePx, FONT.name);
    ctx.fillStyle = "#1e3a5f";
    ctx.textAlign = "center";
    ctx.textBaseline = layout.baseline;
    ctx.fillText(
      (nameEl.textContent ?? "").trim(),
      layout.left * width,
      layout.top * height
    );
  }

  const descriptionEl = sheet.querySelector(".certificate-rank-description");
  if (descriptionEl instanceof HTMLElement) {
    const layout = CERTIFICATE_LAYOUT.description;
    const fonts = CERTIFICATE_PDF_FONTS.description;
    const baseSizePx = fonts.sizePx;
    const lineHeight =
      baseSizePx * CERTIFICATE_LAYOUT.description.lineHeight * RENDER_SCALE;
    const maxWidth = layout.maxWidth * width;

    const sourceLines = collectDescriptionLines(descriptionEl);
    const lines = wrapDescriptionLines(ctx, sourceLines, maxWidth, baseSizePx);

    let cursorY = layout.top * height;
    for (const line of lines) {
      drawCenteredSegments(ctx, line, layout.left * width, cursorY, baseSizePx);
      cursorY += lineHeight;
    }
  }

  const campusEl = sheet.querySelector(".certificate-campus");
  if (campusEl instanceof HTMLElement) {
    const layout = CERTIFICATE_LAYOUT.campus;
    const fonts = CERTIFICATE_PDF_FONTS.campus;
    setFont(ctx, fonts.sizePx, FONT.footer, { weight: fonts.weight });
    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.textBaseline = layout.baseline;
    ctx.fillText(
      (campusEl.textContent ?? "").trim(),
      layout.left * width,
      layout.top * height
    );
  }

  const dateEl = sheet.querySelector(".certificate-graduation-date");
  if (dateEl instanceof HTMLElement) {
    const layout = CERTIFICATE_LAYOUT.graduationDate;
    const fonts = CERTIFICATE_PDF_FONTS.graduationDate;
    setFont(ctx, fonts.sizePx, FONT.footer, { weight: fonts.weight });
    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.textBaseline = layout.baseline;
    ctx.fillText(
      (dateEl.textContent ?? "").trim(),
      layout.left * width,
      layout.top * height
    );
  }

  return canvas;
}
