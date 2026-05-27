"use client";

import Link from "next/link";
import { useAuth, usePreferredName } from "@/context/AuthContext";
import { useLocalGame } from "@/context/LocalGameContext";
import Buck from "@/components/Buck";

// ----- Small ornamental flourish used above + below the hero block -----
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
      {/* left curl */}
      <path
        d="M 6 7 Q 30 1 56 7 T 90 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="6" cy="7" r="1.2" fill="currentColor" />
      {/* centre diamond */}
      <g transform="translate(100 7)">
        <path
          d="M 0 -5 L 5 0 L 0 5 L -5 0 Z"
          fill="currentColor"
          opacity="0.85"
        />
        <path
          d="M 0 -2.4 L 2.4 0 L 0 2.4 L -2.4 0 Z"
          fill="#052b1c"
        />
      </g>
      {/* right curl */}
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
  const { user, profile } = useAuth();
  const howdy = usePreferredName();
  const inProgress = status === "active" && players.length > 0;
  const balance = profile?.balance ?? null;

  return (
    <main className="felt-saloon relative min-h-[100dvh] overflow-hidden">
      {/* upper + lower wood rails frame the screen like a saloon table */}
      <div
        aria-hidden
        className="wood-grain pointer-events-none absolute inset-x-0 top-0 h-3 shadow-[0_4px_14px_rgba(0,0,0,0.55)]"
      />
      <div
        aria-hidden
        className="wood-grain pointer-events-none absolute inset-x-0 bottom-0 h-3 shadow-[0_-4px_14px_rgba(0,0,0,0.55)]"
      />

      {/* "How to Play" link — pinned top-left, mirrors the sign-in chip */}
      <div className="absolute left-4 top-5 z-10">
        <Link
          href="/how"
          aria-label="How to play"
          className="inline-flex items-center gap-1 rounded-full border border-[#c99a33]/45 bg-[rgba(5,28,20,0.55)] px-3 py-1.5 text-[0.7rem] font-bold uppercase text-[#f4e4b7]/75 transition-colors hover:border-[#ffd17a]/70 hover:text-[#ffd17a]"
          style={{
            fontFamily: "var(--font-fell), Georgia, serif",
            letterSpacing: "0.22em",
          }}
        >
          <span aria-hidden>?</span>
          <span>How to Play</span>
        </Link>
      </div>

      {/* Sign-in / profile chip — pinned top-right above the hero */}
      <div className="absolute right-4 top-5 z-10">
        {user ? (
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 truncate rounded-full border border-[#c99a33]/55 bg-[rgba(5,28,20,0.75)] py-1.5 pl-3 pr-2 text-[0.7rem] font-bold uppercase text-[#f4e4b7]/85 transition-colors hover:border-[#ffd17a]/80 hover:text-[#ffd17a]"
            style={{
              fontFamily: "var(--font-fell), Georgia, serif",
              letterSpacing: "0.18em",
            }}
          >
            <span aria-hidden>★</span>
            <span className="max-w-[7rem] truncate">
              {howdy ? `Howdy, ${howdy}` : "My Saloon"}
            </span>
            {balance !== null && (
              <span
                className="ml-1 rounded-full border border-[#c99a33]/55 bg-[rgba(201,154,51,0.18)] px-2 py-0.5 text-[0.62rem] font-bold tracking-[0.14em] text-[#ffd17a]"
                title={`${balance} eyeBucks`}
              >
                {balance.toLocaleString()}
              </span>
            )}
          </Link>
        ) : (
          <Link
            href="/auth"
            className="inline-flex items-center gap-1 rounded-full border border-[#c99a33]/45 bg-[rgba(5,28,20,0.55)] px-3 py-1.5 text-[0.7rem] font-bold uppercase text-[#f4e4b7]/75 transition-colors hover:border-[#ffd17a]/70 hover:text-[#ffd17a]"
            style={{
              fontFamily: "var(--font-fell), Georgia, serif",
              letterSpacing: "0.22em",
            }}
          >
            Sign In
          </Link>
        )}
      </div>

      <div className="relative mx-auto flex max-w-sm flex-col items-center px-6 pt-12 pb-10 text-center">
        {/* ── Hero ────────────────────────────────────────────────── */}
        <Flourish className="text-[#c99a33]/65" />

        <span
          className="mt-3 text-[0.62rem] uppercase text-[#f4e4b7]/65"
          style={{
            fontFamily: "var(--font-fell), Georgia, serif",
            letterSpacing: "0.48em",
          }}
        >
          Est. 1873
        </span>

        <h1
          className="mt-3 leading-[0.92]"
          style={{
            fontFamily: "var(--font-rye), Georgia, serif",
            fontSize: "clamp(3rem, 15vw, 5rem)",
            color: "#f4e4b7",
            textShadow:
              "0 2px 0 #5c3b1e, 0 3px 0 rgba(0,0,0,0.45), 0 10px 28px rgba(0,0,0,0.6)",
            letterSpacing: "0.01em",
          }}
        >
          Pass the
          <br />
          <span style={{ color: "#ffd17a" }}>Buck</span>
        </h1>

        <p
          className="mt-5 max-w-[19rem] text-[1.02rem] italic leading-snug text-[#f4e4b7]/85"
          style={{ fontFamily: "var(--font-fell), Georgia, serif" }}
        >
          A frontier dice game of nerve, luck,
          <br />
          and a touch of well-earned larceny.
        </p>

        {/* The buck (parchment scrip) floats above a soft pool of lamplight */}
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

        {/* ── CTAs ────────────────────────────────────────────────── */}
        <div className="mt-10 flex w-full flex-col gap-3">
          {inProgress && (
            <Link
              href="/game/local"
              className="parchment relative block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[#5c3b1e] py-3.5 text-center transition-transform active:scale-[0.985]"
              style={{
                boxShadow:
                  "0 1px 0 rgba(255,240,210,0.6) inset, 0 -2px 0 rgba(101,67,33,0.18) inset, 0 8px 22px rgba(0,0,0,0.45)",
              }}
            >
              <span
                className="relative block text-[1.05rem] font-bold uppercase text-[#2a1a0a]"
                style={{
                  fontFamily: "var(--font-rye), Georgia, serif",
                  letterSpacing: "0.22em",
                }}
              >
                Continue the Hand
              </span>
              <span
                className="relative mt-0.5 block text-[0.62rem] uppercase text-[#5c3b1e]/75"
                style={{
                  fontFamily: "var(--font-fell), Georgia, serif",
                  letterSpacing: "0.36em",
                }}
              >
                Game in progress
              </span>
            </Link>
          )}

          {/* Primary — brass plaque */}
          <Link
            href="/lobby"
            className="relative block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[#7a5a18] py-3.5 text-center transition-transform active:scale-[0.985]"
            style={{
              background:
                "linear-gradient(180deg, #ffd989 0%, #d8a93b 48%, #a07a22 100%)",
              boxShadow:
                "0 1px 0 rgba(255,240,200,0.85) inset, 0 -2px 0 rgba(60,40,8,0.35) inset, 0 10px 26px rgba(0,0,0,0.5)",
            }}
          >
            <span
              className="relative block text-[1.05rem] font-bold uppercase text-[#2a1a0a]"
              style={{
                fontFamily: "var(--font-rye), Georgia, serif",
                letterSpacing: "0.22em",
                textShadow: "0 1px 0 rgba(255,240,200,0.55)",
              }}
            >
              Ante Up
            </span>
            <span
              className="relative mt-0.5 block text-[0.62rem] uppercase text-[#2a1a0a]/75"
              style={{
                fontFamily: "var(--font-fell), Georgia, serif",
                letterSpacing: "0.36em",
              }}
            >
              Pass-and-play right here
            </span>
          </Link>

          {/* Secondary — outlined leather button on the felt */}
          <Link
            href="/multi"
            className="relative block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[#c99a33]/55 py-3.5 text-center transition-colors active:scale-[0.985] hover:border-[#ffd17a]/80"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,30,20,0.7) 100%)",
              boxShadow:
                "0 1px 0 rgba(244,228,183,0.06) inset, 0 8px 22px rgba(0,0,0,0.4)",
            }}
          >
            <span
              className="relative block text-[1.05rem] font-bold uppercase text-[#f4e4b7]"
              style={{
                fontFamily: "var(--font-rye), Georgia, serif",
                letterSpacing: "0.22em",
                textShadow: "0 2px 0 rgba(0,0,0,0.55)",
              }}
            >
              Posse Up
            </span>
            <span
              className="relative mt-0.5 block text-[0.62rem] uppercase text-[#f4e4b7]/65"
              style={{
                fontFamily: "var(--font-fell), Georgia, serif",
                letterSpacing: "0.36em",
              }}
            >
              Each rider on their own phone
            </span>
          </Link>
        </div>

        {/* ── House rules marquee ─────────────────────────────────── */}
        <Link
          href="/how"
          className="mt-10 flex w-full items-center gap-3 text-[#c99a33]/55 transition-colors hover:text-[#ffd17a]"
        >
          <span className="h-px flex-1 bg-[#c99a33]/30" />
          <span
            className="text-[0.6rem] uppercase text-[#f4e4b7]/70"
            style={{
              fontFamily: "var(--font-fell), Georgia, serif",
              letterSpacing: "0.36em",
            }}
          >
            House Rules · How to Play
          </span>
          <span className="h-px flex-1 bg-[#c99a33]/30" />
        </Link>

        <Flourish className="mt-5 text-[#c99a33]/45" />
      </div>
    </main>
  );
}
