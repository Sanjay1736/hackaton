import { describe, it, expect } from "vitest";
import { defaultInput } from "../lib/schema";
import { composeStyling } from "../lib/agent/styling";
import { runWorkflow } from "../lib/agent/workflow";
import { mockTasteProvider } from "../lib/providers/mock-taste-provider";
describe("constraint-driven styling", () => {
  it("changes actual pieces for distinct style choices", () => {
    const street = composeStyling({ ...defaultInput, fashion: ["Streetwear"] });
    const vintage = composeStyling({ ...defaultInput, fashion: ["Vintage"] });
    expect(street.pieces).toContain("Cargo trousers");
    expect(vintage.pieces).toContain("Secondhand cardigan");
    expect(street.pieces).not.toEqual(vintage.pieces);
  });
  it("prioritizes walking requirements over decorative styling", () => {
    const result = composeStyling({
      ...defaultInput,
      occasion: "Outdoor walking afternoon",
    });
    expect(result.pieces).toContain("Supportive walking shoes");
    expect(result.pieces).toContain("Packable weather layer");
  });
  it("reduces optional layers without claiming to meet a price total", () => {
    const result = composeStyling({ ...defaultInput, budget: "Under $100" });
    expect(result.pieces).toHaveLength(3);
    expect(result.decisions.join(" ")).toContain("not price-verified");
  });
  it("changes a retrieved brand reference when that brand is rejected", async () => {
    const result = await runWorkflow(
      {
        ...defaultInput,
        feedback: [{ id: "demo-sample-2", reason: "Not my taste" }],
      },
      mockTasteProvider,
    );
    const outfit = result.recommendations.find((r) => r.category === "outfit");
    expect(outfit?.explanation).toContain("Arket");
    expect(outfit?.evidenceIds).toEqual(["demo-sample-6"]);
    expect(outfit?.styling?.pieces.length).toBeGreaterThan(1);
  });
});
