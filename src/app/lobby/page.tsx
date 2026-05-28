"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useLocalGame } from "@/context/LocalGameContext";

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 12;

// Shared display-font style for headlines like "Saloon", "Ante the Table"
const RYE: React.CSSProperties = {
  fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
};
const FELL: React.CSSProperties = {
  fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
};

export default function LobbyPage() {
  const router = useRouter();
  const {
    status,
    players,
    buyIn,
    mode,
    wager,
    addPlayer,
    removePlayer,
    setBuyIn,
    setMode,
    setWager,
    startGame,
    newGame,
  } = useLocalGame();

  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // If a previous game is mid-play, hop straight back into it.
  useEffect(() => {
    if (status === "active") {
      router.replace("/game/local");
    }
  }, [status, router]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (players.length >= MAX_PLAYERS) return;
    addPlayer(name);
    setName("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleStart() {
    if (players.length < MIN_PLAYERS) return;
    startGame();
    router.push("/game/local");
  }

  const canStart = players.length >= MIN_PLAYERS;
  const needed = MIN_PLAYERS - players.length;

  return (
    <main className="felt-saloon relative min-h-[100dvh] overflow-hidden">
      {/* wood rails — same framing device as the landing */}
      <div
        aria-hidden
        className="wood-grain pointer-events-none absolute inset-x-0 top-0 h-3 shadow-[0_4px_14px_rgba(0,0,0,0.55)]"
      />
      <div
        aria-hidden
        className="wood-grain pointer-events-none absolute inset-x-0 bottom-0 h-3 shadow-[0_-4px_14px_rgba(0,0,0,0.55)]"
      />

      <div className="relative mx-auto max-w-md px-5 pt-7 pb-8">
        {/* ── Top bar ───────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center">
          <Link
            href="/"
            className="justify-self-start text-[0.78rem] font-bold text-[var(--parchment-light)]/75 hover:text-[var(--accent-light)] transition-colors"
            style={FELL}
          >
            ← Back
          </Link>
          <h1
            className="justify-self-center"
            style={{
              ...RYE,
              fontSize: "clamp(1.75rem, 7vw, 2.25rem)",
              color: "var(--parchment-light)",
              textShadow:
                "0 2px 0 var(--wood-mid), 0 3px 0 rgba(0,0,0,0.45), 0 6px 16px rgba(0,0,0,0.55)",
              letterSpacing: "0.02em",
            }}
          >
            Saloon
          </h1>
          <button
            onClick={newGame}
            className="justify-self-end text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/55 hover:text-[var(--accent-light)] transition-colors"
            style={{ ...FELL, letterSpacing: "0.36em" }}
            title="Clear all players"
          >
            Clear
          </button>
        </div>

        {/* ── Stakes card (mode + optional wager) ─ comes first so the
            player frames the bet before tuning game length. ──────── */}
        <Panel className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <label
              className="text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/65"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              The Stakes
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ModeOption
              active={mode === "winner"}
              onClick={() => setMode("winner")}
              title="Last eyeBuck Wins"
              caption="Sole champion takes the pot"
            />
            <ModeOption
              active={mode === "loser"}
              onClick={() => setMode("loser")}
              title="Stuck with the Tab"
              caption="Last eyeBuck pays the wager"
            />
          </div>

          <div className="mt-4">
            <label
              className="mb-2 block text-[0.6rem] font-bold uppercase text-[var(--parchment-light)]/55"
              htmlFor="wager-input"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              {mode === "loser" ? "The Tab" : "Side Wager"}{" "}
              <span className="text-[var(--parchment-light)]/35">(optional)</span>
            </label>
            <input
              id="wager-input"
              type="text"
              value={wager ?? ""}
              onChange={(e) => setWager(e.target.value)}
              placeholder={
                mode === "loser"
                  ? "Loser buys dinner"
                  : "Winner takes the bottle"
              }
              maxLength={80}
              className="parchment-input w-full rounded-[10px] px-4 py-3 text-[0.95rem] font-semibold text-[var(--wood-dark)] placeholder-[var(--wood-mid)]/55 focus:outline-none"
              style={FELL}
            />
          </div>
        </Panel>

        {/* ── Buy-in card — only relevant in winner mode (it's the pot
            prize). Loser mode hides it entirely; the wager is the
            stakes and the eyeBuck count is hard-set to 3 in context. */}
        {mode === "winner" && (
        <Panel className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <label
              className="text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/65"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              Buy-in
            </label>
            <span
              className="text-[1.15rem]"
              style={{
                ...RYE,
                color: "var(--accent-light)",
                textShadow: "0 1px 0 rgba(0,0,0,0.55)",
              }}
            >
              {buyIn} eyeBuck{buyIn === 1 ? "" : "s"}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={9}
            step={1}
            value={buyIn}
            onChange={(e) => setBuyIn(parseInt(e.target.value, 10))}
            className="brass-slider w-full"
            style={
              {
                ["--fill" as string]: `${((buyIn - 1) / 8) * 100}%`,
              } as React.CSSProperties
            }
          />
          <p
            className="mt-3 text-[0.82rem] italic leading-snug text-[var(--parchment-light)]/60"
            style={FELL}
          >
            Sets the pot prize and game length. Each rider starts with this
            many eyeBucks and rolls one die per eyeBuck held (up to three).
          </p>
        </Panel>
        )}

        {/* ── Players card ──────────────────────────────────────── */}
        <Panel className="mb-5">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                players.length === 0
                  ? "Name of the first rider"
                  : "Add another rider"
              }
              maxLength={20}
              disabled={players.length >= MAX_PLAYERS}
              className="parchment-input flex-1 rounded-[10px] px-4 py-3 text-[0.95rem] font-semibold text-[var(--wood-dark)] placeholder-[var(--wood-mid)]/55 focus:outline-none disabled:opacity-40"
              style={{
                fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
                letterSpacing: "0.01em",
              }}
            />
            <button
              type="submit"
              disabled={!name.trim() || players.length >= MAX_PLAYERS}
              className="brass-mini-button px-5 text-[0.85rem] font-bold uppercase text-[var(--wood-dark)] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ ...RYE, letterSpacing: "0.18em" }}
            >
              Add
            </button>
          </form>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2
                className="text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/65"
                style={{ ...FELL, letterSpacing: "0.36em" }}
              >
                At the Table
              </h2>
              <span
                className="text-[0.7rem] font-bold text-[var(--parchment-light)]/55"
                style={{ ...FELL, letterSpacing: "0.18em" }}
              >
                {players.length}/{MAX_PLAYERS}
              </span>
            </div>

            {players.length === 0 ? (
              <div
                className="rounded-[10px] border border-dashed border-[var(--accent-mid)]/30 py-7 text-center text-[0.88rem] italic text-[var(--parchment-light)]/55"
                style={FELL}
              >
                Need at least {MIN_PLAYERS} riders to deal.
              </div>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {players.map((p, i) => (
                    <motion.li
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 40, scale: 0.9 }}
                      transition={{ duration: 0.18 }}
                      className="parchment relative flex items-center gap-3 overflow-hidden rounded-[10px] border-[1.5px] border-[var(--wood-mid)] px-3 py-2"
                      style={{
                        boxShadow:
                          "0 1px 0 rgba(255,240,210,0.55) inset, 0 -1px 0 rgba(101,67,33,0.18) inset, 0 4px 12px rgba(0,0,0,0.35)",
                      }}
                    >
                      <div
                        className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-black text-white"
                        style={{
                          backgroundColor: p.color,
                          boxShadow:
                            "0 0 0 1.5px var(--accent-light), 0 0 0 2.5px var(--wood-mid), 0 2px 4px rgba(0,0,0,0.4)",
                          ...RYE,
                        }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate text-[0.95rem] font-bold text-[var(--wood-dark)]"
                          style={RYE}
                        >
                          {p.name}
                        </div>
                        <div
                          className="text-[0.6rem] font-bold uppercase text-[var(--wood-mid)]/70"
                          style={{ ...FELL, letterSpacing: "0.32em" }}
                        >
                          Seat {i + 1}
                        </div>
                      </div>
                      <button
                        onClick={() => removePlayer(p.id)}
                        className="px-2 text-xl font-black text-[var(--wood-mid)]/55 hover:text-[#8b2222] transition-colors"
                        aria-label={`Remove ${p.name}`}
                      >
                        ×
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </Panel>

        {/* ── Start button ──────────────────────────────────────── */}
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="brass-cta block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[var(--accent-dark)] py-4 text-center transition-transform active:scale-[0.985] disabled:cursor-not-allowed"
        >
          <span
            className="relative block text-[1.05rem] font-bold uppercase text-[var(--wood-dark)]"
            style={{
              ...RYE,
              letterSpacing: "0.22em",
              textShadow: "0 1px 0 rgba(255,240,200,0.55)",
            }}
          >
            {canStart
              ? "Deal 'em In"
              : `Need ${needed} More Rider${needed === 1 ? "" : "s"}`}
          </span>
          {canStart && (
            <span
              className="relative mt-0.5 block text-[0.62rem] uppercase text-[var(--wood-dark)]/75"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              {mode === "loser"
                ? `${players.length} rider${players.length === 1 ? "" : "s"}${wager ? ` · ${wager}` : ""}`
                : `${players.length} players · ${buyIn}-eyeBuck buy-in`}
            </span>
          )}
        </button>

        <p
          className="mt-5 text-center text-[0.78rem] italic text-[var(--parchment-light)]/55"
          style={FELL}
        >
          Pass-and-play on one device. No accounts, no setup.
        </p>
      </div>

      {/* Local-only styling for the brass slider + parchment input + brass CTAs.
          Kept inline so the lobby is self-contained and easy to tune. */}
      <style jsx>{`
        :global(.brass-slider) {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          background: linear-gradient(
            90deg,
            var(--accent-mid) 0%,
            var(--accent-mid) var(--fill, 50%),
            rgba(244, 228, 183, 0.18) var(--fill, 50%),
            rgba(244, 228, 183, 0.18) 100%
          );
          border-radius: 999px;
          outline: none;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.45) inset;
        }
        :global(.brass-slider::-webkit-slider-thumb) {
          -webkit-appearance: none;
          appearance: none;
          height: 22px;
          width: 22px;
          border-radius: 50%;
          background: radial-gradient(
            circle at 30% 30%,
            #ffe8a8 0%,
            #d8a93b 55%,
            #8a6720 100%
          );
          border: 1.5px solid var(--wood-mid);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.55),
            0 0 0 1px rgba(255, 240, 200, 0.4) inset;
          cursor: grab;
        }
        :global(.brass-slider::-moz-range-thumb) {
          height: 22px;
          width: 22px;
          border-radius: 50%;
          background: radial-gradient(
            circle at 30% 30%,
            #ffe8a8 0%,
            #d8a93b 55%,
            #8a6720 100%
          );
          border: 1.5px solid var(--wood-mid);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.55);
          cursor: grab;
        }
        :global(.parchment-input) {
          background: linear-gradient(
            180deg,
            var(--parchment-light) 0%,
            var(--parchment-mid) 60%,
            var(--parchment-dark) 100%
          );
          border: 1.5px solid var(--wood-mid);
          box-shadow: 0 1px 0 rgba(255, 240, 210, 0.55) inset,
            0 -1px 0 rgba(101, 67, 33, 0.18) inset,
            0 3px 10px rgba(0, 0, 0, 0.35);
          transition: box-shadow 0.15s ease;
        }
        :global(.parchment-input:focus) {
          box-shadow: 0 0 0 2px var(--accent-light),
            0 1px 0 rgba(255, 240, 210, 0.55) inset,
            0 3px 10px rgba(0, 0, 0, 0.4);
        }
        :global(.brass-mini-button) {
          background: linear-gradient(
            180deg,
            #ffd989 0%,
            #d8a93b 48%,
            #a07a22 100%
          );
          border: 1.5px solid var(--accent-dark);
          border-radius: 10px;
          box-shadow: 0 1px 0 rgba(255, 240, 200, 0.75) inset,
            0 -2px 0 rgba(60, 40, 8, 0.35) inset,
            0 4px 12px rgba(0, 0, 0, 0.45);
          transition: transform 0.08s ease;
        }
        :global(.brass-mini-button:active:not(:disabled)) {
          transform: scale(0.97);
        }
        :global(.brass-cta) {
          background: linear-gradient(
            180deg,
            #ffd989 0%,
            #d8a93b 48%,
            #a07a22 100%
          );
          box-shadow: 0 1px 0 rgba(255, 240, 200, 0.85) inset,
            0 -2px 0 rgba(60, 40, 8, 0.35) inset,
            0 10px 26px rgba(0, 0, 0, 0.5);
        }
        :global(.brass-cta:disabled) {
          background: linear-gradient(
            180deg,
            rgba(10, 40, 28, 0.55) 0%,
            rgba(5, 30, 20, 0.7) 100%
          );
          border-color: rgba(201, 154, 51, 0.35);
          box-shadow: 0 1px 0 rgba(244, 228, 183, 0.06) inset,
            0 8px 22px rgba(0, 0, 0, 0.4);
        }
        :global(.brass-cta:disabled > span) {
          color: rgba(244, 228, 183, 0.6) !important;
          text-shadow: 0 2px 0 rgba(0, 0, 0, 0.55) !important;
        }
      `}</style>
    </main>
  );
}

// ─── Stakes-mode pill (Last Buck Wins / Stuck with the Tab) ──────
function ModeOption({
  active,
  onClick,
  title,
  caption,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  caption: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="relative overflow-hidden rounded-[12px] px-3 py-3 text-left transition-transform active:scale-[0.98]"
      style={{
        background: active
          ? "linear-gradient(180deg, #ffd989 0%, #d8a93b 48%, #a07a22 100%)"
          : "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
        border: `1.5px solid ${active ? "var(--accent-dark)" : "rgba(201,154,51,0.4)"}`,
        boxShadow: active
          ? "0 1px 0 rgba(255,240,200,0.75) inset, 0 -2px 0 rgba(60,40,8,0.35) inset, 0 4px 14px rgba(0,0,0,0.5)"
          : "0 1px 0 rgba(244,228,183,0.05) inset, 0 4px 10px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className={`text-[0.78rem] font-bold uppercase leading-tight ${
          active ? "text-[var(--wood-dark)]" : "text-[var(--parchment-light)]"
        }`}
        style={{
          fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
          letterSpacing: "0.12em",
          textShadow: active
            ? "0 1px 0 rgba(255,240,200,0.55)"
            : "0 2px 0 rgba(0,0,0,0.55)",
        }}
      >
        {title}
      </div>
      <div
        className={`mt-1 text-[0.62rem] italic leading-snug ${
          active ? "text-[var(--wood-dark)]/75" : "text-[var(--parchment-light)]/55"
        }`}
        style={{ fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)" }}
      >
        {caption}
      </div>
    </button>
  );
}

// ─── A felt-on-felt card with a brass hairline border ────────────
function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative rounded-[16px] border-[1.5px] border-[var(--accent-mid)]/35 p-4 ${className}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(10,40,28,0.65) 0%, rgba(5,28,20,0.78) 100%)",
        boxShadow:
          "0 1px 0 rgba(244,228,183,0.06) inset, 0 14px 30px rgba(0,0,0,0.45)",
      }}
    >
      {children}
    </section>
  );
}
