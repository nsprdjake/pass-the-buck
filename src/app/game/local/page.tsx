"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type TargetAndTransition } from "framer-motion";
import BuckChip from "@/components/BuckChip";
import { useLocalGame } from "@/context/LocalGameContext";
import { getNextActivePlayer, rollCountForBucks } from "@/lib/game-logic";
import type { RollOutcome } from "@/lib/types";

// === Timing ===
const SLAM_MS = 220;
const ROLLING_MS = 600;
const REVEAL_HOLD_MS = 650; // big outcome card stays this long before chip moves
const CHIP_FLY_MS = 620;
const OUTCOME_GAP_MS = 180;
const TURN_OUTRO_MS = 450;

type OutcomeMeta = {
  emoji: string;
  label: string;
  /** Card background gradient */
  cardFrom: string;
  cardTo: string;
  /** Border/glow */
  accent: string;
};

const OUTCOME_META: Record<RollOutcome, OutcomeMeta> = {
  left: {
    emoji: "⬅️",
    label: "LEFT",
    cardFrom: "#1E40AF",
    cardTo: "#3B82F6",
    accent: "#60A5FA",
  },
  right: {
    emoji: "➡️",
    label: "RIGHT",
    cardFrom: "#1E40AF",
    cardTo: "#3B82F6",
    accent: "#60A5FA",
  },
  center: {
    emoji: "⬇️",
    label: "POT!",
    cardFrom: "#9F1239",
    cardTo: "#F97066",
    accent: "#F97066",
  },
  keep: {
    emoji: "✊",
    label: "KEEP!",
    cardFrom: "#854D0E",
    cardTo: "#FBBF24",
    accent: "#FBBF24",
  },
};

type Phase =
  | "idle"
  | "slam"
  | "rolling"
  | "reveal" // showing card for current outcome
  | "chipfly" // chip is animating for current outcome
  | "outro" // brief pause after all outcomes resolve
  | "pass" // "Pass to next player" screen
  | "skip"
  | "finished";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ============================================================
// Confetti for winner screen
// ============================================================
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

