"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import StakesRibbon from "@/components/game/StakesRibbon";
import { useRemoteGame } from "@/context/RemoteGameContext";
import { leaveOrKick } from "@/lib/remote-game";

const RYE: React.CSSProperties = {
  fontFamily: "var(--font-rye), Georgia, serif",
};
const FELL: React.CSSProperties = {
  fontFamily: "var(--font-fell), Georgia, serif",
};

export default function LobbyView({ code }: { code: string }) {
  const router = useRouter();
  const { game, players, me, isHost, start } = useRemoteGame();
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!game) return null;

  const canStart = players.length >= 2;
  const needed = Math.max(0, 2 - players.length);

  async function handleStart() {
    if (!canStart || starting) return;
    setStarting(true);
    setErr(null);
    try {
      await start();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't start game");
      setStarting(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied("code");
      setTimeout(() => setCopied(null), 1400);
    } catch {
      // ignore
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/multi/join?code=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied("link");
      setTimeout(() => setCopied(null), 1400);
    } catch {
      // ignore
    }
  }

  async function handleLeave() {
    if (!me) return;
    if (!confirm("Leave this game?")) return;
    try {
      await leaveOrKick({ playerId: me.id });
    } catch {
      // ignore
    }
    router.replace("/multi");
  }

  async function handleKick(playerId: string, name: string) {
    if (!isHost) return;
    if (!confirm(`Kick ${name} from the lobby?`)) return;
    try {
      await leaveOrKick({ playerId });
    } catch {
      // ignore
    }
  }

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

      <div className="relative mx-auto max-w-md px-5 pt-7 pb-8">
        {/* Top bar */}
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center">
          <button
            onClick={handleLeave}
            className="justify-self-start text-[0.78rem] font-bold text-[#f4e4b7]/75 transition-colors hover:text-[#ffd17a]"
            style={FELL}
          >
            ← Leave
          </button>
          <h1
            className="justify-self-center"
            style={{
              ...RYE,
              fontSize: "clamp(1.75rem, 7vw, 2.25rem)",
              color: "#f4e4b7",
              textShadow:
                "0 2px 0 #5c3b1e, 0 3px 0 rgba(0,0,0,0.45), 0 6px 16px rgba(0,0,0,0.55)",
              letterSpacing: "0.02em",
            }}
          >
            Round-Up
          </h1>
          <div />
        </div>

        {/* Stakes summary ribbon */}
        <div className="mb-4">
          <StakesRibbon mode={game.mode} wager={game.wager} />
        </div>

        {/* ── Invite card — parchment poster pinned to the wall ──── */}
        <section
          className="parchment relative mb-4 overflow-hidden rounded-[16px] border-[1.5px] border-[#5c3b1e] px-5 pt-4 pb-5 text-center"
          style={{
            boxShadow:
              "0 1px 0 rgba(255,240,210,0.6) inset, 0 -1px 0 rgba(101,67,33,0.18) inset, 0 12px 28px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="text-[0.6rem] uppercase text-[#5c3b1e]/75"
            style={{ ...FELL, letterSpacing: "0.4em" }}
          >
            ★  Game Code  ★
          </div>
          <button
            onClick={copyCode}
            aria-label="Copy code"
            className="relative my-3 block w-full select-all text-center transition-transform active:scale-[0.98]"
            style={{
              ...RYE,
              color: "#2a1a0a",
              fontSize: "clamp(2.6rem, 12vw, 3.6rem)",
              letterSpacing: "0.34em",
              textShadow: "0 2px 0 rgba(255,240,210,0.55)",
              lineHeight: 1,
            }}
          >
            {code}
          </button>
          <div className="flex gap-2">
            <PaperButton onClick={copyCode}>
              {copied === "code" ? "Copied ✓" : "Copy Code"}
            </PaperButton>
            <PaperButton onClick={copyLink}>
              {copied === "link" ? "Copied ✓" : "Copy Link"}
            </PaperButton>
          </div>
          <p
            className="mt-3 text-[0.78rem] italic text-[#5c3b1e]/70"
            style={FELL}
          >
            Share the code or link. Anyone holdin&apos; it can ride in.
          </p>
        </section>

        {/* ── Players ────────────────────────────────────────────── */}
        <section
          className="relative mb-5 rounded-[16px] border-[1.5px] border-[#c99a33]/35 p-4"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,40,28,0.65) 0%, rgba(5,28,20,0.78) 100%)",
            boxShadow:
              "0 1px 0 rgba(244,228,183,0.06) inset, 0 14px 30px rgba(0,0,0,0.45)",
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2
              className="text-[0.66rem] font-bold uppercase text-[#f4e4b7]/65"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              At the Table
            </h2>
            <span
              className="text-[0.7rem] font-bold text-[#f4e4b7]/55"
              style={{ ...FELL, letterSpacing: "0.18em" }}
            >
              {game.mode === "loser"
                ? `${players.length}/12`
                : `${players.length}/12 · ${game.buy_in} eyeBuck${
                    game.buy_in === 1 ? "" : "s"
                  } each`}
            </span>
          </div>

          {players.length === 0 ? (
            <div
              className="rounded-[10px] border border-dashed border-[#c99a33]/30 py-7 text-center text-[0.88rem] italic text-[#f4e4b7]/55"
              style={FELL}
            >
              Waiting for riders to mosey in…
            </div>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {players.map((p) => {
                  const isMe = me?.id === p.id;
                  return (
                    <motion.li
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 40, scale: 0.9 }}
                      transition={{ duration: 0.18 }}
                      className="parchment relative flex items-center gap-3 overflow-hidden rounded-[10px] border-[1.5px] border-[#5c3b1e] px-3 py-2"
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
                            "0 0 0 1.5px #ffd17a, 0 0 0 2.5px #5c3b1e, 0 2px 4px rgba(0,0,0,0.4)",
                          ...RYE,
                        }}
                      >
                        {p.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="truncate text-[0.95rem] font-bold text-[#2a1a0a]"
                            style={RYE}
                          >
                            {p.display_name}
                          </span>
                          {p.is_host && <Tag color="brass">Host</Tag>}
                          {isMe && <Tag color="ink">You</Tag>}
                        </div>
                        <div
                          className="text-[0.6rem] font-bold uppercase text-[#5c3b1e]/70"
                          style={{ ...FELL, letterSpacing: "0.32em" }}
                        >
                          Seat {p.seat + 1}
                        </div>
                      </div>
                      {isHost && !isMe && (
                        <button
                          onClick={() => handleKick(p.id, p.display_name)}
                          className="px-2 text-xl font-black text-[#5c3b1e]/55 transition-colors hover:text-[#8b2222]"
                          aria-label={`Kick ${p.display_name}`}
                        >
                          ×
                        </button>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </section>

        {err && (
          <div
            className="mb-3 rounded-[12px] border-[1.5px] border-[#8b2222]/55 bg-[#8b2222]/25 px-4 py-3 text-[0.85rem] font-bold text-[#ffd2c2]"
            style={FELL}
          >
            {err}
          </div>
        )}

        {/* ── Start CTA / waiting message ────────────────────────── */}
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={!canStart || starting}
            className="brass-cta block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[#7a5a18] py-4 text-center transition-transform active:scale-[0.985] disabled:cursor-not-allowed"
          >
            <span
              className="relative block text-[1.05rem] font-bold uppercase text-[#2a1a0a]"
              style={{
                ...RYE,
                letterSpacing: "0.22em",
                textShadow: "0 1px 0 rgba(255,240,200,0.55)",
              }}
            >
              {starting
                ? "Dealin'…"
                : canStart
                ? "Deal 'em In"
                : `Need ${needed} More Rider${needed === 1 ? "" : "s"}`}
            </span>
            {canStart && !starting && (
              <span
                className="relative mt-0.5 block text-[0.62rem] uppercase text-[#2a1a0a]/75"
                style={{ ...FELL, letterSpacing: "0.36em" }}
              >
                {game.mode === "loser"
                  ? `${players.length} rider${players.length === 1 ? "" : "s"}${
                      game.wager ? ` · ${game.wager}` : ""
                    }`
                  : `${players.length} riders · ${game.buy_in}-eyeBuck buy-in`}
              </span>
            )}
          </button>
        ) : (
          <div
            className="rounded-[14px] border-[1.5px] border-dashed border-[#c99a33]/40 py-5 text-center text-[#f4e4b7]/70"
            style={{
              ...FELL,
              fontStyle: "italic",
              fontSize: "0.95rem",
            }}
          >
            Waitin&apos; on the host to deal…
          </div>
        )}
      </div>

      <style jsx>{`
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

// ─── Small parchment-style button used for Copy Code / Copy Link ─
function PaperButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-[8px] border-[1.5px] border-[#5c3b1e] py-2 text-[0.72rem] font-bold uppercase text-[#2a1a0a] transition-transform active:scale-[0.97]"
      style={{
        fontFamily: "var(--font-rye), Georgia, serif",
        letterSpacing: "0.22em",
        background:
          "linear-gradient(180deg, #fdf2ce 0%, #f1dfa3 60%, #d6b87a 100%)",
        boxShadow:
          "0 1px 0 rgba(255,240,210,0.55) inset, 0 -1px 0 rgba(101,67,33,0.18) inset, 0 3px 8px rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </button>
  );
}

// ─── Tiny inline badge for Host / You labels on player rows ──────
function Tag({
  color,
  children,
}: {
  color: "brass" | "ink";
  children: React.ReactNode;
}) {
  const palette =
    color === "brass"
      ? {
          bg: "rgba(201,154,51,0.22)",
          border: "#c99a33",
          text: "#5c3b1e",
        }
      : {
          bg: "rgba(42,26,10,0.18)",
          border: "#5c3b1e",
          text: "#5c3b1e",
        };
  return (
    <span
      className="rounded-[4px] border px-1.5 py-0.5 text-[0.55rem] font-bold uppercase"
      style={{
        backgroundColor: palette.bg,
        borderColor: palette.border,
        color: palette.text,
        fontFamily: "var(--font-fell), Georgia, serif",
        letterSpacing: "0.24em",
      }}
    >
      {children}
    </span>
  );
}
