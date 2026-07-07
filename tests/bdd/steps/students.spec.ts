import { describe, it, expect } from "vitest";
import { enrollmentSchema } from "@/lib/validations/enrollment";
import { buildEnrollmentListFilter } from "@/lib/auth/enrollment-access";
import { buildStudentListFilter } from "@/lib/auth/student-access";
import { studentListSchema } from "@/lib/validations/student";
import { deriveCityCode } from "@/lib/students/student-number";
import { IDS, MOCK_SCHOOLS, mockUser } from "../mocks/fixtures";

/** @feature tests/bdd/features/students.feature */
describe("Feature: Students and enrollments", () => {
  it("Scenario: Student list filter accepts empty and boolean active status", () => {
    expect(studentListSchema.parse({ isActive: "" }).isActive).toBeUndefined();
    expect(studentListSchema.parse({ isActive: "true" }).isActive).toBe(true);
    expect(studentListSchema.parse({ isActive: false }).isActive).toBe(false);
  });

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

  it("Scenario: Super admin student list respects selected school", () => {
    const where = buildStudentListFilter(mockUser(["SUPER_ADMIN"]), {
      listSchoolId: IDS.schoolHou,
    });
    expect(where).toMatchObject({
      AND: expect.arrayContaining([
        expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              enrollments: {
                some: expect.objectContaining({ schoolId: IDS.schoolHou }),
              },
            }),
          ]),
        }),
      ]),
    });
  });

  it("Scenario: Student name search is combined with school scope", () => {
    const where = buildStudentListFilter(mockUser(["SUPER_ADMIN"]), {
      listSchoolId: IDS.schoolHou,
      search: "Ali",
    });
    expect(where).toMatchObject({
      AND: expect.arrayContaining([
        expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              firstName: { contains: "Ali", mode: "insensitive" },
            }),
          ]),
        }),
        expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              enrollments: {
                some: expect.objectContaining({ schoolId: IDS.schoolHou }),
              },
            }),
          ]),
        }),
      ]),
    });
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
