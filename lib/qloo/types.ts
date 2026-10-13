import { z } from "zod";
// Only the documented fields we consume; additional upstream metadata is stripped.
export const qlooEntitySchema = z.object({
  entity_id: z.string().uuid(),
  name: z.string().trim().min(1),
  type: z.string(),
  subtype: z.string().optional(),
});
// Search currently returns { results } and entity.types on the hackathon host.
// Also accept the documented singular type form; reject explicit success:false.
export const searchEntitySchema = z
  .object({
    entity_id: z.string().uuid(),
    name: z.string().trim().min(1),
    type: z.string().optional(),
    subtype: z.string().optional(),
    types: z.array(z.string()).min(1).optional(),
  })
  .refine((e) => Boolean(e.type || e.types?.length), "Missing entity category");
export const searchResponseSchema = z.object({
  success: z.literal(true).optional(),
  results: z.array(searchEntitySchema),
});
export const insightsResponseSchema = z.object({
  success: z.literal(true),
  results: z.object({ entities: z.array(qlooEntitySchema) }),
});
export type QlooEntity = z.infer<typeof qlooEntitySchema>;
