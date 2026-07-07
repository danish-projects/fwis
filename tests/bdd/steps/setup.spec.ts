import { describe, it, expect } from "vitest";
import { formatSchoolCode } from "@/lib/school/format-school-code";
import {
  academicYearCreateSchema,
  academicYearUpdateSchema,
} from "@/lib/validations/academic-year";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";
import { buildSessionTypeCounts, countAttendanceNeededDays, pickSessionTypeCounts } from "@/lib/calendar/session-type-counts";
import { sectionNameForGender } from "@/lib/teachers/gender-section";
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
    const where = buildClassroomListWhere(mockUser(["SUPER_ADMIN"]), {
      schoolId: IDS.schoolHou,
    });
    expect(where).toMatchObject({ schoolId: IDS.schoolHou, deletedAt: null });
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
});
