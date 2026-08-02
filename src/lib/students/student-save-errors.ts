import { ZodError } from "zod";

const FIELD_LABELS: Record<string, string> = {
  firstName: "Student first name",
  lastName: "Student last name",
  gender: "Gender",
  dateOfBirth: "Date of birth",
  emailAddress: "Email address",
  streetAddress: "Street address",
  city: "City",
  stateProvince: "State / province",
  zipPostalCode: "Zip / postal code",
  country: "Country",
  fatherGuardianFirstName: "Father / guardian first name",
  fatherGuardianLastName: "Father / guardian last name",
  fatherMobileWhatsappNumber: "Father / guardian mobile",
  motherGuardianFirstName: "Mother / guardian first name",
  motherGuardianLastName: "Mother / guardian last name",
  motherMobileWhatsappNumber: "Mother / guardian mobile",
  emergencyContact: "Emergency contact",
  enrollmentDate: "Enrollment date",
  isActive: "Active",
};

export type StudentSaveUserError = {
  /** Short title for toast */
  title: string;
  /** What happened + what to do */
  description: string;
};

export type DuplicateMatchReason = "name_and_dob" | "name_only";

export function duplicateStudentUserError(
  reason: DuplicateMatchReason,
  mode: "create" | "update"
): StudentSaveUserError {
  if (reason === "name_and_dob") {
    return {
      title: "Student already exists",
      description:
        mode === "create"
          ? "A student with the same name and date of birth is already in the system. Open Students, search by name, and use that record (or enroll them) instead of adding again."
          : "Another student has the same name and date of birth. Confirm you are editing the correct record, or adjust the name / date of birth if this is a different child.",
    };
  }

  return {
    title: "Same name already exists",
    description:
      mode === "create"
        ? "Another student has the same first and last name (no date of birth to tell them apart). Add a date of birth, or open Students and use the existing record."
        : "Another student has the same first and last name. Add or correct the date of birth so each child is unique, or confirm you are editing the right record.",
  };
}

function formatZodUserError(error: ZodError): StudentSaveUserError {
  const parts = error.issues.slice(0, 4).map((issue) => {
    const key = String(issue.path[0] ?? "");
    const label = FIELD_LABELS[key] ?? (key || "A field");
    return `${label}: ${issue.message}`;
  });

  return {
    title: "Please fix the highlighted fields",
    description:
      parts.join(" · ") +
      (error.issues.length > 4 ? " · …" : "") +
      " Correct these on the form, then save again.",
  };
}

/** Turn thrown save failures into a clear title + actionable description for the UI. */
export function toStudentSaveUserError(
  error: unknown,
  fallbackTitle: string
): StudentSaveUserError {
  if (error instanceof ZodError) {
    return formatZodUserError(error);
  }

  if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
    try {
      return formatZodUserError(error as ZodError);
    } catch {
      /* fall through */
    }
  }

  if (error instanceof Error) {
    const msg = error.message;

    if (
      msg.includes("PII_ENCRYPTION_KEY") ||
      msg.includes("AES-256") ||
      msg.includes("Invalid key length") ||
      msg.includes("ERR_CRYPTO") ||
      msg.includes("PII encryption is not configured")
    ) {
      return {
        title: "Cannot save student (server setup)",
        description:
          "Student personal data encryption is not configured on the server. Ask an administrator to set PII_ENCRYPTION_KEY and restart the app, then try again.",
      };
    }

    if (msg.includes("Unauthorized") || msg.includes("Forbidden")) {
      return {
        title: "You cannot save this student",
        description:
          "Your account does not have permission to update this record. Ask a school admin or principal for access, or open a student assigned to your grade.",
      };
    }

    if (msg.includes("Student not found")) {
      return {
        title: "Student not found",
        description:
          "This student may have been deleted. Go back to Students and open the record again.",
      };
    }

    // Structured errors thrown as "TITLE||DESCRIPTION"
    const split = msg.indexOf("||");
    if (split > 0) {
      return {
        title: msg.slice(0, split).trim(),
        description: msg.slice(split + 2).trim(),
      };
    }

    if (msg.includes("Server Components render") || msg.includes("digest")) {
      return {
        title: "Save failed",
        description:
          "The server could not complete this save. Check the form for invalid values, confirm this is not the same student name and date of birth as an existing record, then try again. If it keeps failing, ask an administrator to check server logs.",
      };
    }

    return {
      title: fallbackTitle,
      description: msg,
    };
  }

  return {
    title: fallbackTitle,
    description:
      "Something went wrong while saving. Check the form and try again. If the problem continues, contact your administrator.",
  };
}

export function throwStudentSaveUserError(error: StudentSaveUserError): never {
  throw new Error(`${error.title}||${error.description}`);
}
