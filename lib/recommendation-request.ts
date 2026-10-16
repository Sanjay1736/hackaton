import { resultSchema, type TasteInput, type TasteResult } from "./schema";
import { retryAfterSeconds } from "./retry-after";
// Shared across Results mounts (including development effect replay). No automatic retries.
const pending = new Map<string, Promise<TasteResult>>();
const cooldowns = new Map<string, { until: number; message: string }>();
export function resetRecommendationRequestsForTests() {
  pending.clear();
  cooldowns.clear();
}
export function requestRecommendations(
  input: TasteInput,
  mode: string,
): Promise<TasteResult> {
  const key = JSON.stringify([mode, input]);
  const existing = pending.get(key);
  if (existing) return existing;
  const cooldown = cooldowns.get(mode);
  if (cooldown && cooldown.until > Date.now())
    return Promise.reject(new Error(cooldown.message));
  cooldowns.delete(mode);
  const task = (async () => {
    const response = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await response.json();
    if (!response.ok) {
      const message = json.error || "Could not create your recommendations.";
      if (response.status === 429)
        cooldowns.set(mode, {
          until:
            Date.now() +
            retryAfterSeconds(response.headers.get("Retry-After")) * 1000,
          message,
        });
      throw new Error(message);
    }
    return resultSchema.parse(json);
  })();
  pending.set(key, task);
  void task.finally(() => pending.delete(key)).catch(() => undefined);
  return task;
}
