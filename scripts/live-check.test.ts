// Opt-in integration check. Never included in npm test; consumes real Qloo quota.
import { test, expect } from "vitest";
import { existsSync } from "node:fs";
import { runWorkflow } from "../lib/agent/workflow";
import { qlooTasteProvider } from "../lib/providers/qloo-taste-provider";
import { defaultInput } from "../lib/schema";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
test("live retrieval and exclusion preserve real provenance", async () => {
  const input = { ...defaultInput, music: ["Sade"], screen: [] };
  const first = await runWorkflow(input, qlooTasteProvider);
  const seeds = first.entities.filter((e) => e.role === "seed");
  const suggestions = first.entities.filter((e) => e.role === "recommendation");
  expect(seeds.length, "resolved seed count").toBeGreaterThan(0);
  expect(suggestions.length, "retrieved suggestion count").toBeGreaterThan(0);
  expect(
    first.entities.every((e) => e.source === "qloo"),
    "all entities have live provenance",
  ).toBe(true);
  const categoryCounts = Object.fromEntries(
    ["artist", "movie", "brand", "book"].map((category) => [
      category,
      suggestions.filter((e) => e.category === category).length,
    ]),
  );
  console.log(
    "Live verification summary:",
    JSON.stringify({
      mode: first.mode,
      seeds: seeds.length,
      categories: categoryCounts,
      recommendations: first.recommendations.length,
      warnings: first.warnings.length,
    }),
  );
  const rejected = suggestions[0].id;
  const next = await runWorkflow(
    {
      ...input,
      feedback: [{ id: rejected, reason: "Show me something else" }],
    },
    qlooTasteProvider,
  );
  expect(
    next.entities.some((e) => e.role === "recommendation" && e.id === rejected),
    "excluded item did not resurface",
  ).toBe(false);
  expect(
    next.entities.some((e) => e.role === "recommendation"),
    "refinement returned suggestions",
  ).toBe(true);
  console.log(
    "Live refinement verified; no credentials or raw Qloo data recorded.",
  );
});
