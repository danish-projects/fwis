import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export async function confirmSchoolYearPurge(options: {
  schoolName: string;
  city: string;
  state: string;
  academicYear: string;
  countsSummary: string;
}): Promise<boolean> {
  console.log("");
  console.log(
    `Existing import data found for "${options.schoolName}" (${options.city}, ${options.state})`
  );
  console.log(`Academic year: ${options.academicYear}`);
  console.log("");
  console.log("Records that will be DELETED (this school and year only):");
  console.log(options.countsSummary);
  console.log("");
  console.log("Other schools and other academic years will NOT be affected.");
  console.log("");

  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(
      'Type "yes" to delete the records above and continue import, or "no" to cancel: '
    );
    const normalized = answer.trim().toLowerCase();
    return normalized === "yes" || normalized === "y";
  } finally {
    rl.close();
  }
}
