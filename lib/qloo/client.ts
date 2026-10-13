import "server-only";
import { z } from "zod";
export class ServiceError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
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
    const url = new URL(path, this.base);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "X-Api-Key": this.key, accept: "application/json" },
        cache: "no-store",
        redirect: "error",
        signal: this.signal
          ? AbortSignal.any([this.signal, AbortSignal.timeout(8000)])
          : AbortSignal.timeout(8000),
      });
      if (response.status === 429)
        throw new ServiceError(
          "Qloo is rate limiting requests. Wait a minute before trying again.",
          429,
        );
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
