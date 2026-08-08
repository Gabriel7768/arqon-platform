import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    reporters: ["verbose"],
    env: {
      SESSION_SECRET: "arqon-test-secret-do-not-use-in-prod",
    },
  },
});
