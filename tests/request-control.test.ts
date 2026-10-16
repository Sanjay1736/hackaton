import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { QlooClient, resetQlooStateForTests } from "../lib/qloo/client";
import { searchResponseSchema } from "../lib/qloo/types";
import {
  requestRecommendations,
  resetRecommendationRequestsForTests,
} from "../lib/recommendation-request";
import { retryAfterSeconds } from "../lib/retry-after";
import { defaultInput } from "../lib/schema";
import { handleTasteRequest } from "../lib/api";
const ok = () => new Response(JSON.stringify({ results: [] }));
const get = (query = "Sade") =>
  new QlooClient().get("/search", { query }, searchResponseSchema);
beforeEach(() => {
  resetQlooStateForTests();
  resetRecommendationRequestsForTests();
  vi.stubEnv("QLOO_API_KEY", "synthetic-test-key");
  vi.stubEnv("QLOO_BASE_URL", "https://hackathon.api.qloo.com");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it("deduplicates in-flight calls across clients, caches success, and expires after five minutes", async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockImplementation(async () => ok());
  vi.stubGlobal("fetch", fetch);
  await Promise.all([get(), get(), get()]);
  await get();
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(300001);
  await get();
  expect(fetch).toHaveBeenCalledTimes(2);
  vi.stubEnv("QLOO_API_KEY", "another-synthetic-key");
  await get();
  expect(fetch).toHaveBeenCalledTimes(3);
});
it("bounds successful response cache to 256 entries", async () => {
  const fetch = vi.fn().mockImplementation(async () => ok());
  vi.stubGlobal("fetch", fetch);
  for (let i = 0; i < 257; i++) await get(String(i));
  await get("0");
  expect(fetch).toHaveBeenCalledTimes(258);
});
it("honors upstream 429 and blocks queued calls; never retries automatically", async () => {
  vi.useFakeTimers();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response("private", {
        status: 429,
        headers: { "Retry-After": "120" },
      }),
    )
    .mockImplementation(async () => ok());
  vi.stubGlobal("fetch", fetch);
  const results = await Promise.allSettled([get(), get("different")]);
  expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
  await expect(get()).rejects.toMatchObject({
    status: 429,
    retryAfter: 120,
    code: "qloo_cooldown",
  });
  vi.advanceTimersByTime(120001);
  expect(fetch).toHaveBeenCalledTimes(1);
  await get();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(console.warn).toHaveBeenCalledWith("qloo_upstream", {
    endpoint: "/search",
    status: 429,
  });
});
it.each([401, 403, 500, 503])(
  "upstream %s is not a 429 and is not cached or automatically retried",
  async (status) => {
    const fetch = vi
      .fn()
      .mockImplementation(async () => new Response("private", { status }));
    vi.stubGlobal("fetch", fetch);
    await expect(get()).rejects.toMatchObject({
      status: status < 500 ? 503 : 502,
      code: "service_error",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(get()).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(2);
  },
);
it("parses date, seconds and invalid Retry-After values", () => {
  const now = Date.parse("2026-10-13T00:00:00Z");
  expect(retryAfterSeconds("Tue, 13 Oct 2026 00:02:00 GMT", now)).toBe(120);
  expect(retryAfterSeconds("90", now)).toBe(90);
  expect(retryAfterSeconds(null, now)).toBe(60);
  expect(retryAfterSeconds("invalid", now)).toBe(60);
  expect(retryAfterSeconds("-1", now)).toBe(60);
});
it("API forwards Retry-After and identifies actual upstream vs local cooldown", async () => {
  vi.stubEnv("TASTEWEAVE_DATA_MODE", "live");
  const fetch = vi.fn().mockResolvedValue(
    new Response("private", {
      status: 429,
      headers: { "Retry-After": "93" },
    }),
  );
  vi.stubGlobal("fetch", fetch);
  const request = () =>
    new Request("http://localhost/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(defaultInput),
    });
  const first = await handleTasteRequest(request());
  expect(first.status).toBe(429);
  expect(first.headers.get("Retry-After")).toBe("93");
  expect((await first.json()).code).toBe("qloo_upstream_429");
  const next = await handleTasteRequest(request());
  expect((await next.json()).code).toBe("qloo_cooldown");
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("browser shares duplicate submissions and honors cooldown without automatic retries", async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockImplementation(
    async () =>
      new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429,
        headers: { "Retry-After": "90" },
      }),
  );
  vi.stubGlobal("fetch", fetch);
  const a = requestRecommendations(defaultInput, "live");
  const b = requestRecommendations(defaultInput, "live");
  expect(a).toBe(b);
  await Promise.allSettled([a, b]);
  await expect(
    requestRecommendations({ ...defaultInput, occasion: "changed" }, "live"),
  ).rejects.toThrow("Rate limited");
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(90001);
  expect(fetch).toHaveBeenCalledTimes(1);
  await expect(requestRecommendations(defaultInput, "live")).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("browser allows manual retry for a non-429 failure without scheduling retries", async () => {
  const fetch = vi
    .fn()
    .mockImplementation(
      async () =>
        new Response(JSON.stringify({ error: "Unavailable" }), { status: 503 }),
    );
  vi.stubGlobal("fetch", fetch);
  await expect(requestRecommendations(defaultInput, "live")).rejects.toThrow(
    "Unavailable",
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  await expect(requestRecommendations(defaultInput, "live")).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("one subscriber timing out does not cancel another subscriber's shared request", async () => {
  let finish!: (response: Response) => void;
  const fetch = vi.fn().mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  vi.stubGlobal("fetch", fetch);
  const controller = new AbortController();
  const first = new QlooClient(controller.signal).get(
    "/search",
    { query: "Sade" },
    searchResponseSchema,
  );
  const second = get();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  controller.abort();
  await expect(first).rejects.toThrow("timed out");
  finish(ok());
  await expect(second).resolves.toEqual({ results: [] });
  expect(fetch).toHaveBeenCalledTimes(1);
});
