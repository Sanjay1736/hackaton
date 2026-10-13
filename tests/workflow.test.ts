import { describe, it, expect } from "vitest";
import { defaultInput, tasteInputSchema, resultSchema } from "../lib/schema";
import { mockTasteProvider } from "../lib/providers/mock-taste-provider";
import { runWorkflow } from "../lib/agent/workflow";
import { normalizeEntities } from "../lib/qloo/normalize";
describe("input boundaries", () => {
  it("requires a resolvable cultural category", () => {
    expect(
      tasteInputSchema.safeParse({ ...defaultInput, music: [], screen: [] })
        .success,
    ).toBe(false);
  });
  it("rejects oversized inputs and unknown fields", () => {
    expect(
      tasteInputSchema.safeParse({ ...defaultInput, music: ["x".repeat(81)] })
        .success,
    ).toBe(false);
    expect(
      tasteInputSchema.safeParse({ ...defaultInput, email: "private" }).success,
    ).toBe(false);
    expect(
      tasteInputSchema.safeParse({
        ...defaultInput,
        music: Array(7).fill("Sade"),
      }).success,
    ).toBe(false);
  });
  it("trims interests", () =>
    expect(
      tasteInputSchema.parse({ ...defaultInput, music: [" Sade "] }).music,
    ).toEqual(["Sade"]));
});
describe("normalization and provenance", () => {
  it("merges duplicate evidence without inventing IDs", async () => {
    const { entities } = await mockTasteProvider.retrieve(defaultInput);
    const e = entities[0];
    const normalized = normalizeEntities([
      e,
      { ...e, inputs: ["Other spelling"] },
    ]);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].id).toBe(e.id);
    expect(normalized[0].inputs).toEqual([e.name, "Other spelling"]);
  });
  it("uses only demo identifiers in mock mode", async () => {
    const r = await runWorkflow(defaultInput, mockTasteProvider);
    expect(r.mode).toBe("mock");
    expect(
      r.entities.every((e) => e.id.startsWith("demo-") && e.source === "demo"),
    ).toBe(true);
    expect(r.recommendations.length).toBeGreaterThan(4);
    for (const rec of r.recommendations)
      expect(
        rec.evidenceIds.every((id) => r.entities.some((e) => e.id === id)),
      ).toBe(true);
    expect(r.trace).toHaveLength(7);
  });
  it("rejects fabricated references and source claims", async () => {
    const r = await runWorkflow(defaultInput, mockTasteProvider);
    r.recommendations[0].evidenceIds = ["invented"];
    expect(resultSchema.safeParse(r).success).toBe(false);
    const r2 = await runWorkflow(defaultInput, mockTasteProvider);
    r2.mode = "live";
    expect(resultSchema.safeParse(r2).success).toBe(false);
  });
  it("does not invent suggestions for an empty retrieval", async () => {
    const r = await runWorkflow(defaultInput, {
      mode: "live",
      retrieve: async () => ({
        entities: [],
        warnings: ["No results"],
        calls: [],
      }),
    });
    expect(r.recommendations).toEqual([]);
  });
  it("explicit style choices change the interpretation", async () => {
    const r = await runWorkflow(
      {
        ...defaultInput,
        fashion: ["Streetwear"],
        colors: ["Monochrome"],
        occasion: "Gallery night",
      },
      mockTasteProvider,
    );
    expect(r.archetype).toBe("The Urban Curator");
    expect(r.palette[0]).toBe("#222523");
    expect(
      r.recommendations.find((r) => r.category === "outfit")?.explanation,
    ).toContain("Gallery night");
  });
});

describe("feedback-aware retrieval", () => {
  it("replaces a rejected demo suggestion and preserves unrelated categories", async () => {
    const first = await runWorkflow(defaultInput, mockTasteProvider);
    const next = await runWorkflow(
      {
        ...defaultInput,
        feedback: [{ id: "demo-sample-0", reason: "Already familiar" }],
      },
      mockTasteProvider,
    );
    expect(next.recommendations.some((r) => r.title === "Khruangbin")).toBe(
      false,
    );
    expect(next.recommendations.some((r) => r.title === "Cleo Sol")).toBe(true);
    expect(
      next.recommendations.find((r) => r.category === "movie")?.title,
    ).toBe(first.recommendations.find((r) => r.category === "movie")?.title);
  });
  it("does not resurface excluded items when the local catalog is exhausted", async () => {
    const next = await runWorkflow(
      {
        ...defaultInput,
        feedback: [0, 4, 8].map((i) => ({
          id: `demo-sample-${i}`,
          reason: "Not my taste",
        })),
      },
      mockTasteProvider,
    );
    expect(next.recommendations.filter((r) => r.category === "artist")).toEqual(
      [],
    );
  });
  it("bounds feedback and rejects invalid identifiers", () => {
    expect(
      tasteInputSchema.safeParse({
        ...defaultInput,
        feedback: [{ id: "invented", reason: "Not my taste" }],
      }).success,
    ).toBe(false);
    expect(
      tasteInputSchema.safeParse({
        ...defaultInput,
        feedback: Array(25).fill({
          id: "demo-sample-0",
          reason: "Not my taste",
        }),
      }).success,
    ).toBe(false);
  });
});
