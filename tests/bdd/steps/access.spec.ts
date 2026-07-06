import { describe, it, expect } from "vitest";
import type { UserRoleCode } from "@prisma/client";
import {
  getLandingPath,
  getNavForUser,
  hasPermission,
  type Permission,
} from "@/lib/auth/permissions";
import { mergeEnrollmentScope } from "@/lib/auth/section-scope";
import { IDS, mockUser } from "../mocks/fixtures";

/** @feature tests/bdd/features/access.feature */
describe("Feature: Role-based access", () => {
  it("Scenario: Super admin has all permissions", () => {
    expect(hasPermission(["SUPER_ADMIN"], "schools:delete")).toBe(true);
  });

  it("Scenario: Teacher cannot delete schools", () => {
    expect(hasPermission(["TEACHER"], "schools:delete")).toBe(false);
  });

  it("Scenario: School admin can manage enrollments", () => {
    expect(hasPermission(["SCHOOL_ADMIN"], "enrollments:create")).toBe(true);
  });

  it("Scenario: Teacher is scoped to assigned classrooms", () => {
    const scoped = mergeEnrollmentScope(mockUser(["TEACHER"]), {
      deletedAt: null,
    });
    const classroomId = scoped.classroomId;
    expect(classroomId).toMatchObject({ in: [IDS.classroomG1Boys] });
  });

  it("Scenario: Super admin navigation includes schools and users", () => {
    const hrefs = getNavForUser(["SUPER_ADMIN"]).map((item) => item.href);
    expect(hrefs).toContain("/schools");
    expect(hrefs).toContain("/users");
  });

  it("Scenario: Teacher navigation includes attendance and assessments", () => {
    const hrefs = getNavForUser(["TEACHER"]).map((item) => item.href);
    expect(hrefs).toContain("/teacher/attendance");
    expect(hrefs).toContain("/teacher/assessments");
  });

  it("Scenario: Landing path for school admin", () => {
    expect(getLandingPath("SCHOOL_ADMIN")).toBe("/dashboard/school-admin");
  });
});
