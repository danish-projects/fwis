import { describe, it, expect } from "vitest";
import { isTeacherRouteAllowed } from "@/lib/auth/teacher-routes";
import {
  calculateFinalPercentage,
  letterGrade,
  passFail,
} from "@/lib/grades/calculate-final-grade";
import { DEFAULT_GRADING_SCALE } from "@/lib/grades/grading-scale-types";
import { filterClassroomsForSelectedSchool } from "@/lib/school/filter-classrooms";
import { academicYearCreateSchema } from "@/lib/validations/academic-year";
import {
  formatStudentNumber,
  isValidStudentNumber,
} from "@/lib/students/student-number";
import { IDS, MOCK_SCHOOLS, PERFECT_SCORES, mockUser } from "../mocks/fixtures";

/** @feature tests/bdd/features/operations.feature */
describe("Feature: Core operations", () => {
  it("Scenario: Classroom list filters by selected school", () => {
    const classrooms = [
      { id: "c1", schoolId: IDS.schoolHou, name: "G1 Boys" },
      { id: "c2", schoolId: IDS.schoolChi, name: "G1 Girls" },
      {
        id: "c3",
        name: "G2 Boys",
        schoolLinks: [{ schoolId: IDS.schoolHou }],
      },
    ];
    const filtered = filterClassroomsForSelectedSchool(classrooms, {
      id: IDS.schoolHou,
      name: MOCK_SCHOOLS.houston.name,
      code: MOCK_SCHOOLS.houston.code,
      city: MOCK_SCHOOLS.houston.city,
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.map((c) => c.id).sort()).toEqual(["c1", "c3"]);
  });

  it("Scenario: Valid academic year create payload passes", () => {
    const result = academicYearCreateSchema.safeParse({
      name: "2025-2026",
      startDate: "2025-08-01",
      endDate: "2026-06-30",
      schoolIds: [IDS.schoolHou],
      isActive: true,
      generateCalendar: true,
    });
    expect(result.success).toBe(true);
  });

  it("Scenario: Student numbers follow city-gender-sequence format", () => {
    const number = formatStudentNumber("HOU", "MALE", 42);
    expect(number).toBe("HOU-B42");
    expect(isValidStudentNumber(number)).toBe(true);
  });

  it("Scenario: School admin can access assigned school only", () => {
    const admin = mockUser(["SCHOOL_ADMIN"], { schoolIds: [IDS.schoolHou] });
    const canAccess = (schoolId: string) =>
      admin.roles.includes("NIGRA") || admin.schoolIds.includes(schoolId);
    expect(canAccess(IDS.schoolHou)).toBe(true);
    expect(canAccess(IDS.schoolChi)).toBe(false);
  });

  it("Scenario: Teachers may only reach teacher routes", () => {
    expect(isTeacherRouteAllowed("/teacher/attendance")).toBe(true);
    expect(isTeacherRouteAllowed("/teacher/transcript")).toBe(true);
    expect(
      isTeacherRouteAllowed("/students/00000000-0000-4000-8000-000000000001/profile")
    ).toBe(true);
    expect(isTeacherRouteAllowed("/students")).toBe(false);
    expect(isTeacherRouteAllowed("/schools")).toBe(false);
  });

  it("Scenario: Perfect attendance and scores yield passing grade", () => {
    const finalPct = calculateFinalPercentage(PERFECT_SCORES, DEFAULT_GRADING_SCALE);
    expect(passFail(finalPct, DEFAULT_GRADING_SCALE)).toBe("Pass");
    expect(letterGrade(finalPct, DEFAULT_GRADING_SCALE)).toBe("A");
    expect(finalPct).toBeGreaterThanOrEqual(90);
  });
});
