"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useAuth, usePreferredName } from "@/context/AuthContext";
import { useLocalGame } from "@/context/LocalGameContext";
import Buck from "@/components/Buck";
import {
  fetchLeaderboard,
  type LeaderboardRow,
} from "@/lib/leaderboards";
import {
  challengeQueryString,
  todaysChallenge,
} from "@/lib/dailyChallenge";

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
          fill="var(--felt-deep)"
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
  const { user, profile, lastDailyBonus } = useAuth();
  const howdy = usePreferredName();
  const inProgress = status === "active" && players.length > 0;
  const balance = profile?.balance ?? null;

  // Auto-dismiss the daily-bonus parchment after a few seconds.
  const [showBonus, setShowBonus] = useState<typeof lastDailyBonus | null>(null);
  useEffect(() => {
    if (!lastDailyBonus) return;
    setShowBonus(lastDailyBonus);
    const t = setTimeout(() => setShowBonus(null), 5500);
    return () => clearTimeout(t);
  }, [lastDailyBonus]);

  // Today's challenge — recomputed once per render, deterministic by date.
  const daily = todaysChallenge();
  const dailyHref = `/multi/create${challengeQueryString(daily)}`;

  // Top-3 "Richest" strip on the landing. Cheap fetch; refresh on auth state.
  const [topRich, setTopRich] = useState<LeaderboardRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchLeaderboard("richest", 3);
        if (!cancelled) setTopRich(rows);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.balance]);

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

      {/* Top header bar — How to Play (left) + profile chip (right).
          Real flex row, not stacked absolutes, so the two pills share
          the row and never overlap on narrow viewports. */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-4 pt-5">
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

        {user ? (
          <Link
            href="/profile"
            className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--accent-mid)]/55 bg-[rgba(5,28,20,0.75)] py-1.5 pl-3 pr-2 text-[0.7rem] font-bold uppercase text-[var(--parchment-light)]/85 transition-colors hover:border-[var(--accent-light)]/80 hover:text-[var(--accent-light)]"
            style={{
              fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
              letterSpacing: "0.18em",
            }}
          >
            <span aria-hidden>★</span>
            <span className="min-w-0 max-w-[5.5rem] truncate">
              {howdy ? `Howdy, ${howdy}` : "My Saloon"}
            </span>
            {balance !== null && (
              <span
                className="ml-0.5 shrink-0 rounded-full border border-[var(--accent-mid)]/55 bg-[rgba(201,154,51,0.18)] px-2 py-0.5 text-[0.62rem] font-bold tracking-[0.14em] text-[var(--accent-text)]"
                title={`${balance} eyeBucks`}
              >
                {balance.toLocaleString()}
              </span>
            )}
          </Link>
        ) : (
          <Link
            href="/auth"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--accent-mid)]/45 bg-[rgba(5,28,20,0.55)] px-3 py-1.5 text-[0.7rem] font-bold uppercase text-[var(--parchment-light)]/75 transition-colors hover:border-[var(--accent-light)]/70 hover:text-[var(--accent-light)]"
            style={{
              fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
              letterSpacing: "0.22em",
            }}
          >
            Sign In
          </Link>
        )}
      </div>

      {/* Daily-bonus parchment slip — auto-dismisses after a few seconds */}
      <AnimatePresence>
        {showBonus && (
          <motion.div
            key={showBonus.awardedAt}
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="parchment pointer-events-none absolute left-1/2 top-20 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border-[1.5px] border-[var(--wood-mid)] px-4 py-1.5 text-[0.75rem] font-bold text-[var(--wood-dark)] shadow-[0_8px_22px_rgba(0,0,0,0.45)]"
            style={{
              fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
              letterSpacing: "0.16em",
            }}
          >
            <span aria-hidden>★</span>{" "}
            +{showBonus.amount} daily eyeBucks{" "}
            <span aria-hidden>★</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mx-auto flex max-w-sm flex-col items-center px-6 pt-6 pb-10 text-center">
        {/* ── Hero ────────────────────────────────────────────────── */}
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

          {/* Primary — brass plaque */}
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
              Ante Up
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

          {/* Secondary — outlined leather button on the felt */}
          <Link
            href="/multi"
            className="relative block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[var(--accent-mid)]/55 py-3.5 text-center transition-colors active:scale-[0.985] hover:border-[var(--accent-light)]/80"
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
                fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
                letterSpacing: "0.22em",
                textShadow: "0 2px 0 rgba(0,0,0,0.55)",
              }}
            >
              Posse Up
            </span>
            <span
              className="relative mt-0.5 block text-[0.62rem] uppercase text-[var(--parchment-light)]/65"
              style={{
                fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
                letterSpacing: "0.36em",
              }}
            >
              Each rider on their own phone
            </span>
          </Link>
        </div>

        {/* ── Daily challenge pill — pre-filled themed game ──────── */}
        <Link
          href={dailyHref}
          className="mt-5 flex w-full items-center gap-3 rounded-[12px] border-[1.5px] border-[var(--accent-mid)]/40 px-3 py-2.5 transition-colors hover:border-[var(--accent-light)]/70"
          style={{
            background:
              "linear-gradient(180deg, rgba(201,154,51,0.14) 0%, rgba(10,40,28,0.55) 100%)",
            boxShadow: "0 1px 0 rgba(244,228,183,0.06) inset",
          }}
        >
          <span className="text-[1.6rem] leading-none" aria-hidden>
            {daily.emoji}
          </span>
          <div className="min-w-0 flex-1 text-left">
            <div
              className="text-[0.55rem] font-bold uppercase text-[var(--accent-text)]/85"
              style={{
                fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
                letterSpacing: "0.36em",
              }}
            >
              Today&apos;s Challenge
            </div>
            <div
              className="mt-0.5 truncate text-[0.95rem] font-bold text-[var(--parchment-light)]"
              style={{ fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)" }}
            >
              {daily.title}
            </div>
            <div
              className="truncate text-[0.7rem] italic text-[var(--parchment-light)]/65"
              style={{ fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)" }}
            >
              {daily.blurb}
            </div>
          </div>
          <span
            className="text-[0.7rem] uppercase text-[var(--accent-text)]/70"
            style={{
              fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
              letterSpacing: "0.18em",
            }}
          >
            Deal →
          </span>
        </Link>

        {/* ── Top-3 Richest strip — peek into the leaderboard ─────── */}
        {topRich && topRich.length > 0 && (
          <Link
            href="/leaderboard"
            className="mt-9 w-full rounded-[12px] border-[1.5px] border-[var(--accent-mid)]/35 px-3 py-2.5 transition-colors hover:border-[var(--accent-light)]/65"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
              boxShadow: "0 1px 0 rgba(244,228,183,0.06) inset",
            }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className="text-[0.55rem] font-bold uppercase text-[var(--accent-text)]/85"
                style={{
                  fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
                  letterSpacing: "0.36em",
                }}
              >
                ★ Top of the Posse
              </span>
              <span className="h-px flex-1 bg-[var(--accent-mid)]/25" />
              <span
                className="text-[0.55rem] font-bold uppercase text-[var(--parchment-light)]/45 transition-colors group-hover:text-[var(--accent-light)]"
                style={{
                  fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
                  letterSpacing: "0.22em",
                }}
              >
                See all →
              </span>
            </div>
            <ol className="space-y-1">
              {topRich.map((r, i) => (
                <li
                  key={r.user_id}
                  className="flex items-center gap-2 text-left"
                >
                  <span
                    className="w-4 text-center text-[0.7rem]"
                    style={{
                      fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
                      color:
                        i === 0
                          ? "var(--accent-light)"
                          : i === 1
                          ? "#dfd5c0"
                          : "#d6a777",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="h-4 w-4 flex-shrink-0 rounded-full"
                    style={{
                      backgroundColor: r.color ?? "var(--wood-mid)",
                      boxShadow:
                        "0 0 0 1px var(--accent-light), 0 0 0 1.8px var(--wood-mid)",
                    }}
                  />
                  <span
                    className="min-w-0 flex-1 truncate text-[0.78rem] font-bold text-[var(--parchment-light)]"
                    style={{ fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)" }}
                  >
                    {r.display_name || "Stranger"}
                  </span>
                  <span
                    className="text-[0.75rem] text-[var(--accent-light)]"
                    style={{
                      fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
                    }}
                  >
                    {r.value.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          </Link>
        )}

        {/* ── House rules marquee ─────────────────────────────────── */}
        <Link
          href="/how"
          className="mt-5 flex w-full items-center gap-3 text-[var(--accent-mid)]/55 transition-colors hover:text-[var(--accent-light)]"
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
