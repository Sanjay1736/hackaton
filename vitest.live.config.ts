import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
export default defineConfig({
  resolve: {
    alias: {
      "server-only": resolve(import.meta.dirname, "tests/server-only.ts"),
    },
  },
  test: {
    include: ["scripts/live-check.test.ts"],
    environment: "node",
    testTimeout: 65000,
  },
});
