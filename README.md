# TasteWeave AI

**Your taste is a pattern. Discover yours.**

A personal cultural-discovery and styling application prepared for the Qloo Agentic Hackathon. Next.js App Router, React, strict TypeScript, Tailwind CSS, Zod, Vitest, and Playwright.

**Status: local demo and real Qloo retrieval verified on 2026-10-13.** An opt-in live smoke test resolved an artist seed, retrieved recommendations, and confirmed that a rejected entity did not return during refinement. This verifies one profile, not broad recommendation quality or hosted operation. There is no runtime LLM; recommendations and styling use transparent deterministic rules.

## Local setup

Use Node.js 24 (see `.nvmrc`) and npm. Node 22.12+ is supported by the package configuration.

```bash
npm ci
# First setup only. Do not overwrite an existing file containing your key.
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Demo mode needs no API key. Next.js requires a **file** named `.env.local` at the project root; `local.env` is not loaded automatically. Stop the server with Ctrl+C before changing environment variables, then restart.

1. Click **Discover My Taste**.
2. Choose artists, films/TV, fashion, lifestyle, and colors; custom interests are supported. At least one artist or screen title is required.
3. Add an optional occasion and budget. Alternatively, use the example profile.
4. Generate the dashboard; explore recommendations, outfit pieces, explanations, source IDs, and the workflow trace.
5. Use **Not for me · find an alternative** to exclude a cultural suggestion. Exclusions persist across reloads and can be reset. Use **Refine my taste** to edit the original preferences.
6. The comparison page shows a **simulated**, hand-authored baseline. It is not evidence of superior accuracy or an actual LLM call.

The profile and cached results stay in browser-tab `sessionStorage`; there is no database, account, or analytics integration. A corrupt result cache is discarded and regenerated. Cache entries must match the selected preferences, server mode, and engine schema version.

## Environment variables

| Variable               | Default                          | Purpose                                                       |
| ---------------------- | -------------------------------- | ------------------------------------------------------------- |
| `TASTEWEAVE_DATA_MODE` | `mock`                           | Explicitly choose `mock` or `live`; other values fail visibly |
| `QLOO_BASE_URL`        | `https://hackathon.api.qloo.com` | Credentials are restricted to this exact hackathon host       |
| `QLOO_API_KEY`         | empty                            | Private server credential; required for live mode             |

`TASTEWEAVE_TEST_BUILD=1` is an internal test option selecting `.next-test` instead of `.next`. **Do not set it on Vercel.**

Never put credentials in `NEXT_PUBLIC_` variables, `next.config`'s `env` option, source code, or a public repository. Both Git and Vercel ignore local environment files. `.env.example` contains placeholders only.

### Activate live mode when the key arrives

Set `.env.local` privately:

```dotenv
QLOO_API_KEY=replace_with_your_real_key
QLOO_BASE_URL=https://hackathon.api.qloo.com
TASTEWEAVE_DATA_MODE=live
```

Restart the server and generate a profile with known artist/film titles. Confirm the ledger contains resolved seeds and actual `/v2/insights` results in the expected categories. Inspect unresolved-name warnings and evidence references. Only after this succeeds should the submission describe the live integration as verified.

Empty or common placeholder keys fail before any API call. Authentication, upstream errors, malformed JSON, invalid schemas, and rate limits are surfaced to the user. Live errors never silently become demo data.

## How recommendations depend on preferences

- **Demo:** an explicitly authored catalog ranks sample suggestions by matching selected music, screen, style, lifestyle, and color labels. This is not Qloo data or measured affinity. Unknown interests use deterministic catalog order. Exclusions remove suggestions, and a favorite already supplied as input is not recommended back to the user.
- **Live:** artist and film/TV names resolve through Qloo Search. Returned IDs become combined cultural signals for artist, movie, brand, and book Insights requests. Changed resolved favorites change the query signals. Rejected IDs become exclusion parameters.
- **Styling:** selected styles change garment lists. Occasion adjusts layers and footwear; lower budgets favor existing/borrowed/secondhand pieces without claiming verified prices. Palette options affect actual swatches. These authored interpretations are distinct from the retrieved brand reference and are not Qloo outfit classifications.

Only cultural queries and entity IDs go to Qloo. Budget, occasion, freeform styling context, and rejection reasons do not. Reasons are processed within TasteWeave and returned to the browser; they are not inferred negative affinity scores.

## Architecture and API

| Location                                         | Responsibility                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `app/`, `components/`                            | Landing, onboarding, dashboard, comparison, evidence details, loading/error states               |
| `lib/schema.ts`                                  | Strict input and output validation; mode, evidence references, seed provenance, exclusion checks |
| `lib/providers/taste-provider.ts`                | Replaceable cultural retrieval interface                                                         |
| `lib/providers/mock-taste-provider.ts`           | Locally authored preference-sensitive demo catalog                                               |
| `lib/providers/qloo-taste-provider.ts`           | Exact-name entity resolution and bounded cross-category retrieval                                |
| `lib/qloo/client.ts`, `types.ts`, `normalize.ts` | Private transport, consumed response schemas, source-aware deduplication                         |
| `lib/agent/workflow.ts`                          | Validate → retrieve → normalize → context → compose → evidence → final validation                |
| `lib/agent/engine.ts`, `styling.ts`              | Replaceable deterministic recommendation engine and authored styling rules                       |
| `scripts/`, `tests/security.test.ts`             | Credential canary build scan and client-import boundary checks                                   |

