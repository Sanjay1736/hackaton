import { composeStyling } from "./styling";
import type { Entity, Recommendation, TasteInput } from "../schema";
export interface RecommendationEngine {
  generate(input: TasteInput, entities: Entity[]): Recommendation[];
}
export const ruleEngine: RecommendationEngine = {
  generate(input, entities) {
    const cultural: Recommendation[] = entities
      .filter((e) => e.role === "recommendation")
      .map((e) => ({
        id: `rec-${e.id}`,
        title: e.name,
        category: e.category,
        explanation:
          e.source === "demo"
            ? "An editorial demo suggestion selected from a local catalog using your stated preferences and exclusions. Unmatched preferences use catalog order. No cultural relationship has been measured."
            : `Returned by Qloo Insights using ${e.inputs.join(", ")} as combined query signals. Qloo does not provide a per-preference causal explanation here.`,
        evidenceIds: [e.id],
        interpretation: false,
      }));
    const anchor = entities.find(
      (e) => e.category === "brand" && e.role === "recommendation",
    );
    if (anchor) {
      for (const [i, title] of [
        "A day in your element",
        "After-hours, reimagined",
      ].entries()) {
        const styling = composeStyling(input, i === 1);
        cultural.push({
          id: `outfit-${i}`,
          title,
          category: "outfit",
          explanation: `A styling concept for ${input.occasion || "your everyday plans"}. Explore ${anchor.name} as a ${anchor.source === "demo" ? "demo catalog" : "Qloo-retrieved"} brand reference. Garments below follow your stated constraints, not verified products from this brand.`,
          evidenceIds: [anchor.id],
          interpretation: true,
          styling,
        });
      }
    }
    return cultural;
  },
};
