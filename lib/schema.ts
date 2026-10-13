import { z } from "zod";
export const feedbackReasons = [
  "Not my taste",
  "Already familiar",
  "Show me something else",
] as const;
export const feedbackSchema = z
  .object({
    id: z.union([z.string().uuid(), z.string().regex(/^demo-sample-\d+$/)]),
    reason: z.enum(feedbackReasons),
  })
  .strict();
export type TasteFeedback = z.infer<typeof feedbackSchema>;
const interests = z.array(z.string().trim().min(1).max(80)).max(6);
export const tasteInputSchema = z
  .object({
    music: interests,
    screen: interests,
    fashion: interests,
    lifestyle: interests,
    colors: interests,
    budget: z.enum(["Open", "Under $100", "$100–$250", "$250+"]),
    occasion: z.string().trim().max(80),
    feedback: z.array(feedbackSchema).max(24).default([]),
  })
  .strict()
  .refine(
    (v) => v.music.length + v.screen.length > 0,
    "Choose at least one artist, movie, or TV show.",
  );
export type TasteInput = z.infer<typeof tasteInputSchema>;
export const entitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string(),
  source: z.enum(["demo", "qloo"]),
  role: z.enum(["seed", "recommendation"]),
  inputs: z.array(z.string()),
  seedIds: z.array(z.string()),
  endpoint: z.string(),
});
export type Entity = z.infer<typeof entitySchema>;
export const recommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  explanation: z.string(),
  evidenceIds: z.array(z.string()).min(1),
  interpretation: z.boolean(),
  styling: z
    .object({
      pieces: z.array(z.string()).min(2),
      decisions: z.array(z.string()).min(1),
    })
    .optional(),
});
export type Recommendation = z.infer<typeof recommendationSchema>;
export const resultSchema = z
  .object({
    mode: z.enum(["mock", "live"]),
    input: tasteInputSchema,
    entities: z.array(entitySchema),
    recommendations: z.array(recommendationSchema),
    archetype: z.string(),
    palette: z.array(z.string()),
    trace: z.array(z.object({ step: z.string(), detail: z.string() })),
    warnings: z.array(z.string()),
    engine: z.literal("deterministic-v3"),
  })
  .superRefine((v, ctx) => {
    const ids = new Set(v.entities.map((e) => e.id));
    const seeds = new Set(
      v.entities.filter((e) => e.role === "seed").map((e) => e.id),
    );
    if (ids.size !== v.entities.length)
      ctx.addIssue({ code: "custom", message: "Duplicate entity identifiers" });
    for (const entity of v.entities) {
      if (
        entity.source === "qloo" &&
        !z.string().uuid().safeParse(entity.id).success
      )
        ctx.addIssue({ code: "custom", message: "Invalid Qloo identifier" });
      if (entity.seedIds.some((id) => !seeds.has(id)))
        ctx.addIssue({ code: "custom", message: "Missing seed provenance" });
      if (
        entity.role === "recommendation" &&
        v.input.feedback.some((f) => f.id === entity.id)
      )
        ctx.addIssue({
          code: "custom",
          message: "Excluded recommendation resurfaced",
        });
    }

    for (const r of v.recommendations)
      if (r.evidenceIds.some((id) => !ids.has(id)))
        ctx.addIssue({
          code: "custom",
          message: "Recommendation has missing evidence",
        });
    if (
      v.entities.some((e) => e.source !== (v.mode === "mock" ? "demo" : "qloo"))
    )
      ctx.addIssue({ code: "custom", message: "Data source mismatch" });
  });
export type TasteResult = z.infer<typeof resultSchema>;
export const defaultInput: TasteInput = {
  music: ["Frank Ocean", "Sade"],
  screen: ["The Grand Budapest Hotel"],
  fashion: ["Relaxed tailoring"],
  lifestyle: ["Art galleries"],
  colors: ["Earth tones"],
  budget: "Open",
  occasion: "",
  feedback: [],
};
