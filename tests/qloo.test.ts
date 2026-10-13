import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QlooClient } from "../lib/qloo/client";
import { searchResponseSchema } from "../lib/qloo/types";
import { qlooTasteProvider } from "../lib/providers/qloo-taste-provider";
import { defaultInput } from "../lib/schema";
import { getTasteProvider } from "../lib/providers";
// Synthetic contract fixtures, not captured Qloo data.
const id = "00000000-0000-4000-8000-000000000001";
const entity = {
  entity_id: id,
  name: "Sade",
  type: "urn:entity",
  subtype: "urn:entity:artist",
};
beforeEach(() => {
  vi.stubEnv("QLOO_API_KEY", "test-placeholder");
  vi.stubEnv("QLOO_BASE_URL", "https://hackathon.api.qloo.com");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Qloo contract", () => {
  it("keeps credentials in headers and uses documented query names", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, results: [entity] })),
      );
    vi.stubGlobal("fetch", fetch);
    await new QlooClient().get(
      "/search",
      { query: "Sade", types: "urn:entity:artist", take: "5" },
      searchResponseSchema,
    );
    const [url, options] = fetch.mock.calls[0];
    expect(String(url)).toContain(
      "/search?query=Sade&types=urn%3Aentity%3Aartist&take=5",
    );
    expect(String(url)).not.toContain("test-placeholder");
    expect(options.headers["X-Api-Key"]).toBe("test-placeholder");
    expect(options.method).toBe("GET");
  });
  it("fails visibly with a missing key or invalid mode", () => {
    vi.stubEnv("QLOO_API_KEY", "");
    expect(() => new QlooClient()).toThrow("QLOO_API_KEY");
    vi.stubEnv("TASTEWEAVE_DATA_MODE", "typo");
    expect(() => getTasteProvider()).toThrow("must be mock or live");
  });
  it("rejects alternate credential destinations", () => {
    vi.stubEnv("QLOO_BASE_URL", "https://example.com");
    expect(() => new QlooClient()).toThrow("QLOO_BASE_URL");
  });
  it.each([429, 401, 500])("sanitizes upstream %s errors", async (status) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("test-placeholder private upstream message", { status }),
        ),
    );
    await expect(
      new QlooClient().get("/search", {}, searchResponseSchema),
    ).rejects.not.toThrow("test-placeholder");
  });
  it("rejects malformed responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ success: true, results: [{ name: "No ID" }] }),
          ),
        ),
    );
    await expect(
      new QlooClient().get("/search", {}, searchResponseSchema),
    ).rejects.toThrow("unexpected response");
  });
  it("handles network failures without leaking detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("test-placeholder")),
    );
    await expect(
      new QlooClient().get("/search", {}, searchResponseSchema),
    ).rejects.toThrow("timed out");
  });
  it("does not turn ambiguous or partial name matches into seeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            results: [{ ...entity, name: "Sade tribute band" }],
          }),
        ),
      ),
    );
    const r = await qlooTasteProvider.retrieve({
      ...defaultInput,
      music: ["Sade"],
      screen: [],
    });
    expect(r.entities).toEqual([]);
    expect(r.warnings[0]).toContain("not uniquely resolved");
  });
  it("passes returned seed IDs into cross-category insights", async () => {
    const fetch = vi.fn().mockImplementation(
      async (url: URL) =>
        new Response(
          JSON.stringify(
            url.pathname === "/search"
              ? { success: true, results: [entity] }
              : {
                  success: true,
                  results: {
                    entities: [
                      {
                        ...entity,
                        entity_id: "00000000-0000-4000-8000-000000000002",
                        name: "Synthetic result",
                        subtype: url.searchParams.get("filter.type"),
                      },
                    ],
                  },
                },
          ),
        ),
    );
    vi.stubGlobal("fetch", fetch);
    const r = await qlooTasteProvider.retrieve({
      ...defaultInput,
      music: ["Sade"],
      screen: [],
    });
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(
      fetch.mock.calls[1][0].searchParams.get("signal.interests.entities"),
    ).toBe(id);
    expect(r.entities[1].seedIds).toEqual([id]);
    expect(r.entities[1].source).toBe("qloo");
  });
});

