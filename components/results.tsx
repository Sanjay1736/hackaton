"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Asterisk,
  RefreshCw,
  Music2,
  Film,
  BookOpen,
  Shirt,
  Layers3,
} from "lucide-react";
import {
  feedbackReasons,
  type TasteFeedback,
  resultSchema,
  tasteInputSchema,
  type TasteResult,
  type Recommendation,
} from "@/lib/schema";
export function Results({
  compare = false,
  mode,
}: {
  compare?: boolean;
  mode: string;
}) {
  const [result, setResult] = useState<TasteResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [empty, setEmpty] = useState(false);
  const [filter, setFilter] = useState("All threads");
  const generate = useCallback(
    async (force = false, signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const raw = sessionStorage.getItem("tasteweave-input");
        if (!raw) {
          setEmpty(true);
          return;
        }
        const input = tasteInputSchema.parse(JSON.parse(raw));
        let cachedValue: unknown = null;
        try {
          cachedValue = JSON.parse(
            sessionStorage.getItem("tasteweave-result") || "null",
          );
        } catch {
          /* A damaged cache must not block a fresh server request. */
        }
        const cached = resultSchema.safeParse(cachedValue);
        if (
          !force &&
          cached.success &&
          cached.data.mode === mode &&
          JSON.stringify(cached.data.input) === JSON.stringify(input)
        ) {
          setResult(cached.data);
          return;
        }
        const response = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal,
        });
        const json = await response.json();
        if (!response.ok)
          throw new Error(
            json.error || "Could not create your recommendations.",
          );
        const parsed = resultSchema.parse(json);
        setResult(parsed);
        try {
          sessionStorage.setItem("tasteweave-result", JSON.stringify(parsed));
        } catch {
          /* Results remain usable without caching. */
        }
      } catch (e) {
        if (signal?.aborted) return;
        setError(
          e instanceof Error
            ? e.message
            : "Something went wrong. Please retry.",
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [mode],
  );
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void generate(false, controller.signal);
    });
    return () => controller.abort();
  }, [generate]);
  async function refine(feedback: TasteFeedback[]) {
    if (!result) return;
    try {
      const input = tasteInputSchema.parse({ ...result.input, feedback });
      sessionStorage.setItem("tasteweave-input", JSON.stringify(input));
      sessionStorage.removeItem("tasteweave-result");
      await generate(true);
    } catch {
      setError(
        "Could not save your refinement. Check browser storage and try again.",
      );
    }
  }
  if (loading)
    return (
      <main
        id="main"
        className="wrap empty-state"
        aria-live="polite"
        aria-busy="true"
      >
        <Asterisk className="spin" size={54} />
        <span className="eyebrow">FOLLOWING YOUR THREADS</span>
        <h1>Weaving your world.</h1>
        <p>
          Validating your preferences, retrieving cultural entities,
          <br />
          and connecting every recommendation to its evidence.
        </p>
        <p className="muted">Live requests can take up to 25 seconds.</p>
      </main>
    );
  if (empty)
    return (
      <main id="main" className="wrap empty-state">
        <Asterisk size={48} />
        <h1>
          Your story starts
          <br />
          <em>with a few favorites.</em>
        </h1>
        <p>Create a taste profile to discover your personal edit.</p>
        <Link href="/discover" className="button">
          Discover My Taste <ArrowRight size={18} />
        </Link>
      </main>
    );
  if (error)
    return (
      <main id="main" className="wrap empty-state">
        <h1>A thread came loose.</h1>
        <p role="alert" className="error">
          {error}
        </p>
        <button className="button" onClick={() => generate(true)}>
          Try again <RefreshCw size={18} />
        </button>
        <Link href="/discover" className="text-link">
          Edit preferences
        </Link>
      </main>
    );
  if (!result) return null;
  return (
    <main id="main" className="wrap dashboard">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR PERSONAL CULTURAL EDIT</span>
          <h1>
            {compare ? (
              "A look behind the recommendations."
            ) : (
              <>
                A world that feels
                <br />
                <em>like you.</em>
              </>
            )}
          </h1>
        </div>
        <div className="dashboard-actions">
          <Link href="/discover" className="button secondary">
            Refine my taste <ArrowUpRight size={16} />
          </Link>
          <button className="text-link" onClick={() => generate(true)}>
            <RefreshCw size={15} /> Regenerate
          </button>
        </div>
      </div>
      <div className="notice">
        <span className="mode">
          <i />
          {result.mode === "mock" ? "Demo data" : "Live Qloo results"}
        </span>
        <span>
          {result.mode === "mock"
            ? "Local sample catalog · No Qloo calls were made."
            : "Retrieved from Qloo · Interpretations composed by deterministic rules."}
        </span>
      </div>
      {result.input.feedback.length > 0 && (
        <div className="refinement-note" role="status">
          <span>
            {result.input.feedback.length} suggestions excluded. Alternatives
            honor your feedback; no negative affinity is inferred.
          </span>
          <button className="text-link" onClick={() => refine([])}>
            Reset exclusions
          </button>
        </div>
      )}
      <nav className="result-tabs" aria-label="Results views">
        <Link aria-current={!compare ? "page" : undefined} href="/dashboard">
          Your Taste DNA
        </Link>
        <Link aria-current={compare ? "page" : undefined} href="/compare">
          Compare the evidence <ArrowUpRight size={14} />
        </Link>
      </nav>
      {compare ? (
        <Comparison result={result} />
      ) : (
        <>
          <section className="dna-grid">
            <div className="dna-card">
              <span className="eyebrow">YOUR STYLE ARCHETYPE</span>
              <Asterisk className="dna-star" size={118} strokeWidth={0.6} />
              <h2>{result.archetype}</h2>
              <p>
                Considered details. Room for curiosity.
                <br />A personal edit inspired by your stated style.
              </p>
              <span className="interpretation">
                AI interpretation · deterministic rules, not a Qloo
                classification
              </span>
              <div className="palette">
                {result.palette.map((c) => (
                  <div key={c}>
                    <i style={{ background: c }} />
                    <span>{c.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="threads-card">
              <span className="eyebrow">THE THINGS THAT MAKE YOU, YOU</span>
              <h2>Your starting threads.</h2>
              {(
                ["music", "screen", "fashion", "lifestyle", "colors"] as const
              ).map(
                (key) =>
                  result.input[key].length > 0 && (
                    <div className="thread-row" key={key}>
                      <span>{key === "screen" ? "Film & TV" : key}</span>
                      <p>{result.input[key].join(" · ")}</p>
                    </div>
                  ),
              )}
            </div>
          </section>
          <section className="recommendations">
            <div className="section-heading">
              <div>
                <span className="eyebrow">FOLLOW YOUR CURIOSITY</span>
                <h2>Your next favorite things.</h2>
              </div>
              <span className="muted">Every pick has a thread to follow.</span>
            </div>
            <div className="filter-row" aria-label="Filter recommendations">
              {[
                "All threads",
                "artist",
                "movie",
                "brand",
                "book",
                "outfit",
              ].map((f) => (
                <button
                  key={f}
                  className={filter === f ? "active" : ""}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {(
                    {
                      artist: "Music",
                      movie: "Film",
                      brand: "Style",
                      book: "Lifestyle",
                      outfit: "Outfit concepts",
                    } as Record<string, string>
                  )[f] || f}
                </button>
              ))}
            </div>
            <div className="rec-grid">
              {result.recommendations
                .filter(
                  (r) => filter === "All threads" || r.category === filter,
                )
                .map((r, i) => (
                  <RecommendationCard
                    key={r.id}
                    rec={r}
                    result={result}
                    index={i}
                    onReject={(feedback) =>
                      refine([
                        ...result.input.feedback.filter(
                          (f) => f.id !== feedback.id,
                        ),
                        feedback,
                      ])
                    }
                  />
                ))}
            </div>
            {!result.recommendations.some(
              (r) => filter === "All threads" || r.category === filter,
            ) && (
              <div className="no-results">
                <h3>No suggestions in this thread yet.</h3>
                <p>
                  Try another category or refine your cultural interests. We
                  won’t invent results.
                </p>
                <Link className="text-link" href="/discover">
                  Refine preferences <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </section>
        </>
      )}
      <section className="transparency">
        <div>
          <span className="eyebrow">NOT A BLACK BOX</span>
          <h2>How this edit came together.</h2>
          <p>
            One bounded workflow. Visible sources.
            <br />
            No invented cultural links or confidence scores.
          </p>
        </div>
        <div>
          <details>
            <summary>
              Explore the workflow <span>{result.trace.length} steps</span>
            </summary>
            <ol className="trace">
              {result.trace.map((t) => (
                <li key={t.step}>
                  <strong>{t.step}</strong>
                  <p>{t.detail}</p>
                </li>
              ))}
            </ol>
          </details>
          <details>
            <summary>
              Retrieved entity ledger{" "}
              <span>{result.entities.length} entities</span>
            </summary>
            <div className="ledger">
              {result.entities.map((e) => (
                <div key={e.id}>
                  <strong>{e.name}</strong>
                  <span>
                    {e.category} · {e.role} ·{" "}
                    {e.source === "demo" ? "Demo fixture" : "Qloo"}
                  </span>
                  <code>{e.id}</code>
                  <p>
                    {e.endpoint} · Inputs: {e.inputs.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </details>
          {result.warnings.map((w) => (
            <p className="warning" key={w}>
              {w}
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
function RecommendationCard({
  rec,
  result,
  index,
  onReject,
}: {
  rec: Recommendation;
  result: TasteResult;
  index: number;
  onReject: (feedback: TasteFeedback) => Promise<void>;
}) {
  const [reason, setReason] = useState<TasteFeedback["reason"]>("Not my taste");
  const Icon =
    rec.category === "artist"
      ? Music2
      : rec.category === "movie"
        ? Film
        : rec.category === "book"
          ? BookOpen
          : rec.category === "outfit"
            ? Shirt
            : Layers3;
  return (
    <article className="rec-card">
      <div className={`rec-art art-${rec.category}`} aria-hidden="true">
        <span className="art-index">
          THE PERSONAL EDIT / {String(index + 1).padStart(2, "0")}
        </span>
        <Icon size={76} strokeWidth={0.75} />
        <span className="art-word">
          {rec.category === "artist"
            ? "listen."
            : rec.category === "movie"
              ? "immerse."
              : rec.category === "book"
                ? "wander."
                : rec.category === "brand"
                  ? "consider."
                  : "wear."}
        </span>
      </div>
      <div className="rec-body">
        <span className="eyebrow">
          {rec.category} ·{" "}
          {rec.interpretation
            ? "AI interpretation"
            : result.mode === "mock"
              ? "Demo sample"
              : "Qloo result"}
        </span>
        <h3>{rec.title}</h3>
        <p>{rec.explanation}</p>
        {rec.styling && (
          <div className="styling-plan">
            <span className="eyebrow">THE PIECES</span>
            <ul>
              {rec.styling.pieces.map((piece) => (
                <li key={piece}>{piece}</li>
              ))}
            </ul>
            <details>
              <summary>Why these choices?</summary>
              <ul>
                {rec.styling.decisions.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </details>
          </div>
        )}
        <details>
          <summary>
            Follow the evidence <ArrowUpRight size={16} />
          </summary>
          <div className="evidence">
            {rec.evidenceIds.map((id) => {
              const e = result.entities.find((x) => x.id === id)!;
              return (
                <div key={id}>
                  <strong>{e.name}</strong>
                  <p>
                    {e.source === "demo"
                      ? "Locally authored fixture; not retrieved from Qloo."
                      : "Returned by Qloo using the combined signals below."}
                  </p>
                  <code>{e.id}</code>
                  <p>
                    Source: {e.endpoint}
                    <br />
                    Input signals: {e.inputs.join(", ")}
                  </p>
                  {e.seedIds.length > 0 && (
                    <p>Seed IDs: {e.seedIds.join(", ")}</p>
                  )}
                </div>
              );
            })}
            <p>
              {rec.interpretation
                ? "This creative concept uses your explicit styling preferences. Its reference entity does not substantiate an outfit-level cultural relationship."
                : "Query provenance identifies the inputs used, not a causal explanation or certainty score."}
            </p>
            <Link href="/discover" className="text-link">
              Refine this direction <ArrowRight size={15} />
            </Link>
          </div>
        </details>
        {!rec.interpretation && (
          <details className="feedback-panel">
            <summary>Not for me · find an alternative</summary>
            <label htmlFor={`reason-${rec.id}`}>What should change?</label>
            <select
              id={`reason-${rec.id}`}
              value={reason}
              onChange={(e) =>
                setReason(e.target.value as TasteFeedback["reason"])
              }
            >
              {feedbackReasons.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <button
              className="button secondary"
              disabled={result.input.feedback.length >= 24}
              onClick={() => onReject({ id: rec.evidenceIds[0], reason })}
            >
              Find an alternative <ArrowRight size={15} />
            </button>
            {result.input.feedback.length >= 24 && (
              <p>Reset exclusions to explore a new direction.</p>
            )}
            <p>
              This excludes this item. Your reason is used only by TasteWeave;
              it is not sent to Qloo or treated as a dislike score.
            </p>
          </details>
        )}
      </div>
    </article>
  );
}
function Comparison({ result }: { result: TasteResult }) {
  const pick = result.recommendations.find((r) => !r.interpretation);
  return (
    <section className="comparison">
      <p className="lead">Same curiosity. Different evidence.</p>
      <p className="muted">
        This is an illustrative comparison of evidence, not an accuracy
        evaluation. No LLM is connected.
      </p>
      <div className="compare-grid">
        <article>
          <span className="eyebrow">GENERIC LLM-ONLY BASELINE · SIMULATED</span>
          <h2>“Try a soulful playlist and a minimalist outfit.”</h2>
          <p>
            A hand-authored example of an ungrounded answer. This text was not
            generated by an LLM at runtime.
          </p>
          <hr />
          <strong>Evidence available</strong>
          <p>
            None. No retrieved entities, source IDs, or verifiable query
            context.
          </p>
        </article>
        <article className="grounded">
          <span className="eyebrow">
            {result.mode === "mock"
              ? "DEMO GROUNDED FORMAT · SAMPLE EVIDENCE"
              : "QLOO-GROUNDED RESULT"}
          </span>
          <h2>{pick?.title || "No retrieved suggestion available."}</h2>
          <p>
            {pick?.explanation ||
              "Refine your preferences to try another retrieval."}
          </p>
          <hr />
          <strong>Evidence available</strong>
          <p>
            {result.mode === "mock"
              ? "Local fixture references demonstrate the structure only. They do not validate a cultural connection."
              : "Actual returned entity IDs and the seed entities used in the Insights query."}
          </p>
          {pick?.evidenceIds.map((id) => (
            <code key={id}>{id}</code>
          ))}
        </article>
      </div>
      <Link className="text-link" href="/dashboard">
        Explore the full edit <ArrowRight size={18} />
      </Link>
    </section>
  );
}
