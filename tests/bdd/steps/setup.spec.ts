import { describe, it, expect } from "vitest";
import { formatSchoolCode } from "@/lib/school/format-school-code";
import {
  academicYearCreateSchema,
  academicYearUpdateSchema,
} from "@/lib/validations/academic-year";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";
import { buildSessionTypeCounts, countAttendanceNeededDays, pickSessionTypeCounts } from "@/lib/calendar/session-type-counts";
import { calendarDateKey, parseCalendarDateInput } from "@/lib/calendar/calendar-date";
import { generateSundays } from "@/lib/calendar/generate-sundays";
import { buildImportCalendar, validateImportCalendar } from "../../../scripts/import/validate-calendar";
import {
  buildHoustonAdminSpecs,
  isHoustonSchool,
} from "../../../scripts/import/ensure-houston-admin-logins";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  parseSessionToken,
} from "@/lib/auth/session-cookie";
import { sectionNameForGender } from "@/lib/staff/gender-section";
import { buildClassroomListWhere } from "@/lib/auth/section-scope";
import { IDS, mockUser } from "../mocks/fixtures";

/** @feature tests/bdd/features/setup.feature */
describe("Feature: School setup", () => {
  it("Scenario: School codes use FWIS city prefix", () => {
    expect(formatSchoolCode("HOU")).toBe("FWIS-HOU");
  });

  it("Scenario: Academic year create requires at least one school", () => {
    const result = academicYearCreateSchema.safeParse({
      name: "2025-2026",
      startDate: "2025-08-01",
      endDate: "2026-06-30",
      schoolIds: [],
      isActive: false,
      generateCalendar: false,
    });
    expect(result.success).toBe(false);
  });

  it("Scenario: Academic year dates must be ordered", () => {
    const result = academicYearUpdateSchema.safeParse({
      name: "2025-2026",
      startDate: "2026-06-01",
      endDate: "2025-08-01",
      schoolIds: [IDS.schoolHou],
      isActive: false,
      generateCalendar: false,
    });
    expect(result.success).toBe(false);
  });

  it("Scenario: Calendar marks instructional Sundays", () => {
    expect(isAttendanceNeeded("INSTRUCTIONAL")).toBe(true);
  });

  it("Scenario: Holidays do not require attendance", () => {
    expect(isAttendanceNeeded("HOLIDAY")).toBe(false);
  });

  it("Scenario: Male teachers map to Boys section", () => {
    expect(sectionNameForGender("MALE")).toBe("Boys");
  });

  it("Scenario: Classroom list is scoped to selected school", () => {
    const where = buildClassroomListWhere(mockUser(["NIGRA"]), {
      schoolId: IDS.schoolHou,
    });
    expect(where).toMatchObject({
      deletedAt: null,
      schoolLinks: {
        some: { schoolId: IDS.schoolHou, deletedAt: null },
      },
    });
  });

  it("Scenario: Generated Sundays include the academic year end date when it is a Sunday", () => {
    const start = parseCalendarDateInput("2025-08-10");
    const end = parseCalendarDateInput("2026-05-10");
    const keys = generateSundays(start, end).map(calendarDateKey);
    expect(keys).toContain("2026-05-10");
  });

  it("Scenario: Import calendar accepts optional row on the year end Sunday", () => {
    const start = parseCalendarDateInput("2025-08-10");
    const end = parseCalendarDateInput("2026-05-10");
    const calendar = buildImportCalendar(start, end, [
      { date: "2026-05-10", session_type: "GRADUATION" },
    ]);
    expect(calendar.get("2026-05-10")).toBe("GRADUATION");
  });

  it("Scenario: Import calendar does not require assessment rows for every student", () => {
    const start = parseCalendarDateInput("2025-08-10");
    const end = parseCalendarDateInput("2026-05-10");
    const summary = validateImportCalendar(
      start,
      end,
      [{ date: "2025-08-10", session_type: "QUIZ_1" }],
      [],
      []
    );
    expect(summary.calendarAssessmentColumns).toContain("quiz_1");
  });

  it("Scenario: Houston import defines fifteen standard login accounts", () => {
    expect(isHoustonSchool("Houston")).toBe(true);
    expect(isHoustonSchool("Chicago")).toBe(false);
    const logins = buildHoustonAdminSpecs().map((spec) => spec.loginUserId);
    expect(logins).toContain("hou.principal");
    expect(logins).toContain("hou.m.admin");
    expect(logins).toContain("hou.b.g3");
    expect(logins).toContain("hou.b.g6");
    expect(logins).toHaveLength(15);
  });

  it("Scenario: Calendar session type counts summarize school year days", () => {
    const counts = buildSessionTypeCounts([
      { sessionType: "INSTRUCTIONAL" },
      { sessionType: "INSTRUCTIONAL" },
      { sessionType: "QUIZ_1" },
      { sessionType: "HOLIDAY" },
    ]);
    expect(counts.find((item) => item.sessionType === "INSTRUCTIONAL")?.count).toBe(
      2
    );
    expect(counts.find((item) => item.sessionType === "QUIZ_1")?.count).toBe(1);
    expect(counts.find((item) => item.sessionType === "HOLIDAY")?.count).toBe(1);
    expect(counts.find((item) => item.sessionType === "FINAL_EXAM")?.count).toBe(0);

    const picked = pickSessionTypeCounts(counts, ["INSTRUCTIONAL", "QUIZ_1"]);
    expect(picked).toHaveLength(2);
    expect(picked[0]?.count).toBe(2);
    expect(picked[1]?.count).toBe(1);

    expect(
      countAttendanceNeededDays([
        { sessionType: "INSTRUCTIONAL" },
        { sessionType: "QUIZ_1" },
        { sessionType: "HOLIDAY" },
        { sessionType: "PARENT_MEETING" },
      ])
    ).toBe(2);
  });

  it("Scenario: Password hashing verifies login credentials", async () => {
    const hash = await hashPassword("test-password");
    expect(await verifyPassword("test-password", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("Scenario: Session tokens round-trip with Web Crypto signing", async () => {
    process.env.AUTH_SESSION_SECRET = "test-session-secret-at-least-32-chars";
    const token = await createSessionToken("00000000-0000-4000-8000-000000000001");
    const payload = await parseSessionToken(token);
    expect(payload?.userId).toBe("00000000-0000-4000-8000-000000000001");
    expect(payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