it("sends real rejected IDs in exclusions, never local reason text or demo IDs", async () => {
  const rejected = "00000000-0000-4000-8000-000000000002";
  const fetch = vi.fn().mockImplementation(
    async (url: URL) =>
      new Response(
        JSON.stringify(
          url.pathname === "/search"
            ? { success: true, results: [entity] }
            : {
                success: true,
                results: { entities: [{ ...entity, entity_id: rejected }] },
              },
        ),
      ),
  );
  vi.stubGlobal("fetch", fetch);
  const r = await qlooTasteProvider.retrieve({
    ...defaultInput,
    music: ["Sade"],
    screen: [],
    feedback: [
      { id: rejected, reason: "Already familiar" },
      { id: "demo-sample-0", reason: "Not my taste" },
    ],
  });
  const url = fetch.mock.calls[1][0] as URL;
  expect(url.searchParams.get("filter.exclude.entities")).toBe(
    `${id},${rejected}`,
  );
  expect(String(url)).not.toContain("Already");
  expect(String(url)).not.toContain("demo-");
  expect(r.entities.filter((e) => e.role === "recommendation")).toEqual([]);
});

it("rejects placeholder keys before making a network request", () => {
  vi.stubEnv("QLOO_API_KEY", "your_actual_key");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(() => new QlooClient()).toThrow("placeholder");
  expect(fetch).not.toHaveBeenCalled();
});
it("handles documented no-search-results and invalid JSON separately", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(new Response("<html>failure</html>")),
  );
  expect(
    await new QlooClient().get("/search", {}, searchResponseSchema),
  ).toEqual({ success: true, results: [] });
  await expect(
    new QlooClient().get("/search", {}, searchResponseSchema),
  ).rejects.toThrow("invalid JSON");
});
it("keeps styling context out of all Qloo requests and forwards a bounded signal", async () => {
  const fetch = vi
    .fn()
    .mockImplementation(async (url: URL, options: RequestInit) => {
      expect(options.signal).toBeInstanceOf(AbortSignal);
      expect(options.redirect).toBe("error");
      expect(String(url)).not.toContain("private-occasion");
      expect(String(url)).not.toContain("private-fashion");
      return new Response(
        JSON.stringify(
          url.pathname === "/search"
            ? { success: true, results: [entity] }
            : { success: true, results: { entities: [] } },
        ),
      );
    });
  vi.stubGlobal("fetch", fetch);
  await qlooTasteProvider.retrieve({
    ...defaultInput,
    music: ["Sade"],
    screen: [],
    fashion: ["private-fashion"],
    occasion: "private-occasion",
  });
  expect(fetch).toHaveBeenCalledTimes(5);
});

it("accepts the verified hackathon search shape without a success field", async () => {
  const fetch = vi
    .fn()
    .mockImplementation(
      async (url: URL) =>
        new Response(
          JSON.stringify(
            url.pathname === "/search"
              ? {
                  results: [
                    {
                      entity_id: id,
                      name: "Sade",
                      types: ["urn:entity:artist"],
                    },
                  ],
                }
              : { success: true, results: { entities: [] } },
          ),
        ),
    );
  vi.stubGlobal("fetch", fetch);
  const result = await qlooTasteProvider.retrieve({
    ...defaultInput,
    music: ["Sade"],
    screen: [],
  });
  expect(result.entities[0].category).toBe("artist");
  expect(result.entities[0].id).toBe(id);
  expect(fetch).toHaveBeenCalledTimes(5);
});
it("rejects explicit search failures and entities with no category", () => {
  expect(
    searchResponseSchema.safeParse({ success: false, results: [] }).success,
  ).toBe(false);
  expect(
    searchResponseSchema.safeParse({
      results: [{ entity_id: id, name: "Synthetic entity" }],
    }).success,
  ).toBe(false);
});
