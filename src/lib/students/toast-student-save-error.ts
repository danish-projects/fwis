"use client";

import { toast } from "sonner";
import { toStudentSaveUserError } from "@/lib/students/student-save-errors";

/** Show a clear, actionable student save/load error in the UI. */
export function toastStudentSaveError(
  error: unknown,
  fallbackTitle = "Could not save student"
) {
  const { title, description } = toStudentSaveUserError(error, fallbackTitle);
  toast.error(title, {
    description,
    duration: 12_000,
  });
}
