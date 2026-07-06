/**
 * L1 BDD gate: mock-data tests + TypeScript compile check.
 * Invoked by `npm run test:l1` before hosting builds.
 */
import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function run(command: string) {
  console.log(`\n> ${command}\n`);
  execSync(command, { stdio: "inherit", cwd: ROOT });
}

console.log("FWIS L1 BDD test gate\n");

run("npx vitest run --config vitest.config.ts");
run("npx tsc --noEmit -p tsconfig.json");

console.log("\nL1 BDD tests passed.\n");
