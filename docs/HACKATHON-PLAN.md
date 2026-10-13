# What must make TasteWeave worth choosing

The product needs to demonstrate a useful cultural discovery that depends on Qloo, then let the user refine it. A polished screen or a provider toggle is not proof of that value.

## Focused demo story

A person wants a personal cultural edit for an upcoming day out: something to listen to, a film or book to discover, brands to explore, and a styling concept that fits their occasion. They supply a few cultural favorites. The app retrieves cross-category recommendations, makes the source visible, and changes a recommendation when they reject it.

Keep the distinction clear: Qloo retrieves cultural entities. TasteWeave's authored styling rules create garment concepts from explicit preferences. There is no claim that Qloo supplies product inventory, outfit compatibility, prices, or a causal explanation for each taste connection.

## Completed improvement

- Explicit feedback creates real exclusion parameters for the live retrieval provider.
- Alternative suggestions are demonstrable in the local sample catalog.
- Exclusions persist through reloads, are bounded, and can be reset.
- Styling changes the actual garment list according to style, occasion, and budget strategy, with reasons displayed.
- If the provider cannot supply a brand reference, the engine does not invent one to make an outfit card.

## Highest-priority work after the live smoke test

1. Search and Insights compatibility passed a real-key smoke test on 2026-10-13. Next confirm meaningful results for at least three substantially different profiles.
2. Inspect what brand metadata Qloo actually returns. Only then choose a grounded way to enrich brand discovery. Do not infer fashion attributes from the brand name alone.
3. Live rejection exclusion passed the smoke test. Expand coverage to repeated feedback and empty alternatives.
4. Deploy publicly and check the complete flow without a developer's local environment. Add deployment-level quota protection.

## Evaluation before claiming an advantage

Recruit a small set of willing testers and report the actual number, not an invented success percentage. Use distinct profiles; include unfamiliar artists or titles and an ambiguous query.

For each tester:

- Ask them to rate relevance and novelty of the returned cultural picks.
- Have them reject one suggestion and rate the replacement.
- Check whether the cited evidence actually points to the retrieved entity.
- Ask whether the styling respects the stated occasion, style, and budget strategy. Budget is not a verified shopping total.
- If comparing against an LLM, run a real baseline with the same user input and anonymize/shuffle presentation. The current comparison screen is simulated and cannot be used as evaluation evidence.

Record empty results, failed requests, and poor recommendations too. Report relevance ratings, completion rate, and retrieval latency with sample size and limitations. No causal or statistical superiority claims without adequate evidence.

## Submission gates

- Successful real Qloo requests: achieved locally for one profile and refinement; public deployment verification remains.
- Public source repository with MIT license, setup, and no secrets or captured Qloo data.
- Externally hosted, fully working demo and an accurate English submission description.
- A demonstrated bounded agent workflow with meaningful retrieval and feedback, not decorative agent terminology.
- Confirm account/team eligibility and current official rules directly on Devpost.

Official references reviewed in this conversation: https://qloo.devpost.com/ and https://qloo.devpost.com/rules . The listed judging dimensions are technological implementation, design, potential impact, and quality of the idea. No improvement can guarantee a prize.
