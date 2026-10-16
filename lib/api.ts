import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { runWorkflow } from "./agent/workflow";
import { getTasteProvider } from "./providers";
import { ServiceError } from "./qloo/client";
// Instance-local circuit breaker; deployment-level rate limiting is documented separately.
let active = 0;
let windowStart = Date.now();
let requests = 0;
export async function handleTasteRequest(request: Request) {
  let counted = false;
  const headers = { "Cache-Control": "no-store" };
  try {
    const origin = request.headers.get("origin");
    // Next may normalize request.url to localhost behind its server/proxy.
    const host = request.headers.get("host") || new URL(request.url).host;
    let validOrigin = !origin;
    if (origin) {
      try {
        const parsed = new URL(origin);
        validOrigin =
          ["http:", "https:"].includes(parsed.protocol) && parsed.host === host;
      } catch {
        validOrigin = false;
      }
    }
    if (!validOrigin || request.headers.get("sec-fetch-site") === "cross-site")
      throw new ServiceError("Cross-origin requests are not allowed.", 403);
    if (!request.headers.get("content-type")?.includes("application/json"))
      throw new ServiceError("Send a JSON request.", 415);
    if (Date.now() - windowStart > 60000) {
      windowStart = Date.now();
      requests = 0;
    }
    if (active >= 3 || requests >= 20)
      throw new ServiceError(
        "Too many requests. Wait a minute and try again.",
        429,
      );
    active++;
    requests++;
    counted = true;
    const reader = request.body?.getReader();
    if (!reader) throw new ServiceError("Request body is required.", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        throw new ServiceError("Profile exceeds the 16 KB request limit.", 413);
      }
      chunks.push(value);
    }
    let raw: unknown;
    try {
      raw = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new ServiceError("Invalid JSON request.", 400);
    }
    const result = await runWorkflow(raw, getTasteProvider());
    return NextResponse.json(result, { headers });
  } catch (e) {
    const status =
      e instanceof ZodError ? 400 : e instanceof ServiceError ? e.status : 500;
    const error =
      e instanceof ZodError
        ? "Invalid taste profile. Choose at least one artist or screen title, at most six interests per category, and keep entries under 80 characters."
        : e instanceof ServiceError
          ? e.message
          : "The taste workflow could not complete. Please retry.";
    return NextResponse.json(
      { error, code: e instanceof ServiceError ? e.code : "request_error" },
      {
        status,
        headers: {
          ...headers,
          ...(status === 429
            ? {
                "Retry-After": String(
                  e instanceof ServiceError ? (e.retryAfter ?? 60) : 60,
                ),
              }
            : {}),
        },
      },
    );
  } finally {
    if (counted) active--;
  }
}
