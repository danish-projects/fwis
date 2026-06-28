import {
  BEHAVIOR_RATING_CODES,
  type BehaviorRatingCode,
} from "@/lib/setup-types";
import { BehaviorCalculationService } from "@/lib/behavior";

/** Behavior rating options for attendance dropdowns (adjustment + label). */
export const BEHAVIOR_DISPLAY_OPTIONS: {
  value: BehaviorRatingCode;
  label: string;
  adjustment: number;
}[] = BEHAVIOR_RATING_CODES.map((value) => ({
  value,
  label: BehaviorCalculationService.getRatingOptionLabel(value),
  adjustment: BehaviorCalculationService.getAdjustment(value),
}));

export const ATTENDANCE_STATUS_OPTIONS: {
  value: "PRESENT" | "ABSENT" | "TARDY";
  label: string;
}[] = [
  { value: "PRESENT", label: "P" },
  { value: "ABSENT", label: "A" },
  { value: "TARDY", label: "T" },
];