`POST /api/discover` and `POST /api/recommendations` accept the same JSON profile and run the full workflow. The dashboard uses `/api/recommendations`. These are application routes; they do not call the deprecated Qloo `/recommendations` endpoint.

```json
{
  "music": ["Sade"],
  "screen": ["The Grand Budapest Hotel"],
  "fashion": ["Relaxed tailoring"],
  "lifestyle": ["Art galleries"],
  "colors": ["Earth tones"],
  "budget": "Open",
  "occasion": "Gallery afternoon",
  "feedback": []
}
```

Feedback entries contain `id` and one of `Not my taste`, `Already familiar`, or `Show me something else`. The response includes mode, validated input, entities, recommendations, palette, archetype, warnings, and the completed workflow trace. Errors return a sanitized `{ "error": "..." }` and appropriate HTTP status.

## Request limits and security

- Six entries per category, 80 characters per entry, 24 exclusions, 16 KB streamed request-body cap.
- At most 12 seed searches and four Insights calls; sequential upstream requests per server instance, three results per output category.
- Eight-second per-call timeout and a 25-second overall live retrieval deadline; redirects rejected, no automatic retry amplification.
- Three active workflows and 20 requests/minute **per server instance**. This is not a distributed abuse limiter. Configure deployment-level limits for a public live demo.
- Exact-name resolution excludes ambiguous/missing matches instead of guessing. Missing results are never fabricated.
- Server-only modules own the API key; only validated fields reach the response. No raw upstream error or credential logging.
- Evidence represents query provenance, not a causal explanation for any one preference. No invented confidence scores, product inventory, or availability claims.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm start
```

`npm run format` formats source. Dev and build use Next.js's supported webpack backend. Browser tests use an isolated demo server at http://127.0.0.1:3100 with `.next-test`; run them separately from the verification build, which uses the same directory.

```bash
npm run build:verify
```

This creates an optimized production build in `.next-test` using a random **non-secret** server credential canary, then scans browser assets for that value. It never makes a Qloo request. Unit tests also traverse client imports to catch private environment access or server-only modules entering the client graph. These checks provide evidence for the current boundary; they are not a universal security guarantee.

`.github/workflows/ci.yml` runs lint, type checking, tests, desktop/mobile browser journeys, and the canary build without real credentials. The workflow is prepared but has not run on GitHub until the repository is published.

See [actual validation results](docs/VALIDATION.md).

## Vercel deployment

The project uses the [standard Next.js integration on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs). No database or custom server is required. `vercel.json` declares the framework, `npm ci`, and `npm run build`; API routes use the Node runtime and a 60-second maximum duration.

1. Create a public GitHub repository containing the source, lockfile, MIT `LICENSE`, and documentation. Review staged files for secrets. Never publish captured Qloo responses.
2. Import the repository into Vercel. Use Node 24.x, the Next.js preset, repository-root directory, and default output settings. Do not override the output directory or set `TASTEWEAVE_TEST_BUILD`.
3. Set `TASTEWEAVE_DATA_MODE=mock` for the initial deployment. Leave `QLOO_API_KEY` unset. The demo must visibly say **Demo data**.
4. For live activation, set the real key as a private server environment variable, the hackathon base URL, and `TASTEWEAVE_DATA_MODE=live`. Configure the intended Preview/Production environment scopes and redeploy.
5. Add deployment-level request limiting and verify access on the publicly shared URL without an account or local setup. Confirm the hosted onboarding, refinement, evidence, errors, and mobile layout.
6. Add the real public demo and repository URLs to Devpost. No public deployment or repository publication has been performed as part of this local preparation.

## Submission status and limitations

The UI and end-to-end demo are implemented. Official API contract notes, tests, MIT license, and deployment configuration are included. **Real Qloo authentication, Search/Insights response compatibility, and exclusion refinement passed a local smoke test. Broader profile relevance, quota behavior, and hosted operation still require verification.** There is no actual LLM engine or measured comparison of recommendation quality. Outfit concepts use user preferences; the retrieved brand is a reference, not proof of outfit suitability.

Read [Qloo contract notes](docs/QLOO.md), [Devpost draft](docs/DEVPOST.md), and [remaining competition milestones](docs/HACKATHON-PLAN.md). Confirm current eligibility and submission requirements before publishing claims.

### Repeat the live smoke test

With a real server-side key in `.env.local`, run `npm run verify:live`. This opt-in test consumes real Qloo quota (two workflows, each with Search and four category Insights requests). It is excluded from `npm test` and CI. Never publish credentials or captured response data.

Qloo requests now share in-flight work and cache validated responses for five minutes (maximum 256 entries, credential-scoped). HTTP 429 establishes an instance-local cooldown using `Retry-After`; no automatic retry is scheduled. See [rate-limit diagnosis](docs/RATE-LIMIT-DIAGNOSIS.md) for evidence and deployment limits.
