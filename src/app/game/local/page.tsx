"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Buck from "@/components/Buck";
import BuckPile from "@/components/BuckPile";
import Die from "@/components/Die";
import DiceTray from "@/components/DiceTray";
import {
  BUCK_FLY_MS,
  Confetti,
  FELT_GRADIENT,
  FeltBackground,
  FlyingBuck,
  OUTCOME_GAP_MS,
  OutcomeCard,
  RecipientFlash,
  REVEAL_HOLD_MS,
  ROLLING_MS,
  SLAM_MS,
  TURN_OUTRO_MS,
} from "@/components/game/shared";
import {
  MoneyBag,
  Phone,
  Skip,
  Trophy,
} from "@/components/icons";
import { useLocalGame } from "@/context/LocalGameContext";
import { getNextActivePlayer, rollCountForBucks } from "@/lib/game-logic";
import { playSfx, unlockAudio } from "@/lib/sfx";
import type { RollOutcome } from "@/lib/types";

type Phase =
  | "idle"
  | "slam"
  | "rolling"
  | "reveal"
  | "buckfly"
  | "outro"
  | "pass"
  | "skip"
  | "finished";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
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

  const [displayedBucks, setDisplayedBucks] = useState<number>(0);
  const [displayedPot, setDisplayedPot] = useState<number>(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [outcomeIdx, setOutcomeIdx] = useState(0);
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

  useEffect(() => {
    if (status === "lobby" && players.length === 0) {
      router.replace("/lobby");
    }
  }, [status, players.length, router]);

  useEffect(() => {
    if (animatingRef.current) return;
    if (lastTurn) return;
    setDisplayedBucks(current?.bucks ?? 0);
    setDisplayedPot(pot);
  }, [current?.bucks, pot, lastTurn]);

  // === Roll → reveal → animate → pass sequence ===
  useEffect(() => {
    if (!lastTurn) return;
    let cancelled = false;
    animatingRef.current = true;

    const turn = lastTurn;

    async function play() {
      setPhase("rolling");
      setOutcomeIdx(0);
      playSfx("roll");
      await sleep(ROLLING_MS - 100);
      if (cancelled) return;
      playSfx("dieLand");
      await sleep(100);
      if (cancelled) return;

      for (let i = 0; i < turn.outcomes.length; i++) {
        if (cancelled) return;
        setOutcomeIdx(i);
        setPhase("reveal");
        playSfx("reveal");
        await sleep(REVEAL_HOLD_MS);
        if (cancelled) return;
        setPhase("buckfly");
        const outcome = turn.outcomes[i];
        if (outcome === "left") playSfx("slideLeft");
        else if (outcome === "right") playSfx("slideRight");
        else if (outcome === "center") playSfx("pot");
        else if (outcome === "keep") playSfx("keep");
        if (outcome !== "keep") {
          await sleep(140);
          if (cancelled) return;
          setDisplayedBucks((b) => Math.max(b - 1, 0));
          if (outcome === "center") {
            await sleep(BUCK_FLY_MS - 240);
            if (cancelled) return;
            setDisplayedPot((p) => p + 1);
            await sleep(80);
          } else {
            await sleep(BUCK_FLY_MS - 140);
          }
        } else {
          await sleep(BUCK_FLY_MS);
        }
        if (cancelled) return;
        await sleep(OUTCOME_GAP_MS);
      }

      if (cancelled) return;
      setPhase("outro");
      await sleep(TURN_OUTRO_MS);
      if (cancelled) return;
      animatingRef.current = false;

      if (winnerId) {
        endTurn();
        return;
      }

      setPhase("pass");
      playSfx("pass");
      setShowPass(true);
    }

    play();
    return () => {
      cancelled = true;
      animatingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastTurn]);

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
      playSfx("pass");
      setShowPass(true);
    }, 900);
    return () => clearTimeout(t);
  }, [isSkipping]);

  const onRoll = useCallback(async () => {
    if (rolling || phase !== "idle") return;
    if (!current || current.bucks <= 0) return;
    unlockAudio();
    playSfx("slam");
    setPhase("slam");
    await sleep(SLAM_MS);
    rollDice();
  }, [rolling, current, rollDice, phase]);

  const onPassContinue = useCallback(() => {
    unlockAudio();
    playSfx("joinClick");
    setShowPass(false);
    setPhase("idle");
    endTurn();
  }, [endTurn]);

  // play winner sound when reaching finished
  useEffect(() => {
    if (status === "finished") {
      playSfx("winner");
    }
  }, [status]);

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
            >
              <Buck height={28} />
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
            className="mb-4 flex justify-center"
          >
            <Trophy size={128} />
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
            <MoneyBag size={28} />
            <span className="text-buck-gold font-black text-2xl">
              {winner.bucks + pot} buck{winner.bucks + pot === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-3 text-white/70">
            Pot of {pot} buck{pot === 1 ? "" : "s"} + their last {winner.bucks}
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

  const activeOutcome: RollOutcome | null =
    lastTurn && (phase === "reveal" || phase === "buckfly")
      ? lastTurn.outcomes[outcomeIdx] ?? null
      : null;

  return (
    <main
      className="min-h-screen flex flex-col overflow-hidden relative"
      style={{ background: FELT_GRADIENT }}
    >
      <FeltBackground />

      {/* Top bar */}
      <div className="relative z-30 flex items-center justify-between px-4 pt-4 pb-2">
        <div className="text-white/80 text-xs font-black uppercase tracking-widest">
          Round <span className="text-buck-gold">{round}</span>
        </div>
        <motion.div
          key={displayedPot}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-1.5 bg-black/50 border border-buck-gold/50 rounded-full px-3 py-1 backdrop-blur-sm"
        >
          <MoneyBag size={20} />
          <span className="text-buck-gold font-black text-xs uppercase tracking-widest">
            Pot
          </span>
          <span className="text-white font-black text-base">
            {displayedPot}
          </span>
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

      {/* STAGE */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 min-h-0">
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

        {/* Buck pile */}
        <div className="relative mt-6 min-h-[110px] flex items-end justify-center w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${current.id}-stack`}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="relative flex flex-col items-center"
            >
              <div className="relative">
                <BuckPile count={displayedBucks} billHeight={30} />
                <AnimatePresence>
                  {phase === "buckfly" && activeOutcome && (
                    <motion.div
                      key={`fly-${outcomeIdx}`}
                      className="absolute pointer-events-none"
                      style={{
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        zIndex: 50,
                      }}
                    >
                      <FlyingBuck
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
              <motion.div
                key={displayedBucks}
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.22 }}
                className="mt-3 text-white/90 font-black text-sm uppercase tracking-widest"
              >
                {displayedBucks} buck{displayedBucks === 1 ? "" : "s"}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {phase === "buckfly" &&
              activeOutcome === "left" &&
              leftNeighbor && (
                <RecipientFlash
                  side="left"
                  name={leftNeighbor.name}
                  color={leftNeighbor.color}
                />
              )}
            {phase === "buckfly" &&
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

        {/* Dice tray + outcome card area */}
        <div className="relative min-h-[150px] flex flex-col items-center justify-center w-full gap-3 mt-2">
          {/* Outcome card sits above the dice during reveal/buckfly */}
          <div className="h-24 flex items-center justify-center">
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
            </AnimatePresence>
          </div>
          {/* Dice tray */}
          {lastTurn && (
            <DiceTray
              outcomes={lastTurn.outcomes}
              phase={phase}
              activeIdx={outcomeIdx}
            />
          )}
        </div>
      </div>

      {/* ROLL BUTTON */}
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
                ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
                : {}
            }
            onClick={onRoll}
            disabled={!canRoll}
            className="w-full rounded-3xl font-black text-2xl tracking-wider text-white disabled:cursor-not-allowed border-2 relative overflow-hidden"
            style={{
              padding: "24px 24px",
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
              <Die size={36} blind />
              <span>
                {phase === "rolling"
                  ? "ROLLING…"
                  : phase === "reveal" ||
                    phase === "buckfly" ||
                    phase === "outro"
                  ? "…"
                  : phase === "skip"
                  ? "SKIPPING…"
                  : current.bucks <= 0
                  ? "NO BUCKS"
                  : "ROLL!"}
              </span>
              <Die size={36} blind />
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
              <div className="flex justify-center mb-2">
                <Skip size={48} color="#F97066" />
              </div>
              <div
                className="font-black text-2xl"
                style={{ color: current?.color }}
              >
                {current?.name}
              </div>
              <div className="text-buck-coral font-black text-sm uppercase tracking-widest mt-1">
                No bucks — skipped!
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
                className="mb-4 flex justify-center"
              >
                <Phone size={96} color={nextPlayer.color} />
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
