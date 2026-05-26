"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import BuckRow from "@/components/BuckRow";
import PlayerCard from "@/components/PlayerCard";
import GameHeader from "@/components/GameHeader";
import { useLocalGame } from "@/context/LocalGameContext";
import { rollCountForBucks } from "@/lib/game-logic";
import type { RollOutcome } from "@/lib/types";

const SKIP_DISPLAY_MS = 1200;

const OUTCOME_META: Record<
  RollOutcome,
  { emoji: string; label: string; color: string }
> = {
  left: { emoji: "⬅️", label: "Left", color: "#60A5FA" },
  right: { emoji: "➡️", label: "Right", color: "#A78BFA" },
  center: { emoji: "⬇️", label: "Pot", color: "#FBBF24" },
  keep: { emoji: "✊", label: "Keep", color: "#10B981" },
};

const ROLL_SPIN_MS = 700;
const REVEAL_STAGGER_MS = 220;

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

function RollDie({ delay, outcome }: { delay: number; outcome: RollOutcome }) {
  const meta = OUTCOME_META[outcome];
  return (
    <motion.div
      initial={{ rotate: 0, scale: 0.6, opacity: 0 }}
      animate={{
        rotate: [0, 360, 720, 720],
        scale: [0.6, 1.15, 1, 1],
        opacity: [0, 1, 1, 1],
      }}
      transition={{
        duration: ROLL_SPIN_MS / 1000,
        delay: delay / 1000,
        ease: "easeOut",
        times: [0, 0.5, 0.8, 1],
      }}
      className="bg-buck-darker border border-white/10 rounded-2xl px-3 py-2 flex flex-col items-center min-w-[64px]"
      style={{ boxShadow: `0 6px 24px ${meta.color}33` }}
    >
      <span className="text-3xl leading-none">{meta.emoji}</span>
      <span
        className="text-[10px] uppercase tracking-widest font-black mt-1"
        style={{ color: meta.color }}
      >
        {meta.label}
      </span>
    </motion.div>
  );
}

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

  const [showRolls, setShowRolls] = useState(false);

  // Redirect to lobby if there's no game in progress.
  useEffect(() => {
    if (status === "lobby" && players.length === 0) {
      router.replace("/lobby");
    }
  }, [status, players.length, router]);

  // After a roll lands, auto-advance the turn after a short pause.
  useEffect(() => {
    if (!lastTurn) {
      setShowRolls(false);
      return;
    }
    setShowRolls(true);
    const totalRevealMs =
      ROLL_SPIN_MS + REVEAL_STAGGER_MS * Math.max(lastTurn.outcomes.length - 1, 0);
    const pauseAfterReveal = winnerId ? 1200 : 1400;
    const t = setTimeout(() => {
      endTurn();
    }, totalRevealMs + pauseAfterReveal);
    return () => clearTimeout(t);
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
  // They stay in the game — a neighbor can pass them a buck before their next turn.
  useEffect(() => {
    if (!isSkipping) return;
    const t = setTimeout(() => {
      endTurn();
    }, SKIP_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [isSkipping, endTurn]);

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

  const canRoll = !rolling && !lastTurn && current.bucks > 0;
  const rollCount = rollCountForBucks(current.bucks);

  return (
    <main className="min-h-screen px-4 pt-5 pb-32 bg-gradient-to-b from-buck-dark via-buck-darker to-buck-dark">
      <div className="max-w-md mx-auto">
        <GameHeader round={round} pot={pot} />

        <section className="mt-5 bg-buck-card border border-white/10 rounded-3xl p-5 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${current.color}44 0%, transparent 70%)`,
            }}
          />
          <div className="relative">
            <div className="text-xs uppercase tracking-widest text-white/60 font-bold">
              Pass the device to
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22 }}
                className="mt-2 flex items-center justify-center gap-3"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-2xl"
                  style={{ backgroundColor: current.color }}
                >
                  {current.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-2xl font-black">{current.name}</div>
                  <div className="text-white/60 text-sm">
                    {current.bucks} buck{current.bucks === 1 ? "" : "s"}
                    {current.bucks > 0 && (
                      <>
                        {" — "}
                        <span className="text-buck-gold font-bold">
                          {rollCount} roll{rollCount === 1 ? "" : "s"}!
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 flex justify-center">
              <BuckRow
                count={current.bucks}
                max={9}
                color={current.color}
                size={20}
              />
            </div>

            <div className="mt-5 min-h-[76px] flex items-center justify-center gap-3 flex-wrap">
              {isSkipping && (
                <motion.div
                  key="skip"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <div className="text-3xl mb-1">⏭️</div>
                  <div className="text-buck-coral font-black text-sm uppercase tracking-widest">
                    Skipped — no bucks
                  </div>
                  <div className="text-white/40 text-xs mt-1">
                    Hang tight — a neighbor can pass you one
                  </div>
                </motion.div>
              )}
              {!isSkipping && !showRolls && canRoll && (
                <div className="text-white/40 text-sm">
                  Tap below to roll {rollCount} {rollCount === 1 ? "die" : "dice"}
                </div>
              )}
              {!isSkipping && showRolls && lastTurn && (
                <>
                  {lastTurn.outcomes.map((o, i) => (
                    <RollDie
                      key={`${lastTurn.playerId}-${i}`}
                      outcome={o}
                      delay={i * REVEAL_STAGGER_MS}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </section>

        <section className="mt-5">
          <h2 className="text-xs uppercase tracking-widest text-white/60 font-bold mb-3">
            Players
          </h2>
          <motion.div layout className="grid grid-cols-2 gap-3">
            {players.map((p, i) => (
              <motion.div
                key={p.id}
                layout
                animate={{
                  scale: i === currentIdx ? 1.02 : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                <PlayerCard
                  player={p}
                  active={i === currentIdx && status === "active"}
                />
              </motion.div>
            ))}
          </motion.div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-4 bg-gradient-to-t from-buck-dark via-buck-dark/95 to-transparent">
        <div className="max-w-md mx-auto">
          <motion.button
            whileTap={canRoll ? { scale: 0.97 } : {}}
            onClick={() => rollDice()}
            disabled={!canRoll}
            className="w-full py-5 rounded-2xl font-black text-lg tracking-wide text-white transition-all shadow-[0_8px_32px_rgba(0,0,0,0.45)] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(135deg, ${current.color} 0%, ${current.color}cc 60%, #12122A 140%)`,
            }}
          >
            <span className="inline-flex items-center justify-center gap-3">
              <motion.span
                animate={rolling ? { rotate: [0, 360] } : { rotate: 0 }}
                transition={{
                  duration: 0.6,
                  repeat: rolling ? Infinity : 0,
                  ease: "linear",
                }}
                className="inline-block"
              >
                🎲
              </motion.span>
              <span>
                {rolling
                  ? "ROLLING…"
                  : current.bucks <= 0
                  ? "SKIPPING…"
                  : `PASS THE BUCK · ${rollCount} ROLL${rollCount === 1 ? "" : "S"}`}
              </span>
              <motion.span
                animate={rolling ? { rotate: [0, -360] } : { rotate: 0 }}
                transition={{
                  duration: 0.6,
                  repeat: rolling ? Infinity : 0,
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
