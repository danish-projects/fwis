import {
  decryptPii,
  encryptPii,
  isEncryptedValue,
  normalizePhone,
  parseIsoDate,
  piiLookupHash,
  toIsoDate,
} from "@/lib/crypto/pii-crypto";

export type StudentPiiPlain = {
  dateOfBirth: Date | null;
  emailAddress: string | null;
  emergencyContact: string | null;
  streetAddress: string | null;
  city: string | null;
  stateProvince: string | null;
  zipPostalCode: string | null;
  country: string | null;
  fatherGuardianFirstName: string | null;
  fatherGuardianLastName: string | null;
  fatherMobileWhatsappNumber: string | null;
  motherGuardianFirstName: string | null;
  motherGuardianLastName: string | null;
  motherMobileWhatsappNumber: string | null;
};

export type StudentPiiDb = {
  dateOfBirth: string | null;
  dateOfBirthHash: string | null;
  emailAddress: string | null;
  emergencyContact: string | null;
  streetAddress: string | null;
  city: string | null;
  stateProvince: string | null;
  zipPostalCode: string | null;
  country: string | null;
  fatherGuardianFirstName: string | null;
  fatherGuardianLastName: string | null;
  fatherMobileWhatsappNumber: string | null;
  fatherMobileWhatsappHash: string | null;
  motherGuardianFirstName: string | null;
  motherGuardianLastName: string | null;
  motherMobileWhatsappNumber: string | null;
  motherMobileWhatsappHash: string | null;
};

export type StudentWithDecryptedPii = Omit<StudentPiiPlain, "dateOfBirth"> & {
  dateOfBirth: Date | null;
};

function encryptOptional(value: string | null): string | null {
  if (!value) return null;
  return encryptPii(value);
}

function decryptOptional(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  return decryptPii(value);
}

function phoneHash(value: string | null): string | null {
  if (!value) return null;
  return piiLookupHash(normalizePhone(value));
}

export function encryptStudentPiiForDb(plain: StudentPiiPlain): StudentPiiDb {
  const dobIso = plain.dateOfBirth ? toIsoDate(plain.dateOfBirth) : null;

  return {
    dateOfBirth: dobIso ? encryptPii(dobIso) : null,
    dateOfBirthHash: dobIso ? piiLookupHash(dobIso) : null,
    emailAddress: encryptOptional(plain.emailAddress),
    emergencyContact: encryptOptional(plain.emergencyContact),
    streetAddress: encryptOptional(plain.streetAddress),
    city: encryptOptional(plain.city),
    stateProvince: encryptOptional(plain.stateProvince),
    zipPostalCode: encryptOptional(plain.zipPostalCode),
    country: encryptOptional(plain.country),
    fatherGuardianFirstName: encryptOptional(plain.fatherGuardianFirstName),
    fatherGuardianLastName: encryptOptional(plain.fatherGuardianLastName),
    fatherMobileWhatsappNumber: encryptOptional(plain.fatherMobileWhatsappNumber),
    fatherMobileWhatsappHash: phoneHash(plain.fatherMobileWhatsappNumber),
    motherGuardianFirstName: encryptOptional(plain.motherGuardianFirstName),
    motherGuardianLastName: encryptOptional(plain.motherGuardianLastName),
    motherMobileWhatsappNumber: encryptOptional(plain.motherMobileWhatsappNumber),
    motherMobileWhatsappHash: phoneHash(plain.motherMobileWhatsappNumber),
  };
}

type StudentPiiColumns = {
  dateOfBirth?: string | Date | null;
  emailAddress?: string | null;
  emergencyContact?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  zipPostalCode?: string | null;
  country?: string | null;
  fatherGuardianFirstName?: string | null;
  fatherGuardianLastName?: string | null;
  fatherMobileWhatsappNumber?: string | null;
  motherGuardianFirstName?: string | null;
  motherGuardianLastName?: string | null;
  motherMobileWhatsappNumber?: string | null;
};

