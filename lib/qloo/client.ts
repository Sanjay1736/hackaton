import "server-only";
import { z } from "zod";
import { createHash } from "node:crypto";
import { retryAfterSeconds } from "../retry-after";
export class ServiceError extends Error {
  constructor(
    message: string,
    public status = 502,
    public retryAfter?: number,
    public code = "service_error",
  ) {
    super(message);
  }
}
// Instance-local only: no credentials, query values, or raw bodies are logged.
const cache = new Map<string, { expires: number; data: unknown }>();
const pending = new Map<string, Promise<unknown>>();
const cooldowns = new Map<string, number>();
let queue: Promise<unknown> = Promise.resolve();
export function resetQlooStateForTests() {
  cache.clear();
  pending.clear();
  cooldowns.clear();
  queue = Promise.resolve();
}
function rateLimit(seconds: number, code: string) {
  return new ServiceError(
    `Qloo is rate limiting requests. Try again in ${seconds} seconds.`,
    429,
    seconds,
    code,
  );
}
async function waitForShared<T>(
  task: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return task;
  if (signal.aborted)
    throw new ServiceError("Qloo workflow timed out. Please retry.");
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () =>
      reject(new ServiceError("Qloo workflow timed out. Please retry."));
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([task, aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
export class QlooClient {
  private key: string;
  private base: string;
  constructor(private signal?: AbortSignal) {
    this.key = process.env.QLOO_API_KEY?.trim() || "";
    this.base = process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";
    if (!this.key || /^(your[_-]|replace[_-]|<)/i.test(this.key))
      throw new ServiceError(
        "Live mode needs a real QLOO_API_KEY on the server; an empty or placeholder key cannot authenticate. Add it to .env.local or your deployment environment.",
        503,
      );
    if (this.base !== "https://hackathon.api.qloo.com")
      throw new ServiceError(
        "QLOO_BASE_URL must be https://hackathon.api.qloo.com for this hackathon integration.",
        503,
      );
  }
  async get<T>(
    path: "/search" | "/v2/insights",
    params: Record<string, string>,
    schema: z.ZodType<T>,
  ): Promise<T> {
    if (this.signal?.aborted)
      throw new ServiceError("Qloo workflow timed out. Please retry.");
    const url = new URL(path, this.base);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const scope = createHash("sha256").update(this.key).digest("hex");
    const sorted = new URL(url);
    sorted.searchParams.sort();
    const cacheKey = createHash("sha256")
      .update(scope + sorted.href)
      .digest("hex");
    const now = Date.now();
    for (const [key, entry] of cache)
      if (entry.expires <= now) cache.delete(key);
    for (const [key, until] of cooldowns)
      if (until <= now) cooldowns.delete(key);
    const hit = cache.get(cacheKey);
    if (hit) return schema.parse(hit.data);
    const existing = pending.get(cacheKey);
    if (existing)
      return schema.parse(await waitForShared(existing, this.signal));
    if (pending.size >= 64)
      throw new ServiceError(
        "Qloo request queue is busy. Please try later.",
        503,
      );
    // Serialize across workflows in this instance. One 429 stops queued calls before fetch.
    const task = queue
      .catch(() => undefined)
      .then(async () => {
        const remaining = Math.ceil(
          ((cooldowns.get(scope) || 0) - Date.now()) / 1000,
        );
        if (remaining > 0) throw rateLimit(remaining, "qloo_cooldown");
        if (Date.now() - now >= 25000)
          throw new ServiceError("Qloo workflow timed out. Please retry.");
        const data = await this.request(url, path, schema, scope);
        if (cache.size >= 256) cache.delete(cache.keys().next().value!);
        cache.set(cacheKey, { expires: Date.now() + 5 * 60_000, data });
        return data;
      });
    pending.set(cacheKey, task);
    queue = task.catch(() => undefined);
    void task.finally(() => pending.delete(cacheKey)).catch(() => undefined);
    return schema.parse(await waitForShared(task, this.signal));
  }
  private async request<T>(
    url: URL,
    path: string,
    schema: z.ZodType<T>,
    scope: string,
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "X-Api-Key": this.key, accept: "application/json" },
        cache: "no-store",
        redirect: "error",
        // Shared requests must not be cancelled by one departing subscriber.
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok)
        console.warn("qloo_upstream", {
          endpoint: path,
          status: response.status,
        });
      if (response.status === 429) {
        const seconds = retryAfterSeconds(response.headers.get("Retry-After"));
        if (cooldowns.size >= 64 && !cooldowns.has(scope))
          cooldowns.delete(cooldowns.keys().next().value!);
        cooldowns.set(scope, Date.now() + seconds * 1000);
        throw rateLimit(seconds, "qloo_upstream_429");
      }
      if (response.status === 401 || response.status === 403)
        throw new ServiceError(
          "Qloo rejected the server credentials or requested category. Check the hackathon key and its permissions.",
          503,
        );
      if (response.status === 404 && path === "/search")
        return schema.parse({ success: true, results: [] });
      if (!response.ok)
        throw new ServiceError(
          "Qloo could not complete the request. Please try again later.",
        );
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new ServiceError(
          "Qloo returned invalid JSON. Please retry later.",
        );
      }
      const parsed = schema.safeParse(body);
      if (!parsed.success)
        throw new ServiceError(
          "Qloo returned an unexpected response format. No sample data was substituted.",
        );
      return parsed.data;
    } catch (e) {
      if (e instanceof ServiceError) throw e;
      throw new ServiceError(
        "Qloo could not be reached or timed out. Please retry.",
      );
    }
  }
}
