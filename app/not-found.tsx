import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="wrap empty-state">
      <h1>An undiscovered thread.</h1>
      <p>This page doesn’t exist.</p>
      <Link href="/" className="button">
        Back to TasteWeave
      </Link>
    </main>
  );
}
