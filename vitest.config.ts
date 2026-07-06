import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/bdd/steps/**/*.spec.ts"],
    setupFiles: ["tests/bdd/setup.ts"],
    reporters: ["verbose"],
    passWithNoTests: false,
    testTimeout: 15_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@prisma/client": path.resolve(__dirname, "./src/generated/prisma/client"),
    },
  },
});
