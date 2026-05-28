"use client";

import Link from "next/link";
import Buck from "@/components/Buck";
import { useLocalGame } from "@/context/LocalGameContext";

function Flourish({ className = "" }: { className?: string }) {
  return (
    <svg
      width="200"
      height="14"
      viewBox="0 0 200 14"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M 6 7 Q 30 1 56 7 T 90 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="6" cy="7" r="1.2" fill="currentColor" />
      <g transform="translate(100 7)">
        <path
          d="M 0 -5 L 5 0 L 0 5 L -5 0 Z"
          fill="currentColor"
          opacity="0.85"
        />
        <path
          d="M 0 -2.4 L 2.4 0 L 0 2.4 L -2.4 0 Z"
          fill="var(--felt-deep)"
        />
      </g>
      <path
        d="M 110 7 Q 144 13 170 7 T 194 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="194" cy="7" r="1.2" fill="currentColor" />
    </svg>
  );
}

export default function Home() {
  const { status, players } = useLocalGame();
  const inProgress = status === "active" && players.length > 0;

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

      <div className="relative z-10 flex items-center justify-end px-4 pt-5">
        <Link
          href="/how"
          aria-label="How to play"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--accent-mid)]/45 bg-[rgba(5,28,20,0.55)] px-3 py-1.5 text-[0.7rem] font-bold uppercase text-[var(--parchment-light)]/75 transition-colors hover:border-[var(--accent-light)]/70 hover:text-[var(--accent-light)]"
          style={{
            fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
            letterSpacing: "0.22em",
          }}
        >
          <span aria-hidden>?</span>
          <span>How to Play</span>
        </Link>
      </div>

      <div className="relative mx-auto flex max-w-sm flex-col items-center px-6 pt-6 pb-10 text-center">
        <Flourish className="text-[var(--accent-mid)]/65" />

        <span
          className="mt-3 text-[0.62rem] uppercase text-[var(--parchment-light)]/65"
          style={{
            fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
            letterSpacing: "0.48em",
          }}
        >
          Est. 2009
        </span>

        <h1
          className="mt-3 leading-[0.92]"
          style={{
            fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
            fontSize: "clamp(3rem, 15vw, 5rem)",
            color: "var(--parchment-light)",
            textShadow:
              "0 2px 0 var(--wood-mid), 0 3px 0 rgba(0,0,0,0.45), 0 10px 28px rgba(0,0,0,0.6)",
            letterSpacing: "0.01em",
          }}
        >
          Pass the
          <br />
          <span style={{ color: "var(--accent-text, var(--accent-light))" }}>Buck</span>
        </h1>

        <p
          className="mt-5 max-w-[19rem] text-[1.02rem] italic leading-snug text-[var(--parchment-light)]/85"
          style={{ fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)" }}
        >
          A frontier dice game of nerve, luck,
          <br />
          and a touch of well-earned larceny.
        </p>

        <div className="relative mt-9 select-none" aria-hidden>
          <div
            className="absolute inset-0 -m-6 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(255,196,90,0.22), transparent 70%)",
              filter: "blur(2px)",
            }}
          />
          <div className="relative animate-float drop-shadow-[0_18px_22px_rgba(0,0,0,0.55)]">
            <Buck height={108} />
          </div>
        </div>

        <div className="mt-10 flex w-full flex-col gap-3">
          {inProgress && (
            <Link
              href="/game/local"
              className="parchment relative block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[var(--wood-mid)] py-3.5 text-center transition-transform active:scale-[0.985]"
              style={{
                boxShadow:
                  "0 1px 0 rgba(255,240,210,0.6) inset, 0 -2px 0 rgba(101,67,33,0.18) inset, 0 8px 22px rgba(0,0,0,0.45)",
              }}
            >
              <span
                className="relative block text-[1.05rem] font-bold uppercase text-[var(--wood-dark)]"
                style={{
                  fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
                  letterSpacing: "0.22em",
                }}
              >
                Continue the Hand
              </span>
              <span
                className="relative mt-0.5 block text-[0.62rem] uppercase text-[var(--wood-mid)]/75"
                style={{
                  fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
                  letterSpacing: "0.36em",
                }}
              >
                Game in progress
              </span>
            </Link>
          )}

          <Link
            href="/lobby"
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
                fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
                letterSpacing: "0.22em",
                textShadow: "0 1px 0 rgba(255,240,200,0.55)",
              }}
            >
              New Game
            </span>
            <span
              className="relative mt-0.5 block text-[0.62rem] uppercase text-[var(--wood-dark)]/75"
              style={{
                fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
                letterSpacing: "0.36em",
              }}
            >
              Pass-and-play right here
            </span>
          </Link>
        </div>

        <Link
          href="/how"
          className="mt-9 flex w-full items-center gap-3 text-[var(--accent-mid)]/55 transition-colors hover:text-[var(--accent-light)]"
        >
          <span className="h-px flex-1 bg-[var(--accent-mid)]/30" />
          <span
            className="text-[0.6rem] uppercase text-[var(--parchment-light)]/70"
            style={{
              fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
              letterSpacing: "0.36em",
            }}
          >
            House Rules · How to Play
          </span>
          <span className="h-px flex-1 bg-[var(--accent-mid)]/30" />
        </Link>

        <Flourish className="mt-5 text-[var(--accent-mid)]/45" />
      </div>
    </main>
  );
}
