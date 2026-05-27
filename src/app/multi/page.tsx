"use client";

import Link from "next/link";
import { Phone } from "@/components/icons";

const RYE: React.CSSProperties = {
  fontFamily: "var(--font-rye), Georgia, serif",
};
const FELL: React.CSSProperties = {
  fontFamily: "var(--font-fell), Georgia, serif",
};

export default function MultiLandingPage() {
  return (
    <main className="felt-saloon relative min-h-[100dvh] overflow-hidden">
      <div
        aria-hidden
        className="wood-grain pointer-events-none absolute inset-x-0 top-0 h-3 shadow-[0_4px_14px_rgba(0,0,0,0.55)]"
      />
      <div
        aria-hidden
        className="wood-grain pointer-events-none absolute inset-x-0 bottom-0 h-3 shadow-[0_-4px_14px_rgba(0,0,0,0.55)]"
      />

      <div className="relative mx-auto flex max-w-sm flex-col items-center px-6 pt-8 pb-10 text-center">
        <Link
          href="/"
          className="self-start text-[0.78rem] font-bold text-[var(--parchment-light)]/75 transition-colors hover:text-[var(--accent-light)]"
          style={FELL}
        >
          ← Home
        </Link>

        {/* Hero icon */}
        <div className="relative mt-6 select-none" aria-hidden>
          <div
            className="absolute inset-0 -m-6 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(255,196,90,0.22), transparent 70%)",
              filter: "blur(2px)",
            }}
          />
          <div className="relative drop-shadow-[0_14px_18px_rgba(0,0,0,0.55)]">
            <Phone size={104} color="var(--accent-light)" />
          </div>
        </div>

        <span
          className="mt-7 text-[0.62rem] uppercase text-[var(--parchment-light)]/65"
          style={{ ...FELL, letterSpacing: "0.48em" }}
        >
          ★  Cross-Device Play  ★
        </span>

        <h1
          className="mt-3 leading-[0.95]"
          style={{
            ...RYE,
            fontSize: "clamp(2.5rem, 12vw, 4rem)",
            color: "var(--parchment-light)",
            textShadow:
              "0 2px 0 var(--wood-mid), 0 3px 0 rgba(0,0,0,0.45), 0 10px 28px rgba(0,0,0,0.6)",
            letterSpacing: "0.01em",
          }}
        >
          Saloon
          <br />
          <span style={{ color: "var(--accent-light)" }}>by Wire</span>
        </h1>

        <p
          className="mt-5 max-w-[20rem] text-[1rem] italic leading-snug text-[var(--parchment-light)]/85"
          style={FELL}
        >
          Every cowpoke on their own phone. Ride in whenever you please —
          no need to share a table.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex w-full flex-col gap-3">
          {/* Primary — brass plaque */}
          <Link
            href="/multi/create"
            className="relative block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[var(--accent-dark)] py-3.5 text-center transition-transform active:scale-[0.985]"
            style={{
              background:
                "linear-gradient(180deg, #ffd989 0%, #d8a93b 48%, #a07a22 100%)",
              boxShadow:
                "0 1px 0 rgba(255,240,200,0.85) inset, 0 -2px 0 rgba(60,40,8,0.35) inset, 0 10px 26px rgba(0,0,0,0.5)",
            }}
          >
            <span
              className="relative block text-[1.05rem] font-bold uppercase text-[var(--wood-dark)]"
              style={{
                ...RYE,
                letterSpacing: "0.22em",
                textShadow: "0 1px 0 rgba(255,240,200,0.55)",
              }}
            >
              Set the Table
            </span>
            <span
              className="relative mt-0.5 block text-[0.62rem] uppercase text-[var(--wood-dark)]/75"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              Start a new hand
            </span>
          </Link>

          {/* Secondary — outlined leather */}
          <Link
            href="/multi/join"
            className="relative block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[var(--accent-mid)]/55 py-3.5 text-center transition-colors hover:border-[var(--accent-light)]/80 active:scale-[0.985]"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,30,20,0.7) 100%)",
              boxShadow:
                "0 1px 0 rgba(244,228,183,0.06) inset, 0 8px 22px rgba(0,0,0,0.4)",
            }}
          >
            <span
              className="relative block text-[1.05rem] font-bold uppercase text-[var(--parchment-light)]"
              style={{
                ...RYE,
                letterSpacing: "0.22em",
                textShadow: "0 2px 0 rgba(0,0,0,0.55)",
              }}
            >
              Pull Up A Chair
            </span>
            <span
              className="relative mt-0.5 block text-[0.62rem] uppercase text-[var(--parchment-light)]/65"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              Join with a code
            </span>
          </Link>
        </div>

        {/* House-rules style divider */}
        <div className="mt-10 flex w-full items-center gap-3 text-[var(--accent-mid)]/55">
          <span className="h-px flex-1 bg-[var(--accent-mid)]/30" />
          <span
            className="text-[0.6rem] uppercase text-[var(--parchment-light)]/70"
            style={{ ...FELL, letterSpacing: "0.36em" }}
          >
            Pick a name · Share the code · Roll
          </span>
          <span className="h-px flex-1 bg-[var(--accent-mid)]/30" />
        </div>
      </div>
    </main>
  );
}
