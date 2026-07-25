/**
 * Generate FWIS default-login credentials PDF (all seed schools + majlis).
 *
 * Usage: npm run docs:credentials-pdf
 * Output: docs/FWIS-Default-Login-Credentials.pdf (gitignored)
 */
import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import { config } from "dotenv";
import {
  buildSchoolDefaultLoginSpecs,
  ROLE_DEFAULT_PASSWORDS,
  resolveRoleDefaultPassword,
  schoolLoginCode,
} from "../src/lib/school/default-login-specs";
import { STAFF_ROLE_LABELS } from "../src/lib/roles/staff-positions";
import { SEED_SCHOOLS } from "../prisma/seed-data/foundation";

config({ path: path.join(process.cwd(), ".env.local") });

const OUT = path.join(
  process.cwd(),
  "docs",
  "FWIS-Default-Login-Credentials.pdf"
);

const ROLE_BLURB: Record<string, string> = {
  NIGRA:
    "Full access to all schools and modules (schools, users, years, calendars, students, grades, backups, grading scale).",
  PRINCIPAL:
    "Full school administration for assigned school(s): students, staff, enrollments, calendars, attendance, assessments, users, backup.",
  SCHOOL_ADMIN:
    "School admin for assigned school; Boys/Girls scope when gender is set. Cannot create schools or edit grading scale.",
  TEACHER:
    "Own classroom only: attendance, behavior, assessment scores, transcript, and course materials for that grade/section.",
  SUBSTITUTE:
    "Same tools as a teacher; Boys or Girls substitute coverage for the school.",
};

const ROLE_LABEL: Record<string, string> = {
  NIGRA: "Nigran",
  PRINCIPAL: STAFF_ROLE_LABELS.PRINCIPAL,
  SCHOOL_ADMIN: STAFF_ROLE_LABELS.SCHOOL_ADMIN,
  TEACHER: STAFF_ROLE_LABELS.TEACHER,
  SUBSTITUTE: STAFF_ROLE_LABELS.SUBSTITUTE,
};

type CredRow = {
  userIdLines: string[];
  name: string;
  role: string;
  password: string;
  access: string;
};

type SchoolBlock = {
  title: string;
  rows: CredRow[];
};

function buildBlocks(): SchoolBlock[] {
  const majlisId =
    (process.env.SEED_SUPER_ADMIN_USER_ID ?? "majlis")
      .trim()
      .toLowerCase()
      .replace(/@.*/, "") || "majlis";

  const blocks: SchoolBlock[] = [
    {
      title: "System — Nigran (all schools)",
      rows: [
        {
          userIdLines: [majlisId],
          name: "FWIS Nigran",
          role: ROLE_LABEL.NIGRA,
          password: resolveRoleDefaultPassword("NIGRA"),
          access: ROLE_BLURB.NIGRA,
        },
      ],
    },
  ];

  const teacherPassword = resolveRoleDefaultPassword("TEACHER");

  for (const school of SEED_SCHOOLS) {
    const code = schoolLoginCode(school.cityCode);
    const specs = buildSchoolDefaultLoginSpecs({
      cityCode: school.cityCode,
      cityLabel: school.loginCityLabel,
    });

    const rows: CredRow[] = [];

    for (const spec of specs) {
      if (spec.roleCode === "TEACHER") continue;
      rows.push({
        userIdLines: [spec.loginUserId],
        name: spec.fullName,
        role: ROLE_LABEL[spec.roleCode] ?? spec.roleCode,
        password: spec.password,
        access: ROLE_BLURB[spec.roleCode] ?? "",
      });
    }

    // Insert teachers after admins (before substitutes): find first substitute index
    const subIdx = rows.findIndex((r) => r.role === ROLE_LABEL.SUBSTITUTE);
    const teacherRow: CredRow = {
      userIdLines: [`${code}.b.g1–g6`, `${code}.g.g1–g6`],
      name: `Grade 1–6 Teachers (Boys & Girls)`,
      role: ROLE_LABEL.TEACHER,
      password: teacherPassword,
      access:
        "12 logins, one password. Each manages attendance, assessments, and transcript for their own grade/section only.",
    };
    if (subIdx >= 0) rows.splice(subIdx, 0, teacherRow);
    else rows.push(teacherRow);

    blocks.push({
      title: `${school.code}  ·  ${school.loginCityLabel}`,
      rows,
    });
  }

  return blocks;
}

