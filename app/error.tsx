"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="wrap empty-state">
      <h1>A thread came loose.</h1>
      <p>We couldn’t load this view.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
