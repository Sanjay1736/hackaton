# Submission preparation validation

Executed locally on 2026-10-13 with Node 24.18.0 and npm 11.16.0. The existing UI layout and visual design were preserved.

| Check                        | Actual result                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`               | Passed, no errors or warnings                                                                                                |
| `npm run typecheck`          | Passed                                                                                                                       |
| `npm test`                   | 47 tests passed across six files                                                                                             |
| `npm run test:e2e`           | 12 tests passed: six journeys in Chromium desktop and mobile emulation                                                       |
| `npm run build:verify`       | Optimized Next.js production webpack build passed in isolated `.next-test`                                                   |
| Credential-canary asset scan | Synthetic server credential absent from all 28 emitted client assets                                                         |
| Client import boundary tests | No reachable server-only module or direct private Qloo environment access from client entrypoints                            |
| Git ignore verification      | Local environment files, environment backups, build output, and Vercel metadata excluded; `.env.example` remains publishable |
| `npm audit --omit=dev`       | Zero reported production vulnerabilities                                                                                     |

`build:verify` invokes the same `next build --webpack` compilation used by `npm run build`, with an isolated output directory and a synthetic credential. It does not invoke Qloo. A standard `.next` build can be created with `npm run build` for `npm start` or Vercel.

## What was fixed and tested

- Demo cultural picks now depend on selected interests through explicitly authored local matching rules. Tests compare distinct profiles and confirm changes in music, movie, brand, book, and outfit suggestions.
- All six palette choices affect displayed swatches. Custom style strings such as `constructor` cannot trigger inherited-object lookup failures.
- Lower-budget styling preserves layers needed by formal/outdoor occasions; prices remain unverified.
- Damaged cached result JSON no longer prevents a new request. Engine schema versioning invalidates stale cached results.
- Full six-step onboarding, custom input, evidence, comparison, refinement, rejection persistence/reset, empty states, errors, and cache recovery pass browser tests.
- Real Qloo keys remain server-only. Empty/common placeholder keys fail before a network call; invalid upstream JSON has a distinct sanitized error.
- Output validation rejects missing evidence/seed references, invalid Qloo identifiers, duplicate entity IDs, source/mode mismatch, and resurfaced excluded items.
- README, placeholder environment example, MIT license, Git/Vercel ignore rules, Vercel configuration, and a GitHub Actions validation workflow are present.

## API contract verification

The official hackathon guide was fetched over HTTPS during this audit after browser retrieval failed. Its exact hackathon host, GET endpoints, `X-Api-Key` header, and entity-signal names agree with the client. Endpoint and response-shape references are recorded in [QLOO.md](QLOO.md). Unit tests use synthetic transport fixtures to verify headers, query parameters, exclusions, privacy, errors, and schemas.

**Real Qloo verification passed on 2026-10-13.** Search and Insights both returned HTTP 200. `npm run verify:live` passed one live integration test covering seed resolution, recommendation provenance, and exclusion refinement with the Sade profile. Live Search uses `types` and omits `success`; the parser now supports this observed shape, with two synthetic regression tests. The local environment is set to live mode. This is a one-profile smoke test, not a relevance, load, or hosted evaluation.

## Remaining deployment and verification work

1. Configure the real key as a private server environment variable on Vercel.
2. Expand live checks to distinct profiles, ambiguous names, empty responses, latency, and quota behavior. Do not publish captured Qloo response data.
3. Publish the repository and deploy on Vercel, then run the full workflow on the public URL. The config is prepared, but no remote deployment or GitHub Actions run was performed here.
4. Configure deployment-level request limiting. The existing in-memory limiter is per instance, not distributed.
5. Confirm the final submission accurately distinguishes rule-based styling, local fixtures, and verified live API results. There is no runtime LLM or measured accuracy comparison.

Mobile browser tests use Chromium emulation, not physical devices; Safari and Firefox have not been tested.

## Development dependency advisory

The earlier full dependency audit reported five high-severity entries in one development-only lint dependency chain: `braces` → `micromatch` → `fast-glob` → `@next/eslint-plugin-next` → `eslint-config-next` (GHSA-vfj7-8cjw-p6xm). At that check, the latest braces release available from the registry was still affected. No forced major downgrade was applied. The production-only audit above was rerun for this preparation and passed. Recheck the full audit for a compatible fix before public submission; the complete dependency tree is not claimed to be advisory-free.
