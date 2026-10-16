import "server-only";
import type { TasteProvider } from "./taste-provider";
import type { Entity } from "../schema";
import { QlooClient } from "../qloo/client";
import { searchResponseSchema, insightsResponseSchema } from "../qloo/types";
import { normalizeEntities } from "../qloo/normalize";
const canonical = (value: string) =>
  value.normalize("NFKC").toLocaleLowerCase("en").trim();
export const qlooTasteProvider: TasteProvider = {
  mode: "live",
  async retrieve(input) {
    const client = new QlooClient(AbortSignal.timeout(25000));
    const warnings: string[] = [];
    const calls: string[] = [];
    const queries = [
      ...input.music.map((query) => ({ query, types: "urn:entity:artist" })),
      ...input.screen.map((query) => ({
        query,
        types: "urn:entity:movie,urn:entity:tv_show",
      })),
    ];
    const seeds: Entity[] = [];
    // Resolve sequentially to avoid bursts; transport shares and caches repeat queries.
    for (let offset = 0; offset < queries.length; offset += 1) {
      const batch = await Promise.all(
        queries.slice(offset, offset + 1).map(async ({ query, types }) => {
          const response = await client.get(
            "/search",
            { query, types, take: "5" },
            searchResponseSchema,
          );
          calls.push(
            `GET /search · ${query} · ${response.results.length} candidates`,
          );
          const exact = response.results.filter(
            (e) =>
              canonical(e.name) === canonical(query) &&
              types
                .split(",")
                .some((type) =>
                  (e.types || [e.subtype || e.type]).includes(type),
                ),
          );
          if (exact.length !== 1) {
            warnings.push(
              `“${query}” was not uniquely resolved by exact name. It was excluded; try the full official title.`,
            );
            return null;
          }
          const e = exact[0];
          return {
            id: e.entity_id,
            name: e.name,
            category: types
              .split(",")
              .find((type) =>
                (e.types || [e.subtype || e.type]).includes(type),
              )!
              .replace("urn:entity:", ""),
            source: "qloo",
            role: "seed",
            inputs: [query],
            seedIds: [],
            endpoint: "/search",
          } satisfies Entity;
        }),
      );
      for (const e of batch) if (e) seeds.push(e);
    }
    const uniqueSeeds = normalizeEntities(seeds);
    if (!uniqueSeeds.length)
      return {
        entities: [],
        warnings: [
          ...warnings,
          "No exact cultural entities were resolved. Refine your artists or screen titles.",
        ],
        calls,
      };
    const seedIds = uniqueSeeds.map((e) => e.id);
    const inputs = uniqueSeeds.flatMap((e) => e.inputs);
    const excluded = [
      ...new Set([
        ...seedIds,
        ...input.feedback
          .map((f) => f.id)
          .filter((id) => !id.startsWith("demo-")),
      ]),
    ];
    const entities: Entity[] = [...uniqueSeeds];
    for (const category of ["artist", "movie", "brand", "book"]) {
      const response = await client.get(
        "/v2/insights",
        {
          "filter.type": `urn:entity:${category}`,
          "signal.interests.entities": seedIds.join(","),
          "filter.exclude.entities": excluded.join(","),
          take: "3",
        },
        insightsResponseSchema,
      );
      calls.push(
        `GET /v2/insights · ${category} · ${response.results.entities.length} results`,
      );
      for (const e of response.results.entities) {
        if (!excluded.includes(e.entity_id))
          entities.push({
            id: e.entity_id,
            name: e.name,
            category: (e.subtype || e.type).replace("urn:entity:", ""),
            source: "qloo",
            role: "recommendation",
            inputs,
            seedIds,
            endpoint: "/v2/insights",
          });
      }
      if (!response.results.entities.length)
        warnings.push(
          `Qloo returned no ${category} suggestions for these combined signals.`,
        );
    }
    if (input.feedback.length)
      calls.push(
        `Applied ${input.feedback.length} explicit exclusions; reasons remain local, not inferred negative taste signals.`,
      );
    return { entities, warnings, calls };
  },
};
