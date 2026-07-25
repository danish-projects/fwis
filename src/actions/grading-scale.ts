"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireRole } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import {
  GRADING_SCALE_ID,
  type GradingScaleConfig,
  validateGradingScale,
} from "@/lib/grades/grading-scale-types";
import { getGradingScale } from "@/lib/grades/get-grading-scale";
import { recomputeGradesForEnrollments } from "@/lib/grades/compute-enrollment-grade";

export async function loadGradingScaleForPage() {
  await requirePermission("grading-scale:read");
  return getGradingScale();
}

export async function updateGradingScale(input: GradingScaleConfig) {
  const user = await requireRole("NIGRA");

  const error = validateGradingScale(input);
  if (error) throw new Error(error);

  const previous = await getGradingScale();

  await prisma.gradingScaleConfig.upsert({
    where: { id: GRADING_SCALE_ID },
    create: {
      id: GRADING_SCALE_ID,
      weights: input.weights as unknown as Prisma.InputJsonValue,
      letterBands: input.letterBands as unknown as Prisma.InputJsonValue,
      passMinPct: input.passMinPct,
      updatedById: user.id,
    },
    update: {
      weights: input.weights as unknown as Prisma.InputJsonValue,
      letterBands: input.letterBands as unknown as Prisma.InputJsonValue,
      passMinPct: input.passMinPct,
      updatedById: user.id,
    },
  });

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true },
  });

  const batchSize = 50;
  for (let i = 0; i < enrollments.length; i += batchSize) {
    const batch = enrollments.slice(i, i + batchSize).map((e) => e.id);
    await recomputeGradesForEnrollments(batch);
  }

  await createAuditLog({
    userId: user.id,
    entity: "GradingScaleConfig",
    entityId: GRADING_SCALE_ID,
    action: "UPDATE",
    oldValues: previous as unknown as Prisma.InputJsonValue,
    newValues: input as unknown as Prisma.InputJsonValue,
  });

  revalidateTag("grading-scale", "max");
  revalidatePath("/grading-scale");
  revalidatePath("/transcript");
  revalidatePath("/teacher/transcript");
  revalidatePath("/assessments");
  revalidatePath("/enrollments");

  return { success: true, recomputed: enrollments.length };
}
