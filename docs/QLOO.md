# Qloo integration contract

Reviewed 2026-10-13 against the user-provided hackathon guide and official documentation. The guide was also successfully fetched directly after the browser fetch failed.

Sources:

- https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide
- https://docs.qloo.com/reference/get-search (embedded official endpoint schema)
- https://github.com/qloo/docs-public/blob/main/reference/api-onboarding.md (Insights response example)
- https://github.com/qloo/docs-public/blob/main/reference/available-parameters-by-entity-type.md

Use only `https://hackathon.api.qloo.com`. Authenticate with a server-only `X-Api-Key` header. Neither `/recs` nor `/recommendations` is called upstream; the application's own `/api/recommendations` route is unrelated.

1. `GET /search?query=<name>&types=urn:entity:artist&take=5`. Screen queries use the documented comma-separated `types=urn:entity:movie,urn:entity:tv_show`. Consume the top-level `results` array. The live hackathon response verified on 2026-10-13 omits `success` and supplies a `types` array. The parser also accepts documented `type`/`subtype` fields; explicit `success: false` is rejected. Each entity requires a UUID `entity_id`, name, and category.
2. Resolve one exact case-insensitive NFKC-normalized name within the requested categories. Exclude ambiguous or missing matches with a warning. Never fabricate an identifier or accept an unrelated first search hit.
3. `GET /v2/insights?filter.type=urn:entity:<category>&signal.interests.entities=<seed IDs>&filter.exclude.entities=<seed IDs and rejected Qloo IDs>&take=3`. Output categories: artist, movie, brand, book. Their official parameter tables permit the entity signal and exclusion filter.
4. Consume `success` and `results.entities`. Retain IDs, name, category, source endpoint, and the actual combined seed signals. Ignore optional metadata rather than inventing it. Malformed consumed fields fail closed.

404 search responses are treated as documented no-results responses. Other upstream errors are sanitized. 429 produces a visible retry-later state and a 60-second application Retry-After header. No automatic fallback or retry.

Tests use synthetic contract fixtures, not captured API data. Real Search and Insights requests succeeded on 2026-10-13, followed by a passing end-to-end provider smoke test with exclusion refinement. Broader name matching, empty categories, and rate-limit behavior remain to be evaluated live. Do not commit real Qloo response data to a public repository.

Refinement accepts at most 24 explicit entity exclusions. Only real UUID-shaped IDs are passed to Qloo; demo IDs and reason text are not. Returned excluded IDs are filtered defensively before composition. Exclusion means “do not show this item,” not a negative taste weight.

Submission preparation rechecked the official hackathon guide via direct HTTPS download. The exact base host, GET endpoints, X-Api-Key header, and entity signals agree with the implementation. Search array schemas and the Insights results.entities schema were checked against the official endpoint documentation and authentication examples cited above. The separate `npm run verify:live` smoke test subsequently passed with the real key.
