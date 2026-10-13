import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
// This synthetic value is never sent to Qloo. It tests build-time serialization.
const env = {
  ...process.env,
  TASTEWEAVE_TEST_BUILD: "1",
  TASTEWEAVE_DATA_MODE: "mock",
  QLOO_API_KEY: `tasteweave-build-canary-${randomUUID()}`,
};
for (const args of [
  ["node_modules/next/dist/bin/next", "build", "--webpack"],
  ["scripts/check-client-secrets.mjs"],
]) {
  const run = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (run.status !== 0) {
    process.exit(run.status ?? 1);
  }
}
