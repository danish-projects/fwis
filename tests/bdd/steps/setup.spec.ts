import { describe, it, expect } from "vitest";
import { formatSchoolCode } from "@/lib/school/format-school-code";
import {
  academicYearCreateSchema,
  academicYearUpdateSchema,
} from "@/lib/validations/academic-year";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";
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
});
