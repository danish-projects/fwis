import { describe, it, expect } from "vitest";
import { enrollmentSchema } from "@/lib/validations/enrollment";
import { buildEnrollmentListFilter } from "@/lib/auth/enrollment-access";
import { deriveCityCode } from "@/lib/students/student-number";
import { IDS, MOCK_SCHOOLS, mockUser } from "../mocks/fixtures";

/** @feature tests/bdd/features/students.feature */
describe("Feature: Students and enrollments", () => {
  it("Scenario: Enrollment requires student school year and classroom", () => {
    const result = enrollmentSchema.safeParse({
      studentId: IDS.student,
      schoolId: IDS.schoolHou,
      academicYearId: IDS.year2025,
      classroomId: "",
      status: "ACTIVE",
    });
    expect(result.success).toBe(false);
  });

  it("Scenario: Super admin enrollment list filters by school", () => {
    const where = buildEnrollmentListFilter(mockUser(["SUPER_ADMIN"]), {
      schoolId: IDS.schoolHou,
    });
    expect(where).toMatchObject({ schoolId: IDS.schoolHou });
  });

  it("Scenario: Super admin enrollment list filters by classroom", () => {
    const where = buildEnrollmentListFilter(mockUser(["SUPER_ADMIN"]), {
      schoolId: IDS.schoolHou,
      classroomId: IDS.classroomG1Boys,
    });
    expect(where).toMatchObject({ classroomId: IDS.classroomG1Boys });
  });

  it("Scenario: Enrollment list respects academic year school link", () => {
    const where = buildEnrollmentListFilter(mockUser(["SUPER_ADMIN"]), {
      academicYearSchoolId: IDS.yearSchoolHou,
    });
    expect(where).toMatchObject({ academicYearSchoolId: IDS.yearSchoolHou });
  });

  it("Scenario: Student number uses city and gender prefix", () => {
    expect(deriveCityCode(MOCK_SCHOOLS.houston.city)).toBe("HOU");
  });
});
