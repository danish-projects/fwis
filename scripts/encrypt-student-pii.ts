/**
 * Encrypt existing student PII at rest (AES-256-GCM).
 *
 * Usage: npm run db:encrypt-pii
 */
import { config } from "dotenv";
import { createPrismaClient } from "../src/lib/prisma";
import {
  encryptStudentPiiForDb,
  plainStudentPiiFromDb,
  studentPiiNeedsEncryption,
} from "../src/lib/students/student-pii";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Missing DATABASE_URL or DIRECT_URL");

const prisma = createPrismaClient(url);

async function main() {
  const students = await prisma.student.findMany({
    select: {
      id: true,
      dateOfBirth: true,
      emailAddress: true,
      emergencyContact: true,
      streetAddress: true,
      city: true,
      stateProvince: true,
      zipPostalCode: true,
      country: true,
      fatherGuardianFirstName: true,
      fatherGuardianLastName: true,
      fatherMobileWhatsappNumber: true,
      motherGuardianFirstName: true,
      motherGuardianLastName: true,
      motherMobileWhatsappNumber: true,
    },
  });

  let encrypted = 0;
  for (const student of students) {
    if (!studentPiiNeedsEncryption(student)) continue;

    const plain = plainStudentPiiFromDb(student);
    const pii = encryptStudentPiiForDb(plain);

    await prisma.student.update({
      where: { id: student.id },
      data: pii,
    });
    encrypted++;
  }

  console.log(`Encrypted PII for ${encrypted} student(s) (${students.length} total).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
