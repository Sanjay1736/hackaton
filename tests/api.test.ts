import { afterEach, describe, expect, it, vi } from "vitest";
import { handleTasteRequest } from "../lib/api";
import { defaultInput } from "../lib/schema";
afterEach(() => vi.unstubAllEnvs());
function request(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}
describe("server boundary", () => {
  it("accepts the browser Host when Next normalizes the internal URL", async () => {
    vi.stubEnv("TASTEWEAVE_DATA_MODE", "mock");
    const r = await handleTasteRequest(
      request(JSON.stringify(defaultInput), {
        Host: "127.0.0.1:3000",
        Origin: "http://127.0.0.1:3000",
      }),
    );
    expect(r.status).toBe(200);
  });
  it("rejects oversized bodies", async () => {
    const r = await handleTasteRequest(request("x".repeat(17000)));
    expect(r.status).toBe(413);
  });
  it("rejects malformed JSON", async () => {
    expect((await handleTasteRequest(request("{"))).status).toBe(400);
  });
  it("rejects a foreign browser origin", async () => {
    expect(
      (
        await handleTasteRequest(
          request(JSON.stringify(defaultInput), {
            Origin: "https://example.com",
          }),
        )
      ).status,
    ).toBe(403);
  });
  it("rejects unsupported content types", async () => {
    expect(
      (
        await handleTasteRequest(
          request("{}", { "Content-Type": "text/plain" }),
        )
      ).status,
    ).toBe(415);
  });
  it("serves complete demo results without caching", async () => {
    vi.stubEnv("TASTEWEAVE_DATA_MODE", "mock");
    const r = await handleTasteRequest(request(JSON.stringify(defaultInput)));
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect((await r.json()).mode).toBe("mock");
  });
  it("missing live key does not become a demo result", async () => {
    vi.stubEnv("TASTEWEAVE_DATA_MODE", "live");
    vi.stubEnv("QLOO_API_KEY", "");
    const r = await handleTasteRequest(request(JSON.stringify(defaultInput)));
    expect(r.status).toBe(503);
    const body = await r.json();
    expect(body.error).toContain("QLOO_API_KEY");
    expect(body.mode).toBeUndefined();
  });
});
