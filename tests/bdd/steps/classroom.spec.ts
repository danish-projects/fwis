import { describe, it, expect } from "vitest";
import { calculateAttendancePercentage } from "@/lib/grades/attendance-percentage";
import { calculateBehaviorScore } from "@/lib/behavior";
import {
  buildMissingLessonPlanReasons,
  isLessonPlanInstructionDay,
} from "@/lib/lesson-plans/instruction-day";
import {
  calculateFinalPercentage,
  letterGrade,
} from "@/lib/grades/calculate-final-grade";
import { PERFECT_SCORES } from "../mocks/fixtures";

/** @feature tests/bdd/features/classroom.feature */
describe("Feature: Classroom Sunday operations", () => {
  it("Scenario: Present and tardy count toward attendance percentage", () => {
    expect(
      calculateAttendancePercentage({
        totalCountableDays: 8,
        presentOrTardyDays: 7,
      })
    ).toBe(87.5);
  });

  it("Scenario: Zero countable days defaults attendance to perfect", () => {
    expect(
      calculateAttendancePercentage({
        totalCountableDays: 0,
        presentOrTardyDays: 0,
      })
    ).toBe(100);
  });

  it("Scenario: Outstanding behavior increases score", () => {
    expect(calculateBehaviorScore(["OUTSTANDING"])).toBeGreaterThan(85);
  });

  it("Scenario: Instructional day with drive folder allows lesson plan lookup", () => {
    expect(isLessonPlanInstructionDay("INSTRUCTIONAL")).toBe(true);
    const reasons = buildMissingLessonPlanReasons({
      gradeName: "Grade 1",
      lessonPlanNumber: 1,
      academicYearName: "2025-2026",
      driveConfigured: true,
    });
    expect(reasons.some((r) => r.includes("Grade 1"))).toBe(true);
  });

  it("Scenario: Quiz days are not instructional lesson plan days", () => {
    expect(isLessonPlanInstructionDay("QUIZ_1")).toBe(false);
  });

  it("Scenario: Perfect assessment scores yield high final percentage", () => {
    expect(calculateFinalPercentage(PERFECT_SCORES)).toBeGreaterThanOrEqual(99);
  });

  it("Scenario: Letter grade A for excellent performance", () => {
    expect(letterGrade(95)).toBe("A");
  });

  it("Scenario: Letter grade D for scores below passing threshold", () => {
    expect(letterGrade(69.9)).toBe("D");
    expect(letterGrade(0)).toBe("D");
    expect(letterGrade(70)).toBe("C");
  });
});
