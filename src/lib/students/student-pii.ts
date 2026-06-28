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
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  address: string | null;
  emergencyContact: string | null;
};

export type StudentPiiDb = {
  dateOfBirth: string | null;
  dateOfBirthHash: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentPhoneHash: string | null;
  parentEmail: string | null;
  address: string | null;
  emergencyContact: string | null;
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

export function encryptStudentPiiForDb(plain: StudentPiiPlain): StudentPiiDb {
  const dobIso = plain.dateOfBirth ? toIsoDate(plain.dateOfBirth) : null;

  return {
    dateOfBirth: dobIso ? encryptPii(dobIso) : null,
    dateOfBirthHash: dobIso ? piiLookupHash(dobIso) : null,
    parentName: encryptOptional(plain.parentName),
    parentPhone: encryptOptional(plain.parentPhone),
    parentPhoneHash: plain.parentPhone
      ? piiLookupHash(normalizePhone(plain.parentPhone))
      : null,
    parentEmail: encryptOptional(plain.parentEmail),
    address: encryptOptional(plain.address),
    emergencyContact: encryptOptional(plain.emergencyContact),
  };
}

export function decryptStudentPii<
  T extends {
    dateOfBirth?: string | Date | null;
    parentName?: string | null;
    parentPhone?: string | null;
    parentEmail?: string | null;
    address?: string | null;
    emergencyContact?: string | null;
  },
>(student: T): T & StudentWithDecryptedPii {
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
    parentName: decryptOptional(student.parentName),
    parentPhone: decryptOptional(student.parentPhone),
    parentEmail: decryptOptional(student.parentEmail),
    address: decryptOptional(student.address),
    emergencyContact: decryptOptional(student.emergencyContact),
  };
}

export function decryptStudentPiiList<T extends Parameters<typeof decryptStudentPii>[0]>(
  students: T[]
): Array<T & StudentWithDecryptedPii> {
  return students.map((student) => decryptStudentPii(student));
}

/** True when any PII column still holds legacy plaintext. */
export function studentPiiNeedsEncryption(student: {
  dateOfBirth?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
}): boolean {
  const fields = [
    student.dateOfBirth,
    student.parentName,
    student.parentPhone,
    student.parentEmail,
    student.address,
    student.emergencyContact,
  ];
  return fields.some((value) => value != null && value !== "" && !isEncryptedValue(value));
}

export function plainStudentPiiFromDb(student: {
  dateOfBirth?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
}): StudentPiiPlain {
  let dateOfBirth: Date | null = null;
  if (student.dateOfBirth) {
    const iso = isEncryptedValue(student.dateOfBirth)
      ? decryptPii(student.dateOfBirth)
      : student.dateOfBirth;
    dateOfBirth = parseIsoDate(iso);
  }

  const read = (value: string | null | undefined) =>
    value == null || value === "" ? null : decryptOptional(value);

  return {
    dateOfBirth,
    parentName: read(student.parentName),
    parentPhone: read(student.parentPhone),
    parentEmail: read(student.parentEmail),
    address: read(student.address),
    emergencyContact: read(student.emergencyContact),
  };
}
