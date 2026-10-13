# TasteWeave AI

## Tagline

Your taste is a pattern. Discover yours.

## Project description

TasteWeave AI connects personal styling with cultural discovery. Start with artists, films, style preferences, and everyday interests; explore a personal edit of music, movies, brands, reading, and outfit concepts.

Its central design principle is visible evidence. The live provider resolves cultural interests through Qloo Search, uses returned entity IDs as Qloo Insights signals, and preserves those results beside every recommendation. Creative styling is explicitly labeled interpretation. A comparison view makes the difference between an ungrounded example and an evidence-backed format visible without claiming an accuracy improvement.

The bounded TypeScript workflow validates inputs, retrieves and normalizes entities, builds context, applies a replaceable recommendation engine, attaches provenance, and validates the final output. A readable trace shows the steps and retrieval counts. Users can reject a suggestion and retrieve an alternative while preserving their other preferences. Outfit concepts expose their garment choices and the styling rules behind them; product availability and prices are not claimed.

## Current status

The complete local demo is available without credentials. Demo fixtures are labeled throughout. The live Qloo provider passed a local real-key smoke test for seed resolution, recommendations, and exclusion refinement on 2026-10-13. The initial recommendation engine uses deterministic rules; there is no runtime LLM. Broad relevance and hosted operation have not yet been evaluated.

## Built with

Next.js, React, TypeScript, Tailwind CSS, Zod, Qloo API integration, Vitest, Playwright.

## Before submission

Replace this status with actual verified outcomes; add the public demo and GitHub URLs, record a walkthrough, verify current competition eligibility, and disclose AI-assisted implementation where required. Do not describe the simulated comparison baseline as an actual LLM call.
