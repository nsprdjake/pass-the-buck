"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import PlayerSpot from "@/components/PlayerSpot";
import PotPile from "@/components/PotPile";
import { useLocalGame, type LocalPlayer } from "@/context/LocalGameContext";
import { rollCountForBucks } from "@/lib/game-logic";
import type { RollOutcome } from "@/lib/types";

const ROLL_SPIN_MS = 900;
const REVEAL_PAUSE_MS = 700;
const TRANSFER_STEP_MS = 520;
const SKIP_DISPLAY_MS = 1100;

const OUTCOME_META: Record<
  RollOutcome,
  { emoji: string; label: string; color: string }
> = {
  left: { emoji: "⬅️", label: "Left", color: "#60A5FA" },
  right: { emoji: "➡️", label: "Right", color: "#A78BFA" },
  center: { emoji: "⬇️", label: "Pot", color: "#FBBF24" },
  keep: { emoji: "✊", label: "Keep", color: "#10B981" },
};

// Computes fixed positions around an ellipse for N seats. Seats don't move
// during the game — only the spotlight moves. Seat 0 is placed at the bottom
// (the "host" seat) and the rest are arranged CLOCKWISE so that seat i+1
// (the "right" outcome destination) is visually to the right of seat i.
function seatPositions(n: number) {
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    // -i / n goes clockwise on screen; +π/2 anchors seat 0 at the bottom.
    const rawAngle = -(i / n) * Math.PI * 2 + Math.PI / 2;
    const rx = 36;
    const ry = 36;
    const x = 50 + rx * Math.cos(rawAngle);
    const y = 50 + ry * Math.sin(rawAngle);
    positions.push({ x, y });
  }
  return positions;
}

let chipIdCounter = 0;
const newChipId = () => `c${(++chipIdCounter).toString(36)}`;

type DisplayedBucks = {
  players: Record<string, string[]>;
  pot: string[];
};

function freshDisplayedBucks(players: LocalPlayer[], pot: number): DisplayedBucks {
  const out: DisplayedBucks = { players: {}, pot: [] };
  for (const p of players) {
    out.players[p.id] = Array.from({ length: p.bucks }, () => newChipId());
  }
  out.pot = Array.from({ length: pot }, () => newChipId());
  return out;
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 1.4;
        const duration = 2.2 + Math.random() * 2;
        const colors = [
          "#10B981",
          "#FBBF24",
          "#60A5FA",
          "#F97066",
          "#A78BFA",
          "#F472B6",
        ];
        return {
          left,
          delay,
          duration,
          color: colors[i % colors.length],
        };
      }),
    []
  );
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden z-50"
      aria-hidden
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 w-2 h-3 rounded-sm animate-confetti"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function RollDie({
  delay,
  outcome,
  highlighted,
}: {
  delay: number;
  outcome: RollOutcome;
  highlighted: boolean;
}) {
  const meta = OUTCOME_META[outcome];
  // Spin only runs once on mount. Highlight is a CSS transition on the
  // outer wrapper so toggling it never re-triggers the die spin.
  return (
    <div
      className="rounded-xl px-2.5 py-1.5 flex flex-col items-center min-w-[52px] border transition-all duration-200"
      style={{
        background: "linear-gradient(180deg, #1f1f3a, #12122a)",
        borderColor: highlighted ? meta.color : "rgba(255,255,255,0.12)",
        boxShadow: highlighted
          ? `0 0 18px ${meta.color}aa, 0 4px 12px rgba(0,0,0,0.5)`
          : `0 4px 12px rgba(0,0,0,0.5)`,
        transform: highlighted ? "scale(1.15)" : "scale(1)",
      }}
    >
      <motion.div
        initial={{ rotate: 0, scale: 0.4, opacity: 0 }}
        animate={{
          rotate: [0, 360, 720, 720],
          scale: [0.4, 1.15, 1, 1],
          opacity: [0, 1, 1, 1],
        }}
        transition={{
          duration: ROLL_SPIN_MS / 1000,
          delay: delay / 1000,
          ease: "easeOut",
          times: [0, 0.5, 0.8, 1],
        }}
        className="flex flex-col items-center"
      >
        <span className="text-2xl leading-none">{meta.emoji}</span>
        <span
          className="text-[9px] uppercase tracking-widest font-black mt-0.5"
          style={{ color: meta.color }}
        >
          {meta.label}
        </span>
      </motion.div>
    </div>
  );
}

