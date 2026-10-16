# Rate-limit diagnosis — 2026-10-13

## Evidence and limits

The public homepage at https://hackaton-beryl-theta.vercel.app/ loaded and showed live mode. No recommendation POST or new live Qloo request was made during this investigation. There is no Vercel connector, installed Vercel CLI, or linked `.vercel` project available in this workspace, so production function logs and the deployed source revision could not be inspected. The reported production event is therefore not independently confirmed as an upstream 429. The earlier real-key Search, Insights, and exclusion-refinement smoke test succeeded; that does not establish current quota availability.

In the inspected source, the exact old message originated only in `lib/qloo/client.ts`, immediately after `fetch` when `response.status === 429`. It propagated through `qlooTasteProvider.retrieve` → `runWorkflow` → `handleTasteRequest` → JSON `{error}` from `/api/recommendations` → `Results.generate` → the existing “A thread came loose” error view. `/api/discover` shares the same handler. The application's own admission limit returns different wording (“Too many requests”). Authentication errors map to 503; other HTTP errors, malformed responses, and network failures map to 502, not 429.

The confirmed implementation defects were avoidable request amplification and ignoring the upstream retry delay. They may have contributed to the reported rate limit; account quota exhaustion, other users of the key, and the actual production response cannot be determined without logs/account data.

## Request audit

- Onboarding stores preferences and navigates; it does not call Qloo per step.
- The results effect already deferred work to a microtask, avoiding immediate development Strict Mode replay. Its fetch was aborted on unmount, but server work could continue; remounting could start another request.
- Regenerate/retry clicks and uncached navigation had no shared in-flight guard. Successful session results were reused, but in-flight work was not.
- No automatic retry loop existed.
- Up to 12 Search calls ran in batches of three, followed by four sequential Insights calls. A rejected batch could leave sibling searches running. Refinement and regeneration repeated searches and unchanged category retrievals.

## Changes

- `lib/qloo/client.ts`: credential-scoped SHA-256 cache keys; shared in-flight requests; validated response cache, five-minute TTL and 256-entry bound; max 64 queued requests; sequential network dispatch per instance; queued work expires after 25 seconds. Each fetch has an eight-second timeout. A caller's 25-second workflow deadline stops its wait without cancelling another subscriber's shared fetch. Failures are not cached as results; the documented Search 404 is treated as an empty search result.
- `lib/providers/qloo-taste-provider.ts`: sequential Search resolution. Four Insights categories and feedback exclusions remain intact. Changes to signals or exclusions create distinct cache entries.
- `lib/retry-after.ts`: seconds and HTTP-date parsing, conservative 60-second fallback. No retry is scheduled.
- `lib/api.ts`: forwards the actual remaining retry delay rather than always returning 60 seconds. Error codes distinguish `qloo_upstream_429` from an instance-local `qloo_cooldown` response.
- `lib/recommendation-request.ts` and `components/results.tsx`: shared browser requests across mounts/submissions; manual retries blocked locally during the server-provided cooldown; departing views ignore stale results rather than aborting shared work. Existing UI retained.
- Error-only server diagnostics log `qloo_upstream` with endpoint path and HTTP status. They contain no key, query, preference, entity ID, or raw response. A future deployment's logs can distinguish an actual upstream status from a cooldown response.
- Tests added/updated in `tests/request-control.test.ts`, `tests/qloo.test.ts`, and `e2e/taste.spec.ts`. README describes the new cache behavior.

## Deployment limits

The caches, queue, and upstream cooldown are in memory per server instance. They reduce redundant calls but do not coordinate separate Vercel instances or other applications using the key. A distributed limiter/cache or deployment-level quota protection remains necessary for a shared global request budget. A hard account quota cannot be repaired in application code. Cache reuse can return the same recommendations on Regenerate for five minutes; changed feedback still gets distinct retrievals. Demo mode remains explicit and never substitutes for live failures.

No deployment was performed. Before deploying, inspect Vercel project Logs for the affected request and Qloo account quota. After deploying these changes, the `qloo_upstream` structured event records actual upstream failures; the API code identifies cooldown-only responses. Do not repeatedly regenerate to probe quota limits.

## Validation

- Lint and TypeScript checks passed.
- 59 unit/API/security tests passed, including 429 cooldown, queued request suppression, seconds/date parsing, cache expiry/capacity/key isolation, duplicate requests, cancellation isolation, other HTTP errors, and manual-only retry behavior.
- All 14 desktop/mobile browser checks passed (12 existing journeys plus two new mocked-429 checks).
- Optimized production build passed via `npm run build:verify`; the synthetic server credential was absent from all 28 browser assets.
