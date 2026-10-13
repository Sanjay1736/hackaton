"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Plus, Asterisk } from "lucide-react";
import { defaultInput, tasteInputSchema, type TasteInput } from "@/lib/schema";
const groups = [
  {
    key: "music",
    label: "Your soundtrack",
    subtitle: "Who’s always on repeat?",
    examples: [
      "Frank Ocean",
      "Sade",
      "Radiohead",
      "Beyoncé",
      "Khruangbin",
      "Taylor Swift",
    ],
  },
  {
    key: "screen",
    label: "Your screen world",
    subtitle: "Which stories stay with you?",
    examples: [
      "The Grand Budapest Hotel",
      "In the Mood for Love",
      "Succession",
      "Spirited Away",
      "Interstellar",
      "The Bear",
    ],
  },
  {
    key: "fashion",
    label: "Your sense of style",
    subtitle: "What feels most like you?",
    examples: [
      "Relaxed tailoring",
      "Minimalism",
      "Streetwear",
      "Vintage",
      "Bohemian",
      "Statement pieces",
    ],
  },
  {
    key: "lifestyle",
    label: "Your everyday rituals",
    subtitle: "What do you make time for?",
    examples: [
      "Art galleries",
      "Coffee culture",
      "Reading",
      "Live music",
      "Architecture",
      "Nature walks",
    ],
  },
  {
    key: "colors",
    label: "Your color story",
    subtitle: "Choose the palette you gravitate toward.",
    examples: [
      "Earth tones",
      "Monochrome",
      "Jewel tones",
      "Pastels",
      "Warm neutrals",
      "Bright accents",
    ],
  },
] as const;
export function Onboarding() {
  const router = useRouter();
  const [input, setInput] = useState<TasteInput>({
    ...defaultInput,
    music: [],
    screen: [],
    fashion: [],
    lifestyle: [],
    colors: [],
  });
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const parsed = tasteInputSchema.safeParse(
          JSON.parse(sessionStorage.getItem("tasteweave-input") || "null"),
        );
        if (parsed.success) setInput(parsed.data);
      } catch {
        /* Start with an empty profile if storage is unavailable. */
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const [step, setStep] = useState(0);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");
  const g = groups[Math.min(step, 4)];
  function toggle(value: string) {
    const list = input[g.key];
    if (!list.includes(value) && list.length >= 6) {
      setError("Choose up to six interests in each category.");
      return;
    }
    setInput({
      ...input,
      [g.key]: list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value],
    });
    setError("");
  }
  function next() {
    if (step === 1 && !input.music.length && !input.screen.length) {
      setError("Choose at least one artist, movie, or TV show to start.");
      return;
    }
    if (step < 5) {
      setStep(step + 1);
      setCustom("");
      setError("");
      return;
    }
    const parsed = tasteInputSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    try {
      sessionStorage.setItem("tasteweave-input", JSON.stringify(parsed.data));
      sessionStorage.removeItem("tasteweave-result");
      router.push("/dashboard");
    } catch {
      setError(
        "Browser session storage is unavailable. Enable it to continue.",
      );
    }
  }
  return (
    <>
      <div className="flow-top">
        <span className="eyebrow">YOUR TASTE, IN A FEW THREADS</span>
        <span>0{step + 1} / 06</span>
      </div>
      <div className="progress-track">
        <div style={{ width: `${((step + 1) / 6) * 100}%` }} />
      </div>
      <div className="onboard-grid">
        <div>
          <span className="circle-icon">
            <Asterisk size={30} />
          </span>
          <h1>
            {step < 5 ? (
              g.label
            ) : (
              <>
                A little
                <br />
                <em>more you.</em>
              </>
            )}
          </h1>
          <p className="lead">
            {step < 5
              ? g.subtitle
              : "Add an occasion and budget, or leave room for possibility."}
          </p>
          <p className="muted">
            {step < 5
              ? "Pick a few favorites, or add your own. There’s no right answer."
              : "These preferences shape the styling concepts. They are not sent to Qloo."}
          </p>
          <aside className="privacy-note">
            Only cultural search terms go to Qloo in live mode. Please don’t
            enter personal details. Your profile stays in this browser tab.
          </aside>
        </div>
        <section className="selection-panel" aria-label="Taste preferences">
          {step < 5 ? (
            <>
              <div className="panel-heading">
                <h2>
                  {g.key === "music"
                    ? "Artists & musicians"
                    : g.key === "screen"
                      ? "Movies & TV"
                      : g.label}
                </h2>
                <span>{input[g.key].length} / 6 selected</span>
              </div>
              <div className="chips">
                {[...new Set([...g.examples, ...input[g.key]])].map((v) => (
                  <button
                    type="button"
                    className={`chip ${input[g.key].includes(v) ? "selected" : ""}`}
                    aria-pressed={input[g.key].includes(v)}
                    key={v}
                    onClick={() => toggle(v)}
                  >
                    {v}
                    {input[g.key].includes(v) ? (
                      <Check size={15} />
                    ) : (
                      <Plus size={15} />
                    )}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = custom.trim();
                  if (value) {
                    if (!input[g.key].includes(value)) toggle(value);
                    setCustom("");
                  }
                }}
              >
                <label htmlFor="custom">Something else comes to mind?</label>
                <div className="custom-input">
                  <input
                    id="custom"
                    placeholder={
                      g.key === "music" ? "Add an artist…" : "Add your own…"
                    }
                    maxLength={80}
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                  />
                  <button type="submit" aria-label="Add custom interest">
                    <Plus size={20} />
                  </button>
                </div>
              </form>
              <button
                className="text-link sample-action"
                type="button"
                onClick={() => {
                  setInput(defaultInput);
                  setStep(5);
                  setError("");
                }}
              >
                Use the example taste profile <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <div className="final-fields">
              <label htmlFor="budget">Styling budget (optional)</label>
              <select
                id="budget"
                value={input.budget}
                onChange={(e) =>
                  setInput({
                    ...input,
                    budget: e.target.value as TasteInput["budget"],
                  })
                }
              >
                {["Open", "Under $100", "$100–$250", "$250+"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <label htmlFor="occasion">An occasion in mind? (optional)</label>
              <input
                id="occasion"
                placeholder="A gallery afternoon, a weekend away…"
                maxLength={80}
                value={input.occasion}
                onChange={(e) =>
                  setInput({ ...input, occasion: e.target.value })
                }
              />
              <div className="review">
                <span className="eyebrow">YOUR THREADS SO FAR</span>
                <p>
                  {[
                    ...input.music,
                    ...input.screen,
                    ...input.fashion,
                    ...input.lifestyle,
                    ...input.colors,
                  ].join(" · ") ||
                    "Go back to add your favorite artist or film."}
                </p>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="flow-actions">
            <button
              className="back"
              disabled={step === 0}
              onClick={() => {
                setStep(step - 1);
                setError("");
                setCustom("");
              }}
            >
              <ArrowLeft size={18} /> Back
            </button>
            <button className="button" onClick={next}>
              {step === 5 ? "Weave My Taste DNA" : "Continue"}
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
