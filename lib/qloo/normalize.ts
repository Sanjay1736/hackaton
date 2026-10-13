import { entitySchema, type Entity } from "../schema";
export function normalizeEntities(items: Entity[]): Entity[] {
  const seen = new Map<string, Entity>();
  for (const item of items) {
    const e = entitySchema.parse(item);
    const key = `${e.source}:${e.id}`;
    const prev = seen.get(key);
    seen.set(
      key,
      prev
        ? {
            ...prev,
            inputs: [...new Set([...prev.inputs, ...e.inputs])],
            seedIds: [...new Set([...prev.seedIds, ...e.seedIds])],
          }
        : { ...e, name: e.name.trim() },
    );
  }
  return [...seen.values()];
}
