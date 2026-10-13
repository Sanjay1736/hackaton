import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/header";
import "./globals.css";
export const metadata: Metadata = {
  title: "TasteWeave AI — Find your thread",
  description:
    "A culturally curious guide to your style, sound, and next favorite thing. Explore a clearly labeled demo; live cultural discovery requires a configured Qloo connection.",
};
export const dynamic = "force-dynamic";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <Header mode={process.env.TASTEWEAVE_DATA_MODE ?? "mock"} />
        {children}
        <footer>
          <LinkBrand />
          <p>A little curiosity. A world of connections.</p>
          <span>Made for the Qloo Agentic Hackathon · 2026</span>
        </footer>
      </body>
    </html>
  );
}
function LinkBrand() {
  return (
    <Link href="/" className="brand">
      ✳ tasteweave
    </Link>
  );
}
