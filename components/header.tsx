import Link from "next/link";
import { Asterisk, ArrowUpRight } from "lucide-react";
export function Header({ mode }: { mode: string }) {
  return (
    <header className="header">
      <Link href="/" className="brand">
        <Asterisk size={30} strokeWidth={1.6} />
        tasteweave<span>AI</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#how-it-works">The approach</Link>
        <Link href="/dashboard">Your Taste DNA</Link>
        <span className="mode">
          <i />
          {mode === "mock"
            ? "Demo data"
            : mode === "live"
              ? "Live Qloo mode"
              : "Configuration error"}
        </span>
        <Link href="/discover" className="nav-cta">
          Find your thread <ArrowUpRight size={16} />
        </Link>
      </nav>
    </header>
  );
}
