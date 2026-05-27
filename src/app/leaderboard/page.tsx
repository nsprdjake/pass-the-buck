"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BOARD_META,
  fetchLeaderboard,
  type BoardKey,
  type LeaderboardRow,
} from "@/lib/leaderboards";

const RYE: React.CSSProperties = {
  fontFamily: "var(--font-rye), Georgia, serif",
};
const FELL: React.CSSProperties = {
  fontFamily: "var(--font-fell), Georgia, serif",
};

const TABS: BoardKey[] = [
  "richest",
  "biggest_pot",
  "longest_streak",
  "most_games",
];

export default function LeaderboardPage() {
  const [active, setActive] = useState<BoardKey>("richest");
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    (async () => {
      try {
        const data = await fetchLeaderboard(active, 25);
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Couldn't load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  const meta = BOARD_META[active];

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

      <div className="relative mx-auto max-w-md px-5 pt-7 pb-10">
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center">
          <Link
            href="/"
            className="justify-self-start text-[0.78rem] font-bold text-[var(--parchment-light)]/75 transition-colors hover:text-[var(--accent-light)]"
            style={FELL}
          >
            ← Back
          </Link>
          <h1
            className="justify-self-center"
            style={{
              ...RYE,
              fontSize: "clamp(1.6rem, 6.5vw, 2.1rem)",
              color: "var(--parchment-light)",
              textShadow:
                "0 2px 0 var(--wood-mid), 0 3px 0 rgba(0,0,0,0.45), 0 6px 16px rgba(0,0,0,0.55)",
              letterSpacing: "0.02em",
            }}
          >
            The Posse
          </h1>
          <div />
        </div>

        {/* Tab strip */}
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className="whitespace-nowrap rounded-full border-[1.5px] px-3 py-1.5 text-[0.62rem] font-bold uppercase transition-colors"
              style={{
                ...FELL,
                letterSpacing: "0.2em",
                background:
                  active === key
                    ? "linear-gradient(180deg, #ffd989 0%, #d8a93b 48%, #a07a22 100%)"
                    : "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
                borderColor:
                  active === key ? "var(--accent-dark)" : "rgba(201,154,51,0.4)",
                color: active === key ? "var(--wood-dark)" : "rgba(244,228,183,0.75)",
                textShadow:
                  active === key
                    ? "0 1px 0 rgba(255,240,200,0.55)"
                    : undefined,
              }}
            >
              {shortTabLabel(key)}
            </button>
          ))}
        </div>

        {/* Board header */}
        <div className="mb-3 text-center">
          <h2
            className="text-[1.05rem]"
            style={{
              ...RYE,
              color: "var(--accent-light)",
              textShadow: "0 2px 0 rgba(0,0,0,0.55)",
            }}
          >
            {meta.label}
          </h2>
          <p
            className="text-[0.72rem] italic text-[var(--parchment-light)]/55"
            style={FELL}
          >
            {meta.subtitle}
          </p>
        </div>

        {/* List */}
        <section
          className="rounded-[16px] border-[1.5px] border-[var(--accent-mid)]/35 p-3"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,40,28,0.65) 0%, rgba(5,28,20,0.78) 100%)",
            boxShadow:
              "0 1px 0 rgba(244,228,183,0.06) inset, 0 14px 30px rgba(0,0,0,0.45)",
          }}
        >
          {error ? (
            <div
              className="rounded-[10px] border-[1.5px] border-[#8b2222]/55 bg-[#8b2222]/25 px-3 py-3 text-center text-[0.85rem] font-bold text-[#ffd2c2]"
              style={FELL}
            >
              {error}
            </div>
          ) : rows === null ? (
            <div
              className="py-6 text-center text-[0.85rem] italic text-[var(--parchment-light)]/50"
              style={FELL}
            >
              Tallying the votes…
            </div>
          ) : rows.length === 0 ? (
            <div
              className="rounded-[10px] border border-dashed border-[var(--accent-mid)]/30 py-7 text-center text-[0.85rem] italic text-[var(--parchment-light)]/55"
              style={FELL}
            >
              Nobody&apos;s laid claim yet. Get in there.
            </div>
          ) : (
            <ol className="space-y-1.5">
              {rows.map((r, i) => (
                <li
                  key={r.user_id}
                  className="flex items-center gap-3 rounded-[10px] border-[1.5px] border-[var(--accent-mid)]/25 px-3 py-2"
                  style={{
                    background:
                      i < 3
                        ? "linear-gradient(180deg, rgba(201,154,51,0.18) 0%, rgba(60,40,8,0.18) 100%)"
                        : "transparent",
                  }}
                >
                  <span
                    className="w-7 flex-shrink-0 text-center text-[0.85rem]"
                    style={{
                      ...RYE,
                      color:
                        i === 0
                          ? "var(--accent-light)"
                          : i === 1
                          ? "#dfd5c0"
                          : i === 2
                          ? "#d6a777"
                          : "rgba(244,228,183,0.6)",
                      textShadow: "0 1px 0 rgba(0,0,0,0.55)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <div
                    className="h-7 w-7 flex-shrink-0 rounded-full"
                    style={{
                      backgroundColor: r.color ?? "var(--wood-mid)",
                      boxShadow:
                        "0 0 0 1.5px var(--accent-light), 0 0 0 2.5px var(--wood-mid), 0 2px 4px rgba(0,0,0,0.4)",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-[0.92rem] font-bold text-[var(--parchment-light)]"
                      style={RYE}
                    >
                      {r.display_name || "Stranger"}
                    </div>
                  </div>
                  <div
                    className="flex-shrink-0 text-right"
                    style={{
                      ...RYE,
                      color: "var(--accent-light)",
                      textShadow: "0 1px 0 rgba(0,0,0,0.55)",
                    }}
                  >
                    <div className="text-[0.95rem] leading-none">
                      {r.value.toLocaleString()}
                    </div>
                    <div
                      className="mt-0.5 text-[0.55rem] uppercase text-[var(--parchment-light)]/55"
                      style={{ ...FELL, letterSpacing: "0.22em" }}
                    >
                      {meta.valueLabel}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <p
          className="mt-5 text-center text-[0.72rem] italic text-[var(--parchment-light)]/45"
          style={FELL}
        >
          Boards update the moment a hand finishes. Sign in to climb &apos;em.
        </p>
      </div>
    </main>
  );
}

function shortTabLabel(key: BoardKey): string {
  switch (key) {
    case "richest":
      return "Richest";
    case "biggest_pot":
      return "Biggest Pot";
    case "longest_streak":
      return "Streak";
    case "most_games":
      return "Hands";
  }
}
