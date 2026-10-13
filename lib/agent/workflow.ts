import { tasteInputSchema, resultSchema, type TasteResult } from "../schema";
import { normalizeEntities } from "../qloo/normalize";
import type { TasteProvider } from "../providers/taste-provider";
import { ruleEngine, type RecommendationEngine } from "./engine";
export async function runWorkflow(
  raw: unknown,
  provider: TasteProvider,
  engine: RecommendationEngine = ruleEngine,
): Promise<TasteResult> {
  const input = tasteInputSchema.parse(raw);
  const retrieved = await provider.retrieve(input);
  const entities = normalizeEntities(retrieved.entities).filter(
    (e) => e.role === "seed" || !input.feedback.some((f) => f.id === e.id),
  );
  const recommendations = engine.generate(input, entities);
  const result = {
    mode: provider.mode,
    input,
    entities,
    recommendations,
    archetype: input.fashion.includes("Streetwear")
      ? "The Urban Curator"
      : input.fashion.includes("Minimalism")
        ? "The Quiet Essentialist"
        : "The Everyday Aesthete",
    palette: choosePalette(input.colors),
    trace: [
      {
        step: "01 · Validate",
        detail: "Validated cultural interests and styling constraints.",
      },
      { step: "02 · Retrieve", detail: retrieved.calls.join(" · ") },
      {
        step: "03 · Normalize",
        detail: `${entities.length} unique entities; source IDs preserved.`,
      },
      {
        step: "04 · Context",
        detail: `Built context from returned entities and explicit preferences; honored ${input.feedback.length} exclusions.`,
      },
      {
        step: "05 · Compose",
        detail:
          "Deterministic rules; no LLM called. Styling is interpretation.",
      },
      {
        step: "06 · Evidence",
        detail: "Attached references to retrieved entities.",
      },
      {
        step: "07 · Validate output",
        detail: "Validated structure, source labels, and evidence references.",
      },
    ],
    warnings: retrieved.warnings,
    engine: "deterministic-v3" as const,
  };
  const validated = resultSchema.safeParse(result);
  if (!validated.success)
    throw new Error("Generated results failed evidence validation.");
  return validated.data;
}

const palettes: Record<string, string[]> = {
  "Earth tones": ["#666d4f", "#b88562", "#d6c7af", "#eee8dc"],
  Monochrome: ["#222523", "#6b706c", "#b1b3ac", "#f0eee7"],
  "Jewel tones": ["#34493f", "#723847", "#b68536", "#284560"],
  Pastels: ["#aebfd0", "#dfb7ba", "#bfcdb6", "#e5d3a7"],
  "Warm neutrals": ["#836d58", "#b19d83", "#d3c3ab", "#f1e9dd"],
  "Bright accents": ["#2765a1", "#cf4c45", "#e8bd44", "#60906d"],
};
export function choosePalette(colors: string[]) {
  return palettes[
    colors.find((c) => Object.hasOwn(palettes, c)) || "Earth tones"
  ];
}