type Phase = "idle" | "rolling" | "reveal" | "animate" | "skip";

export default function LocalGamePage() {
  const router = useRouter();
  const {
    status,
    players,
    pot,
    round,
    currentIdx,
    winnerId,
    lastTurn,
    rolling,
    rollDice,
    endTurn,
    resetForRematch,
    newGame,
  } = useLocalGame();

  // Local UI state: per-spot chip IDs. These get mutated during the animation
  // phase as we play back transfers one at a time. When no animation is
  // running, we keep them in sync with the authoritative game state.
  const [displayed, setDisplayed] = useState<DisplayedBucks>(() =>
    freshDisplayedBucks(players, pot)
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [revealedDice, setRevealedDice] = useState(0); // how many dice have been "consumed" so far
  const [pulseSpot, setPulseSpot] = useState<string | null>(null);
  const animatingRef = useRef(false);

  // Redirect to lobby if there's no game in progress.
  useEffect(() => {
    if (status === "lobby" && players.length === 0) {
      router.replace("/lobby");
    }
  }, [status, players.length, router]);

  // Sync displayed bucks with authoritative game state ONLY when we're not
  // mid-animation. This handles new games, rematches, and the initial mount.
  useEffect(() => {
    if (animatingRef.current) return;
    if (lastTurn) return; // wait for animation to start/finish
    setDisplayed((prev) => {
      const totalDisplayed =
        Object.values(prev.players).reduce((s, a) => s + a.length, 0) +
        prev.pot.length;
      const totalGame =
        players.reduce((s, p) => s + p.bucks, 0) + pot;
      const sameIds =
        players.every((p) => (prev.players[p.id]?.length ?? -1) === p.bucks) &&
        prev.pot.length === pot &&
        totalDisplayed === totalGame;
      if (sameIds) return prev;
      return freshDisplayedBucks(players, pot);
    });
  }, [players, pot, lastTurn]);

  // When a roll happens, run the reveal → animate sequence.
  useEffect(() => {
    if (!lastTurn) {
      setPhase("idle");
      setRevealedDice(0);
      return;
    }
    let cancelled = false;
    animatingRef.current = true;

    async function play() {
      setPhase("rolling");
      setRevealedDice(0);
      // Wait for dice to settle. Each die spins in ROLL_SPIN_MS; we run them
      // simultaneously but staggered a tiny bit (handled by RollDie delays).
      await sleep(ROLL_SPIN_MS + 100);
      if (cancelled) return;
      setPhase("reveal");
      await sleep(REVEAL_PAUSE_MS);
      if (cancelled) return;

      setPhase("animate");
      const turn = lastTurn!;
      for (let i = 0; i < turn.transfers.length; i++) {
        if (cancelled) return;
        const t = turn.transfers[i];
        setRevealedDice(i + 1);

        if (t.outcome === "keep") {
          // No movement — pulse the player's stack.
          setPulseSpot(t.fromId);
          await sleep(TRANSFER_STEP_MS);
          if (cancelled) return;
          setPulseSpot(null);
        } else {
          // Pop one chip from the source player and push to destination.
          setDisplayed((prev) => {
            const next: DisplayedBucks = {
              players: { ...prev.players },
              pot: [...prev.pot],
            };
            const fromList = [...(next.players[t.fromId] ?? [])];
            const chipId = fromList.pop();
            next.players[t.fromId] = fromList;
            if (!chipId) return prev;
            if (t.toId === "pot") {
              next.pot = [...next.pot, chipId];
            } else {
              const toList = [...(next.players[t.toId] ?? []), chipId];
              next.players[t.toId] = toList;
            }
            return next;
          });
          await sleep(TRANSFER_STEP_MS);
        }
      }

      if (cancelled) return;
      // Brief breath before advancing
      await sleep(winnerId ? 900 : 500);
      if (cancelled) return;
      animatingRef.current = false;
      endTurn();
    }

    play();
    return () => {
      cancelled = true;
      animatingRef.current = false;
    };
  }, [lastTurn, endTurn, winnerId]);

  const current = players[currentIdx];
  const isSkipping =
    status === "active" &&
    !!current &&
    current.bucks <= 0 &&
    !lastTurn &&
    !rolling &&
    !winnerId;

  // If the seated player has 0 bucks, show a brief skip message and advance.
  useEffect(() => {
    if (!isSkipping) return;
    setPhase("skip");
    const t = setTimeout(() => {
      setPhase("idle");
      endTurn();
    }, SKIP_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [isSkipping, endTurn]);

  const onRoll = useCallback(() => {
    if (rolling) return;
    if (!current || current.bucks <= 0) return;
    rollDice();
  }, [rolling, current, rollDice]);

  if (status === "finished") {
    const winner = players.find((p) => p.bucks > 0) ?? players[0];
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-buck-dark via-buck-darker to-buck-dark relative">
        <Confetti />
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 text-center max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ duration: 0.6, times: [0, 0.7, 1] }}
            className="text-8xl mb-4"
          >
            🏆
          </motion.div>
          <div className="text-xs uppercase tracking-widest text-buck-gold font-bold">
            Winner
          </div>
          <h1 className="mt-1 text-5xl font-black">
            <span style={{ color: winner.color }}>{winner.name}</span>
          </h1>
          <div className="mt-6 inline-flex items-center gap-2 bg-buck-gold/15 border border-buck-gold/40 rounded-full px-5 py-3">
            <span className="text-buck-gold text-2xl">💰</span>
            <span className="text-buck-gold font-black text-2xl">
              {winner.bucks + pot} buck{winner.bucks + pot === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-3 text-white/70">
            Including the pot of {pot} buck{pot === 1 ? "" : "s"}
          </p>
          <button
            onClick={() => {
              resetForRematch();
              router.push("/lobby");
            }}
            className="mt-10 w-full py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-br from-buck-green to-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.35)] active:scale-[0.98] transition-transform"
          >
            REMATCH
          </button>
          <button
            onClick={() => {
              newGame();
              router.push("/");
            }}
            className="mt-3 w-full py-4 rounded-2xl font-black text-white/70 bg-buck-card border border-white/10 active:scale-[0.98] transition-transform"
          >
            NEW GAME
          </button>
        </motion.div>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-buck-dark">
        <div className="text-white/60 font-bold">Loading…</div>
      </main>
    );
  }

  const canRoll = !rolling && !lastTurn && current.bucks > 0 && phase === "idle";
  const rollCount = rollCountForBucks(current.bucks);
  const positions = seatPositions(players.length);
  const showDice = phase === "rolling" || phase === "reveal" || phase === "animate";

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-[#1a0f08] via-[#0f0805] to-[#1a0f08] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 z-20">
        <div className="text-white/70 text-xs font-black uppercase tracking-widest">
          Round <span className="text-buck-gold">{round}</span>
        </div>
        <button
          onClick={() => {
            if (confirm("Quit this game?")) {
              newGame();
              router.push("/");
            }
          }}
          className="text-white/40 text-xs font-bold uppercase tracking-wider hover:text-white/80"
        >
          Quit
        </button>
      </div>

      {/* The table */}
      <div className="flex-1 flex items-center justify-center px-3 py-2 min-h-0">
        <div
          className="table-rail relative rounded-[44%/30%] w-full h-full max-w-md p-3"
          style={{
            maxHeight: "min(720px, calc(100vh - 200px))",
          }}
        >
          <div className="table-felt relative w-full h-full rounded-[42%/28%] overflow-visible">
            <LayoutGroup>
              {/* Player spots positioned around the felt */}
              {players.map((p, i) => {
                const pos = positions[i];
                const active = i === currentIdx && status === "active";
                const bucks = displayed.players[p.id] ?? [];
                return (
                  <div
                    key={p.id}
                    className={pulseSpot === p.id ? "chip-pulse" : ""}
                  >
                    <PlayerSpot
                      player={p}
                      bucks={bucks}
                      active={active}
                      x={pos.x}
                      y={pos.y}
                    />
                  </div>
                );
              })}

              {/* Center: pot + (during a turn) dice tray overlay */}
              <div
                className="absolute"
                style={{
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <PotPile bucks={displayed.pot} />
              </div>

              {/* Dice tray sits above the pot label during a turn */}
              <AnimatePresence>
                {showDice && lastTurn && (
                  <motion.div
                    key="dice"
                    initial={{ opacity: 0, y: -12, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                    className="absolute z-30 flex items-center gap-2"
                    style={{
                      left: "50%",
                      top: "30%",
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {lastTurn.outcomes.map((o, i) => (
                      <RollDie
                        key={i}
                        outcome={o}
                        delay={i * 120}
                        highlighted={phase === "animate" && revealedDice === i + 1}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Skip message */}
              <AnimatePresence>
                {phase === "skip" && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute z-30 text-center"
                    style={{
                      left: "50%",
                      top: "30%",
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div className="text-2xl mb-1">⏭️</div>
                    <div className="text-buck-coral font-black text-xs uppercase tracking-widest">
                      Skipped — no bucks
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </LayoutGroup>
          </div>
        </div>
      </div>

      {/* Roll button area */}
      <div className="px-4 pb-5 pt-2 z-20">
        <div className="max-w-md mx-auto">
          {/* Current player banner */}
          <div className="mb-2 text-center">
            <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">
              Pass the device to
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="font-black text-xl leading-tight"
                style={{ color: current.color }}
              >
                {current.name}
                {current.bucks > 0 && (
                  <span className="ml-2 text-buck-gold/90 text-sm">
                    · {rollCount} roll{rollCount === 1 ? "" : "s"}
                  </span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={canRoll ? { scale: 0.97 } : {}}
            onClick={onRoll}
            disabled={!canRoll}
            className="w-full py-4 rounded-2xl font-black text-base tracking-wide text-white transition-all shadow-[0_8px_32px_rgba(0,0,0,0.6)] disabled:opacity-50 disabled:cursor-not-allowed border border-white/15"
            style={{
              background: canRoll
                ? `linear-gradient(135deg, ${current.color} 0%, ${current.color}cc 60%, #12122A 140%)`
                : `linear-gradient(135deg, #2a2a3a 0%, #1a1a2e 100%)`,
            }}
          >
            <span className="inline-flex items-center justify-center gap-2.5">
              <motion.span
                animate={
                  phase === "rolling" ? { rotate: [0, 360] } : { rotate: 0 }
                }
                transition={{
                  duration: 0.6,
                  repeat: phase === "rolling" ? Infinity : 0,
                  ease: "linear",
                }}
                className="inline-block"
              >
                🎲
              </motion.span>
              <span>
                {phase === "rolling"
                  ? "ROLLING…"
                  : phase === "reveal" || phase === "animate"
                  ? "PASSING THE BUCK…"
                  : phase === "skip"
                  ? "SKIPPING…"
                  : current.bucks <= 0
                  ? "WAITING FOR BUCKS"
                  : `ROLL ${rollCount} DI${rollCount === 1 ? "E" : "CE"}`}
              </span>
              <motion.span
                animate={
                  phase === "rolling" ? { rotate: [0, -360] } : { rotate: 0 }
                }
                transition={{
                  duration: 0.6,
                  repeat: phase === "rolling" ? Infinity : 0,
                  ease: "linear",
                }}
                className="inline-block"
              >
                🎲
              </motion.span>
            </span>
          </motion.button>
        </div>
      </div>
    </main>
  );
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
