import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PII_FIELDS = new Set([
  "parentName",
  "parentPhone",
  "parentEmail",
  "address",
  "emergencyContact",
  "dateOfBirth",
  "password",
]);

function sanitizeAuditValue(
  value: Prisma.InputJsonValue | undefined
): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== "object" || Array.isArray(value)) return value;

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (PII_FIELDS.has(key)) continue;
    sanitized[key] = val;
  }
  return sanitized as Prisma.InputJsonValue;
}

type AuditInput = {
  userId?: string | null;
  schoolId?: string | null;
  entity: string;
  entityId?: string | null;
  action: AuditAction;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function createAuditLog(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? undefined,
        schoolId: input.schoolId ?? undefined,
        entity: input.entity,
        entityId: input.entityId ?? undefined,
        action: input.action,
        oldValues: sanitizeAuditValue(input.oldValues),
        newValues: sanitizeAuditValue(input.newValues),
        ipAddress: input.ipAddress ?? undefined,
        userAgent: input.userAgent ?? undefined,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