// ============================================================
// Stack of chips, slightly offset like a real casino stack
// ============================================================
function ChipStack({
  count,
  size = 56,
  offsetY = 6,
  hideTop = 0,
}: {
  count: number;
  size?: number;
  offsetY?: number;
  /** Hide the top N chips (so chip-fly overlay reads cleanly) */
  hideTop?: number;
}) {
  if (count <= 0) {
    return (
      <div
        className="rounded-full border-2 border-dashed border-white/15 flex items-center justify-center"
        style={{ width: size + 12, height: size + 12 }}
      >
        <span className="text-white/30 text-xs font-bold uppercase tracking-widest">
          empty
        </span>
      </div>
    );
  }
  const visible = Math.max(count - hideTop, 0);
  const stackHeight = size + Math.max(visible - 1, 0) * offsetY;
  return (
    <div
      className="relative"
      style={{ width: size, height: stackHeight }}
    >
      {Array.from({ length: visible }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            bottom: i * offsetY,
            left: 0,
            width: size,
            height: size,
            filter: `drop-shadow(0 ${2 + i * 0.3}px ${3 + i * 0.4}px rgba(0,0,0,0.55))`,
            zIndex: i,
          }}
        >
          <BuckChip size={size} />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Big outcome card (slot machine reveal)
// ============================================================
function OutcomeCard({
  outcome,
  recipientName,
  recipientColor,
}: {
  outcome: RollOutcome;
  recipientName?: string;
  recipientColor?: string;
}) {
  const meta = OUTCOME_META[outcome];
  return (
    <motion.div
      key={`${outcome}-${recipientName ?? ""}`}
      initial={{ scale: 0.4, opacity: 0, rotateX: -45 }}
      animate={{ scale: 1, opacity: 1, rotateX: 0 }}
      exit={{ scale: 0.85, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="relative rounded-2xl px-6 py-5 text-center"
      style={{
        background: `linear-gradient(135deg, ${meta.cardFrom} 0%, ${meta.cardTo} 100%)`,
        boxShadow: `0 0 40px ${meta.accent}66, 0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)`,
        border: `2px solid ${meta.accent}`,
        minWidth: 240,
      }}
    >
      <div className="text-5xl mb-1 leading-none">{meta.emoji}</div>
      <div
        className="font-black text-3xl tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
      >
        {meta.label}
      </div>
      {recipientName && (
        <div className="mt-1 text-sm font-black uppercase tracking-widest">
          <span className="text-white/70">to </span>
          <span style={{ color: recipientColor ?? "#fff" }}>
            {recipientName}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
// Flying chip — animates from the stack to the destination
// ============================================================
function FlyingChip({
  direction,
}: {
  direction: "left" | "right" | "up" | "keep";
}) {
  // Animation values
  let animate: TargetAndTransition = {};
  if (direction === "left") {
    animate = {
      x: [-0, -90, -260],
      y: [0, -20, -8],
      opacity: [1, 1, 0],
      rotate: [0, -120, -280],
      scale: [1, 0.95, 0.7],
    };
  } else if (direction === "right") {
    animate = {
      x: [0, 90, 260],
      y: [0, -20, -8],
      opacity: [1, 1, 0],
      rotate: [0, 120, 280],
      scale: [1, 0.95, 0.7],
    };
  } else if (direction === "up") {
    // fly up to the pot counter at top
    animate = {
      x: [0, 0, -100],
      y: [0, -120, -340],
      opacity: [1, 1, 0],
      rotate: [0, 360, 720],
      scale: [1, 0.8, 0.35],
    };
  } else {
    // keep — happy bounce in place
    animate = {
      y: [0, -28, 0, -14, 0],
      scale: [1, 1.15, 1, 1.05, 1],
      rotate: [0, -8, 8, -4, 0],
    };
  }

  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
      animate={animate}
      transition={{
        duration: CHIP_FLY_MS / 1000,
        times: direction === "keep" ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.4, 1],
        ease: direction === "keep" ? "easeInOut" : "easeOut",
      }}
      style={{
        width: 64,
        height: 64,
        filter:
          direction === "keep"
            ? "drop-shadow(0 0 24px rgba(251,191,36,0.85)) drop-shadow(0 4px 6px rgba(0,0,0,0.55))"
            : "drop-shadow(0 6px 10px rgba(0,0,0,0.55))",
      }}
    >
      <BuckChip size={64} />
    </motion.div>
  );
}

// ============================================================
// Recipient name flash (appears at the screen edge when chip flies)
// ============================================================
function RecipientFlash({
  side,
  name,
  color,
}: {
  side: "left" | "right";
  name: string;
  color: string;
}) {
  const fromX = side === "left" ? -40 : 40;
  return (
    <motion.div
      initial={{ opacity: 0, x: fromX, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -fromX / 2 }}
      transition={{ duration: 0.25 }}
      className="absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none"
      style={{
        [side]: 8,
      } as React.CSSProperties}
    >
      <div
        className="rounded-xl px-3 py-2 border-2 backdrop-blur-sm"
        style={{
          background: "rgba(0,0,0,0.65)",
          borderColor: color,
          boxShadow: `0 0 24px ${color}aa`,
        }}
      >
        <div className="text-[9px] uppercase tracking-widest text-white/60 font-black">
          {side === "left" ? "to ←" : "→ to"}
        </div>
        <div
          className="font-black text-lg leading-none mt-0.5"
          style={{ color }}
        >
          {name}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Main page
// ============================================================
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

  // === local presentation state ===
  // We mirror the active player's chip count locally so we can decrement it
  // visually as each chip flies off, before the authoritative state catches
  // up at endTurn.
  const [displayedBucks, setDisplayedBucks] = useState<number>(0);
  const [displayedPot, setDisplayedPot] = useState<number>(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [outcomeIdx, setOutcomeIdx] = useState(0); // which outcome is being shown
  const [showPass, setShowPass] = useState(false);
  const animatingRef = useRef(false);

  const current = players[currentIdx];
  const n = players.length;
  const leftNeighbor = current && n > 0 ? players[(currentIdx - 1 + n) % n] : null;
  const rightNeighbor =
    current && n > 0 ? players[(currentIdx + 1) % n] : null;
  const nextActiveIdx = useMemo(() => {
    if (status !== "active" || !current) return currentIdx;
    return getNextActivePlayer(players, currentIdx);
  }, [players, currentIdx, status, current]);
  const nextPlayer = players[nextActiveIdx];

  // Redirect to lobby if there's no game in progress.
  useEffect(() => {
    if (status === "lobby" && players.length === 0) {
      router.replace("/lobby");
    }
  }, [status, players.length, router]);

  // Keep displayed counts in sync when idle (between turns / fresh game).
  useEffect(() => {
    if (animatingRef.current) return;
    if (lastTurn) return;
    setDisplayedBucks(current?.bucks ?? 0);
    setDisplayedPot(pot);
  }, [current?.bucks, pot, lastTurn]);

  // === The roll → reveal → animate → pass sequence ===
  useEffect(() => {
    if (!lastTurn) return;
    let cancelled = false;
    animatingRef.current = true;

    const turn = lastTurn;

    async function play() {
      // brief "rolling" feel
      setPhase("rolling");
      setOutcomeIdx(0);
      await sleep(ROLLING_MS);
      if (cancelled) return;

      // walk through outcomes one at a time
      for (let i = 0; i < turn.outcomes.length; i++) {
        if (cancelled) return;
        setOutcomeIdx(i);
        setPhase("reveal");
        await sleep(REVEAL_HOLD_MS);
        if (cancelled) return;
        setPhase("chipfly");
        // decrement player's stack as the chip leaves (for non-keep)
        const outcome = turn.outcomes[i];
        if (outcome !== "keep") {
          // schedule mid-flight: drop visible chip from stack right as it flies
          await sleep(160);
          if (cancelled) return;
          setDisplayedBucks((b) => Math.max(b - 1, 0));
          if (outcome === "center") {
            // Wait until near end of flight to bump pot count
            await sleep(CHIP_FLY_MS - 280);
            if (cancelled) return;
            setDisplayedPot((p) => p + 1);
            await sleep(80);
          } else {
            await sleep(CHIP_FLY_MS - 160);
          }
        } else {
          await sleep(CHIP_FLY_MS);
        }
        if (cancelled) return;
        await sleep(OUTCOME_GAP_MS);
      }

      if (cancelled) return;
      setPhase("outro");
      await sleep(TURN_OUTRO_MS);
      if (cancelled) return;

      animatingRef.current = false;

      // If this was the winning turn, jump straight to finished via endTurn.
      if (winnerId) {
        endTurn();
        return;
      }

      // Otherwise show pass-the-phone overlay; tapping calls endTurn.
      setPhase("pass");
      setShowPass(true);
    }

    play();
    return () => {
      cancelled = true;
      animatingRef.current = false;
    };
    // We deliberately only depend on lastTurn so the sequence runs once per turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastTurn]);

  // Skip 0-chip players automatically
  const isSkipping =
    status === "active" &&
    !!current &&
    current.bucks <= 0 &&
    !lastTurn &&
    !rolling &&
    !winnerId &&
    !showPass;

  useEffect(() => {
    if (!isSkipping) return;
    setPhase("skip");
    const t = setTimeout(() => {
      setPhase("pass");
      setShowPass(true);
    }, 900);
    return () => clearTimeout(t);
  }, [isSkipping]);

  // === Roll handler ===
  const onRoll = useCallback(async () => {
    if (rolling || phase !== "idle") return;
    if (!current || current.bucks <= 0) return;
    setPhase("slam");
    await sleep(SLAM_MS);
    rollDice();
  }, [rolling, current, rollDice, phase]);

  const onPassContinue = useCallback(() => {
    setShowPass(false);
    setPhase("idle");
    endTurn();
  }, [endTurn]);

  // === FINISHED screen ===
  if (status === "finished") {
    const winner = players.find((p) => p.bucks > 0) ?? players[0];
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #0d5c3f 0%, #073d28 60%, #03200f 100%)",
        }}
      >
        <Confetti />
        {/* raining chips */}
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                y: -80,
                x: `${Math.random() * 100}vw`,
                rotate: 0,
                opacity: 0,
              }}
              animate={{
                y: "110vh",
                rotate: 720,
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 3.5 + Math.random() * 2,
                delay: Math.random() * 2,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute"
              style={{ width: 36, height: 36 }}
            >
              <BuckChip size={36} />
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative z-50 text-center max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: [0, 1.3, 1], rotate: [-20, 8, 0] }}
            transition={{ duration: 0.7, times: [0, 0.7, 1] }}
            className="text-9xl mb-4"
          >
            🏆
          </motion.div>
          <div className="text-xs uppercase tracking-[0.4em] text-buck-gold font-black">
            Winner
          </div>
          <motion.h1
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="mt-2 text-6xl font-black leading-tight"
            style={{ color: winner.color }}
          >
            {winner.name}
          </motion.h1>
          <div className="mt-6 inline-flex items-center gap-2 bg-buck-gold/15 border-2 border-buck-gold/40 rounded-full px-5 py-3">
            <span className="text-buck-gold text-2xl">💰</span>
            <span className="text-buck-gold font-black text-2xl">
              {winner.bucks + pot} chip{winner.bucks + pot === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-3 text-white/70">
            Including the pot of {pot} chip{pot === 1 ? "" : "s"}
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

  const canRoll =
    !rolling && !lastTurn && current.bucks > 0 && phase === "idle";
  const rollCount = rollCountForBucks(current.bucks);

  // Active outcome (during reveal/chipfly)
  const activeOutcome: RollOutcome | null =
    lastTurn && (phase === "reveal" || phase === "chipfly")
      ? lastTurn.outcomes[outcomeIdx] ?? null
      : null;
  const activeTransfer =
    lastTurn && (phase === "reveal" || phase === "chipfly")
      ? lastTurn.transfers[outcomeIdx]
      : null;
  const recipient =
    activeTransfer && activeTransfer.toId !== "pot"
      ? players.find((p) => p.id === activeTransfer.toId) ?? null
      : null;

  return (
    <main
      className="min-h-screen flex flex-col overflow-hidden relative"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, #0d5c3f 0%, #073d28 55%, #03200f 100%)",
      }}
    >
      {/* Subtle felt texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.4) 0.5px, transparent 0.5px)",
          backgroundSize: "4px 4px",
          mixBlendMode: "multiply",
        }}
      />

      {/* Top bar */}
      <div className="relative z-30 flex items-center justify-between px-4 pt-4 pb-2">
        <div className="text-white/80 text-xs font-black uppercase tracking-widest">
          Round <span className="text-buck-gold">{round}</span>
        </div>
        {/* Pot counter */}
        <motion.div
          key={displayedPot}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-1.5 bg-black/50 border border-buck-gold/50 rounded-full px-3 py-1 backdrop-blur-sm"
        >
          <div className="w-5 h-5">
            <BuckChip size={20} />
          </div>
          <span className="text-buck-gold font-black text-xs uppercase tracking-widest">
            Pot
          </span>
          <span className="text-white font-black text-base">{displayedPot}</span>
        </motion.div>
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

      {/* MAIN STAGE — active player is the star */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        {/* Player name */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="text-center w-full"
          >
            <div className="text-[10px] uppercase tracking-[0.4em] text-white/50 font-black">
              Your turn
            </div>
            <h1
              className="mt-1 font-black leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
              style={{
                color: current.color,
                fontSize: "clamp(2.5rem, 10vw, 4.5rem)",
                letterSpacing: "-0.02em",
              }}
            >
              {current.name}
            </h1>
            {current.bucks > 0 && phase === "idle" && (
              <div className="mt-2 text-buck-gold/90 font-black uppercase tracking-widest text-xs">
                {rollCount} di{rollCount === 1 ? "e" : "ce"} to roll
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Player's chip stack */}
        <div className="relative mt-8 h-56 flex items-end justify-center w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${current.id}-stack`}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative flex flex-col items-center"
            >
              {/* The stack itself */}
              <div className="relative">
                <ChipStack
                  count={displayedBucks}
                  size={56}
                  offsetY={7}
                  hideTop={phase === "chipfly" ? 0 : 0}
                />
                {/* Flying chip overlays the stack origin */}
                <AnimatePresence>
                  {phase === "chipfly" && activeOutcome && (
                    <motion.div
                      key={`fly-${outcomeIdx}`}
                      className="absolute pointer-events-none"
                      style={{
                        left: "50%",
                        top: 0,
                        transform: "translate(-50%, -10px)",
                        zIndex: 50,
                      }}
                    >
                      <FlyingChip
                        direction={
                          activeOutcome === "left"
                            ? "left"
                            : activeOutcome === "right"
                            ? "right"
                            : activeOutcome === "center"
                            ? "up"
                            : "keep"
                        }
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Chip count label */}
              <motion.div
                key={displayedBucks}
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="mt-3 text-white/90 font-black text-sm uppercase tracking-widest"
              >
                {displayedBucks} chip{displayedBucks === 1 ? "" : "s"}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Recipient name flash at screen edge */}
          <AnimatePresence>
            {phase === "chipfly" &&
              activeOutcome === "left" &&
              leftNeighbor && (
                <RecipientFlash
                  side="left"
                  name={leftNeighbor.name}
                  color={leftNeighbor.color}
                />
              )}
            {phase === "chipfly" &&
              activeOutcome === "right" &&
              rightNeighbor && (
                <RecipientFlash
                  side="right"
                  name={rightNeighbor.name}
                  color={rightNeighbor.color}
                />
              )}
          </AnimatePresence>
        </div>

        {/* Outcome card centered above the action area */}
        <div className="relative h-32 flex items-center justify-center w-full">
          <AnimatePresence mode="wait">
            {activeOutcome && (
              <OutcomeCard
                key={`oc-${outcomeIdx}-${activeOutcome}`}
                outcome={activeOutcome}
                recipientName={
                  activeOutcome === "left"
                    ? leftNeighbor?.name
                    : activeOutcome === "right"
                    ? rightNeighbor?.name
                    : activeOutcome === "center"
                    ? "the pot"
                    : undefined
                }
                recipientColor={
                  activeOutcome === "left"
                    ? leftNeighbor?.color
                    : activeOutcome === "right"
                    ? rightNeighbor?.color
                    : activeOutcome === "center"
                    ? "#FBBF24"
                    : undefined
                }
              />
            )}
            {phase === "rolling" && !activeOutcome && (
              <motion.div
                key="rolling"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{
                  scale: [0.7, 1, 1],
                  opacity: [0, 1, 1],
                  rotate: [0, 360, 720],
                }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: ROLLING_MS / 1000, ease: "easeOut" }}
                className="text-6xl"
              >
                🎲
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom: ROLL BUTTON */}
      <div className="relative z-20 px-5 pb-7 pt-2">
        <div className="max-w-md mx-auto">
          <motion.button
            whileTap={canRoll ? { scale: 0.9 } : {}}
            animate={
              phase === "slam"
                ? { scale: [1, 0.85, 1.04, 1] }
                : canRoll
                ? { scale: [1, 1.02, 1] }
                : { scale: 1 }
            }
            transition={
              phase === "slam"
                ? { duration: 0.22, times: [0, 0.4, 0.7, 1] }
                : canRoll
                ? {
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
                : {}
            }
            onClick={onRoll}
            disabled={!canRoll}
            className="w-full rounded-3xl font-black text-2xl tracking-wider text-white disabled:cursor-not-allowed border-2 relative overflow-hidden"
            style={{
              padding: "26px 24px",
              background: canRoll
                ? `linear-gradient(135deg, ${current.color} 0%, ${current.color}dd 50%, #000 200%)`
                : `linear-gradient(135deg, #2a2a3a 0%, #1a1a2e 100%)`,
              borderColor: canRoll ? "#ffffff44" : "#ffffff10",
              boxShadow: canRoll
                ? `0 12px 40px ${current.color}80, inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -4px 0 rgba(0,0,0,0.3)`
                : "0 4px 12px rgba(0,0,0,0.4)",
              opacity: canRoll ? 1 : 0.55,
            }}
          >
            {/* invitation glow ring */}
            {canRoll && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-3xl pointer-events-none"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  boxShadow: `0 0 30px ${current.color}, 0 0 60px ${current.color}66`,
                }}
              />
            )}
            <span className="relative inline-flex items-center justify-center gap-3">
              <span className="text-3xl">🎲</span>
              <span>
                {phase === "rolling"
                  ? "ROLLING…"
                  : phase === "reveal" ||
                    phase === "chipfly" ||
                    phase === "outro"
                  ? "…"
                  : phase === "skip"
                  ? "SKIPPING…"
                  : current.bucks <= 0
                  ? "NO CHIPS"
                  : "ROLL!"}
              </span>
              <span className="text-3xl">🎲</span>
            </span>
          </motion.button>
        </div>
      </div>

      {/* SKIP overlay */}
      <AnimatePresence>
        {phase === "skip" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.7, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: -10 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="rounded-2xl px-8 py-6 text-center border-2 border-buck-coral/60"
              style={{
                background: "linear-gradient(135deg, #1a1a2e, #2a1820)",
                boxShadow: "0 20px 50px rgba(249,112,102,0.4)",
              }}
            >
              <div className="text-5xl mb-2">⏭️</div>
              <div
                className="font-black text-2xl"
                style={{ color: current?.color }}
              >
                {current?.name}
              </div>
              <div className="text-buck-coral font-black text-sm uppercase tracking-widest mt-1">
                No chips — skipped!
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PASS-THE-PHONE overlay */}
      <AnimatePresence>
        {showPass && nextPlayer && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onPassContinue}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md cursor-pointer text-left"
          >
            <motion.div
              initial={{ scale: 0.7, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="text-center px-8 max-w-md"
            >
              <motion.div
                animate={{ rotate: [-5, 5, -5] }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="text-7xl mb-4"
              >
                📱
              </motion.div>
              <div className="text-[10px] uppercase tracking-[0.4em] text-white/50 font-black">
                Pass the phone to
              </div>
              <h2
                className="mt-2 font-black leading-none"
                style={{
                  color: nextPlayer.color,
                  fontSize: "clamp(2.75rem, 11vw, 5rem)",
                  letterSpacing: "-0.02em",
                }}
              >
                {nextPlayer.name}
              </h2>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="mt-8 text-white/70 font-black uppercase tracking-widest text-sm"
              >
                Tap anywhere to continue
              </motion.div>
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
}
