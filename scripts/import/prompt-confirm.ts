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
  console.log("Roster records that will be DELETED (this school and year only):");
  console.log(options.countsSummary);
  console.log("");
  console.log("NEVER deleted: app user logins (hou.principal, hou.b.g1, …), passwords,");
  console.log("roles, academic year, calendar, holidays, or classrooms.");
  console.log("Other schools and other academic years will NOT be affected.");
  console.log("");

  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(
      'Type "yes" to replace Staff/Students roster and continue import (logins kept), or "no" to cancel with no changes: '
    );
    const normalized = answer.trim().toLowerCase();
    return normalized === "yes" || normalized === "y";
  } finally {
    rl.close();
  }
}