export function decryptStudentPii<T extends StudentPiiColumns>(
  student: T
): T & StudentWithDecryptedPii {
  let dateOfBirth: Date | null = null;
  if (student.dateOfBirth != null) {
    const raw =
      student.dateOfBirth instanceof Date
        ? toIsoDate(student.dateOfBirth)
        : String(student.dateOfBirth);
    const iso = decryptPii(raw);
    dateOfBirth = iso ? parseIsoDate(iso) : null;
  }

  return {
    ...student,
    dateOfBirth,
    emailAddress: decryptOptional(student.emailAddress),
    emergencyContact: decryptOptional(student.emergencyContact),
    streetAddress: decryptOptional(student.streetAddress),
    city: decryptOptional(student.city),
    stateProvince: decryptOptional(student.stateProvince),
    zipPostalCode: decryptOptional(student.zipPostalCode),
    country: decryptOptional(student.country),
    fatherGuardianFirstName: decryptOptional(student.fatherGuardianFirstName),
    fatherGuardianLastName: decryptOptional(student.fatherGuardianLastName),
    fatherMobileWhatsappNumber: decryptOptional(student.fatherMobileWhatsappNumber),
    motherGuardianFirstName: decryptOptional(student.motherGuardianFirstName),
    motherGuardianLastName: decryptOptional(student.motherGuardianLastName),
    motherMobileWhatsappNumber: decryptOptional(student.motherMobileWhatsappNumber),
  };
}

export function decryptStudentPiiList<T extends Parameters<typeof decryptStudentPii>[0]>(
  students: T[]
): Array<T & StudentWithDecryptedPii> {
  return students.map((student) => decryptStudentPii(student));
}

/** True when any PII column still holds legacy plaintext. */
export function studentPiiNeedsEncryption(student: StudentPiiColumns): boolean {
  const fields: Array<string | null | undefined> = [
    typeof student.dateOfBirth === "string" ? student.dateOfBirth : null,
    student.emailAddress,
    student.emergencyContact,
    student.streetAddress,
    student.city,
    student.stateProvince,
    student.zipPostalCode,
    student.country,
    student.fatherGuardianFirstName,
    student.fatherGuardianLastName,
    student.fatherMobileWhatsappNumber,
    student.motherGuardianFirstName,
    student.motherGuardianLastName,
    student.motherMobileWhatsappNumber,
  ];
  return fields.some((value) => value != null && value !== "" && !isEncryptedValue(value));
}

export function plainStudentPiiFromDb(student: StudentPiiColumns): StudentPiiPlain {
  let dateOfBirth: Date | null = null;
  if (student.dateOfBirth) {
    const raw =
      student.dateOfBirth instanceof Date
        ? toIsoDate(student.dateOfBirth)
        : student.dateOfBirth;
    const iso = isEncryptedValue(raw) ? decryptPii(raw) : raw;
    dateOfBirth = parseIsoDate(iso);
  }

  const read = (value: string | null | undefined) =>
    value == null || value === ""
      ? null
      : isEncryptedValue(value)
        ? decryptOptional(value)
        : value;

  return {
    dateOfBirth,
    emailAddress: read(student.emailAddress),
    emergencyContact: read(student.emergencyContact),
    streetAddress: read(student.streetAddress),
    city: read(student.city),
    stateProvince: read(student.stateProvince),
    zipPostalCode: read(student.zipPostalCode),
    country: read(student.country),
    fatherGuardianFirstName: read(student.fatherGuardianFirstName),
    fatherGuardianLastName: read(student.fatherGuardianLastName),
    fatherMobileWhatsappNumber: read(student.fatherMobileWhatsappNumber),
    motherGuardianFirstName: read(student.motherGuardianFirstName),
    motherGuardianLastName: read(student.motherGuardianLastName),
    motherMobileWhatsappNumber: read(student.motherMobileWhatsappNumber),
  };
}

export function composeGuardianDisplayName(parts: {
  fatherGuardianFirstName?: string | null;
  fatherGuardianLastName?: string | null;
  motherGuardianFirstName?: string | null;
  motherGuardianLastName?: string | null;
}): string | null {
  const father = [parts.fatherGuardianFirstName, parts.fatherGuardianLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const mother = [parts.motherGuardianFirstName, parts.motherGuardianLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (father && mother) return `${father} / ${mother}`;
  return father || mother || null;
}

export function composeAddressDisplay(parts: {
  streetAddress?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  zipPostalCode?: string | null;
  country?: string | null;
}): string | null {
  const line = [
    parts.streetAddress,
    [parts.city, parts.stateProvince].filter(Boolean).join(", "),
    parts.zipPostalCode,
    parts.country,
  ]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(", ");
  return line || null;
}
