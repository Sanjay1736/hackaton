import type { Entity, TasteInput } from "../schema";
export interface Retrieval {
  entities: Entity[];
  warnings: string[];
  calls: string[];
}
export interface TasteProvider {
  mode: "mock" | "live";
  retrieve(input: TasteInput): Promise<Retrieval>;
}
