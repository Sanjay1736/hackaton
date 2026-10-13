import { describe, it, expect } from "vitest";
import { defaultInput, resultSchema } from "../lib/schema";
import { runWorkflow, choosePalette } from "../lib/agent/workflow";
import { mockTasteProvider } from "../lib/providers/mock-taste-provider";
import { composeStyling } from "../lib/agent/styling";
describe("preference dependence", () => {
  it("changes cultural picks and outfits for distinct selected profiles", async () => {
    const a = await runWorkflow(defaultInput, mockTasteProvider);
    const b = await runWorkflow(
      {
        ...defaultInput,
        music: ["Radiohead"],
        screen: ["Interstellar"],
        fashion: ["Streetwear"],
        lifestyle: ["Nature walks"],
        colors: ["Jewel tones"],
      },
      mockTasteProvider,
    );
    for (const category of ["artist", "movie", "brand", "book"])
      expect(
        a.recommendations.find((r) => r.category === category)?.title,
      ).not.toBe(b.recommendations.find((r) => r.category === category)?.title);
    expect(
      a.recommendations.find((r) => r.styling)?.styling?.pieces,
    ).not.toEqual(b.recommendations.find((r) => r.styling)?.styling?.pieces);
    expect(b.entities.every((e) => e.source === "demo")).toBe(true);
  });
  it("does not recommend an artist the user already entered", async () => {
    const result = await runWorkflow(
      { ...defaultInput, music: ["Khruangbin"] },
      mockTasteProvider,
    );
    expect(result.recommendations.some((r) => r.title === "Khruangbin")).toBe(
      false,
    );
  });
  it("produces stable results independent of preference ordering", async () => {
    const a = await runWorkflow(defaultInput, mockTasteProvider);
    const b = await runWorkflow(
      { ...defaultInput, music: [...defaultInput.music].reverse() },
      mockTasteProvider,
    );
    expect(a.recommendations.map((r) => r.title)).toEqual(
      b.recommendations.map((r) => r.title),
    );
  });
  it("handles arbitrary custom style text without prototype lookup crashes", () => {
    for (const style of ["constructor", "__proto__", "toString"])
      expect(() =>
        composeStyling({ ...defaultInput, fashion: [style] }),
      ).not.toThrow();
  });
  it("keeps occasion-specific layers despite a lower budget", () => {
    const r = composeStyling({
      ...defaultInput,
      budget: "Under $100",
      occasion: "Outdoor walk",
    });
    expect(r.pieces).toContain("Packable weather layer");
    expect(r.pieces).toContain("Supportive walking shoes");
  });
  it("honors all offered palettes and safely falls back for custom names", () => {
    expect(
      new Set(
        [
          "Earth tones",
          "Monochrome",
          "Jewel tones",
          "Pastels",
          "Warm neutrals",
          "Bright accents",
        ].map((c) => choosePalette([c]).join(",")),
      ).size,
    ).toBe(6);
    expect(choosePalette(["constructor"])).toEqual(choosePalette([]));
  });
  it("rejects missing seed provenance and invalid live identifiers", async () => {
    const r = await runWorkflow(defaultInput, mockTasteProvider);
    r.entities.find((e) => e.role === "recommendation")!.seedIds = ["unknown"];
    expect(resultSchema.safeParse(r).success).toBe(false);
    const live = await runWorkflow(defaultInput, mockTasteProvider);
    live.mode = "live";
    live.entities.forEach((e) => (e.source = "qloo"));
    expect(resultSchema.safeParse(live).success).toBe(false);
  });
});