function wrap(doc: jsPDF, text: string, width: number): string[] {
  return doc.splitTextToSize(text, width) as string[];
}

function main() {
  const blocks = buildBlocks();
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "letter",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 32;
  const marginTop = 28;
  const marginBottom = 28;
  const usableW = pageW - marginX * 2;

  // Column layout (tight, aligned)
  const gap = 8;
  const cols = {
    userId: { x: marginX, w: 108 },
    name: { x: 0, w: 148 },
    role: { x: 0, w: 78 },
    password: { x: 0, w: 118 },
    access: { x: 0, w: 0 },
  };
  cols.name.x = cols.userId.x + cols.userId.w + gap;
  cols.role.x = cols.name.x + cols.name.w + gap;
  cols.password.x = cols.role.x + cols.role.w + gap;
  cols.access.x = cols.password.x + cols.password.w + gap;
  cols.access.w = marginX + usableW - cols.access.x;

  let y = marginTop;

  function ensureSpace(needed: number, continuedTitle?: string) {
    if (y + needed <= pageH - marginBottom) return;
    doc.addPage();
    y = marginTop;
    if (continuedTitle) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(20);
      doc.text(`${continuedTitle} (continued)`, marginX, y);
      y += 10;
      drawColumnHeaders();
    }
  }

  function drawFooter() {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(130);
      doc.text(
        `FWIS confidential  ·  page ${i} of ${pages}`,
        pageW / 2,
        pageH - 14,
        { align: "center" }
      );
    }
  }

  // ——— Title page block ———
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text("FWIS Default Login Credentials", marginX, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90);
  for (const line of [
    `Generated ${new Date().toISOString().slice(0, 10)}  ·  Do not publish or commit to git`,
    "Sign in at /login with User ID + password. Defaults below; change after first production login.",
  ]) {
    doc.text(line, marginX, y);
    y += 11;
  }
  y += 10;

  // Password summary box
  doc.setFillColor(245, 246, 248);
  doc.setDrawColor(210);
  const boxH = 58;
  doc.roundedRect(marginX, y, usableW, boxH, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30);
  doc.text("Default passwords by role", marginX + 10, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(40);
  const pwdItems = [
    `Nigran  ${ROLE_DEFAULT_PASSWORDS.NIGRA}`,
    `Principal  ${ROLE_DEFAULT_PASSWORDS.PRINCIPAL}`,
    `School Admin  ${ROLE_DEFAULT_PASSWORDS.SCHOOL_ADMIN}`,
    `Teacher  ${ROLE_DEFAULT_PASSWORDS.TEACHER}`,
    `Substitute  ${ROLE_DEFAULT_PASSWORDS.SUBSTITUTE}`,
  ];
  let px = marginX + 10;
  const py = y + 32;
  for (const item of pwdItems) {
    doc.text(item, px, py);
    px += usableW / 5;
  }
  y += boxH + 16;

  // Role blurbs (compact)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30);
  doc.text("Role access summary", marginX, y);
  y += 12;

  for (const key of [
    "NIGRA",
    "PRINCIPAL",
    "SCHOOL_ADMIN",
    "TEACHER",
    "SUBSTITUTE",
  ] as const) {
    doc.setFontSize(8);
    const label = ROLE_LABEL[key] + "  —  ";
    doc.setFont("helvetica", "bold");
    const labelW = doc.getTextWidth(label);
    const lines = wrap(doc, ROLE_BLURB[key], usableW - labelW);
    ensureSpace(lines.length * 10 + 4);
    doc.setTextColor(20);
    doc.text(label, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);
    doc.text(lines[0] ?? "", marginX + labelW, y);
    y += 10;
    for (const line of lines.slice(1)) {
      doc.text(line, marginX + labelW, y);
      y += 10;
    }
    y += 3;
  }

  // ——— Tables ———
  function drawColumnHeaders() {
    doc.setFillColor(35, 55, 75);
    doc.rect(marginX, y, usableW, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255);
    const headerY = y + 11;
    doc.text("USER ID", cols.userId.x + 4, headerY);
    doc.text("NAME", cols.name.x + 4, headerY);
    doc.text("ROLE", cols.role.x + 4, headerY);
    doc.text("PASSWORD", cols.password.x + 4, headerY);
    doc.text("ACCESS", cols.access.x + 4, headerY);
    y += 16;
  }

  function drawSchoolTitle(title: string) {
    ensureSpace(40);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20);
    doc.text(title, marginX, y);
    y += 8;
    drawColumnHeaders();
  }

  function measureRowHeight(row: CredRow): number {
    doc.setFontSize(7.5);
    const idLines = row.userIdLines.flatMap((line) =>
      wrap(doc, line, cols.userId.w - 8)
    );
    const nameLines = wrap(doc, row.name, cols.name.w - 8);
    const roleLines = wrap(doc, row.role, cols.role.w - 8);
    const pwdLines = wrap(doc, row.password, cols.password.w - 8);
    const accessLines = wrap(doc, row.access, cols.access.w - 8);
    const lineCount = Math.max(
      idLines.length,
      nameLines.length,
      roleLines.length,
      pwdLines.length,
      accessLines.length,
      1
    );
    return Math.max(22, lineCount * 9 + 10);
  }

  function drawRow(row: CredRow, alt: boolean, schoolTitle: string) {
    const h = measureRowHeight(row);
    ensureSpace(h + 2, schoolTitle);
    if (alt) {
      doc.setFillColor(248, 249, 251);
      doc.rect(marginX, y, usableW, h, "F");
    }

    doc.setFontSize(7.5);
    doc.setTextColor(25);
    const top = y + 11;
    const lineH = 9;

    const drawCol = (
      textLines: string[],
      x: number,
      w: number,
      bold = false,
      mono = false
    ) => {
      doc.setFont(mono ? "courier" : "helvetica", bold ? "bold" : "normal");
      let yy = top;
      for (const line of textLines) {
        doc.text(line, x + 4, yy, { maxWidth: w - 8 });
        yy += lineH;
      }
    };

    doc.setFontSize(7.5);
    const idLines = row.userIdLines.flatMap((line) =>
      wrap(doc, line, cols.userId.w - 8)
    );
    const nameLines = wrap(doc, row.name, cols.name.w - 8);
    const roleLines = wrap(doc, row.role, cols.role.w - 8);
    doc.setFont("courier", "normal");
    const pwdLines = wrap(doc, row.password, cols.password.w - 8);
    doc.setFont("helvetica", "normal");
    const accessLines = wrap(doc, row.access, cols.access.w - 8);

    drawCol(idLines, cols.userId.x, cols.userId.w, true);
    drawCol(nameLines, cols.name.x, cols.name.w);
    drawCol(roleLines, cols.role.x, cols.role.w);
    drawCol(pwdLines, cols.password.x, cols.password.w, false, true);
    drawCol(accessLines, cols.access.x, cols.access.w);

    doc.setDrawColor(225);
    doc.setLineWidth(0.4);
    doc.line(marginX, y + h, marginX + usableW, y + h);
    y += h;
  }

  for (const block of blocks) {
    drawSchoolTitle(block.title);
    block.rows.forEach((row, i) => {
      drawRow(row, i % 2 === 1, block.title);
    });
  }

  drawFooter();

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(doc.output("arraybuffer")));
  console.log(`Wrote ${OUT}`);
  console.log(`Schools/blocks: ${blocks.length}`);
}

main();
