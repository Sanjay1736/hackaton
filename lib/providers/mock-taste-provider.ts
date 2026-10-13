import type { TasteProvider } from "./taste-provider";
import type { Entity } from "../schema";
// Editorial demo associations only: these are not Qloo affinities or measured relationships.
const samples = [
  {
    name: "Khruangbin",
    category: "artist",
    signals: ["Frank Ocean", "Sade", "Khruangbin"],
  },
  {
    name: "Perfect Days",
    category: "movie",
    signals: [
      "The Grand Budapest Hotel",
      "In the Mood for Love",
      "Art galleries",
    ],
  },
  {
    name: "COS",
    category: "brand",
    signals: ["Relaxed tailoring", "Minimalism", "Earth tones"],
  },
  {
    name: "The Creative Act",
    category: "book",
    signals: ["Art galleries", "Live music"],
  },
  {
    name: "Cleo Sol",
    category: "artist",
    signals: ["Beyoncé", "Taylor Swift"],
  },
  {
    name: "Paterson",
    category: "movie",
    signals: ["Spirited Away", "The Bear", "Reading"],
  },
  {
    name: "Arket",
    category: "brand",
    signals: ["Vintage", "Bohemian", "Pastels"],
  },
  {
    name: "Ways of Seeing",
    category: "book",
    signals: ["Architecture", "Vintage"],
  },
  {
    name: "Little Simz",
    category: "artist",
    signals: ["Radiohead", "Little Simz"],
  },
  {
    name: "Columbus",
    category: "movie",
    signals: ["Interstellar", "Succession", "Architecture"],
  },
  {
    name: "Uniqlo",
    category: "brand",
    signals: ["Streetwear", "Statement pieces", "Bright accents"],
  },
  {
    name: "A Field Guide to Getting Lost",
    category: "book",
    signals: ["Reading", "Nature walks"],
  },
];
const canonical = (value: string) =>
  value.normalize("NFKC").trim().toLowerCase();
export const mockTasteProvider: TasteProvider = {
  mode: "mock",
  async retrieve(input) {
    const inputs = [...input.music, ...input.screen];
    const seeds: Entity[] = inputs.map((name, i) => ({
      id: `demo-seed-${i}`,
      name,
      category: input.music.includes(name) ? "artist" : "screen",
      source: "demo",
      role: "seed",
      inputs: [name],
      seedIds: [],
      endpoint: "local fixture",
    }));
    const excluded = new Set(input.feedback.map((f) => f.id));
    const available = samples
      .map((s, i) => ({ ...s, id: `demo-sample-${i}` }))
      .filter((s) => !excluded.has(s.id));
    const preferences = new Set(
      [...inputs, ...input.fashion, ...input.lifestyle, ...input.colors].map(
        canonical,
      ),
    );
    const score = (sample: (typeof samples)[number]) =>
      sample.signals.filter((signal) => preferences.has(canonical(signal)))
        .length;
    const ranked = available.sort((a, b) => score(b) - score(a));
    const selected = ["artist", "movie", "brand", "book"].flatMap((category) =>
      ranked
        .filter(
          (s) =>
            s.category === category &&
            !inputs.some((name) => canonical(name) === canonical(s.name)),
        )
        .slice(0, 1),
    );
    return {
      entities: [
        ...seeds,
        ...selected.map((s): Entity => ({
          name: s.name,
          category: s.category,
          id: s.id,
          source: "demo",
          role: "recommendation",
          inputs,
          seedIds: seeds.map((s) => s.id),
          endpoint: "local fixture",
        })),
      ],
      warnings: [
        "These locally authored examples are not Qloo results. An authored matching rule ranks the local catalog by selected interests. Unknown interests use catalog order; these matches are not measured cultural relationships.",
      ],
      calls: [
        `Ranked local sample catalog by explicit preference matches (0 external calls); ${excluded.size} exclusions applied.`,
      ],
    };
  },
};
