"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import BuckPile from "@/components/BuckPile";
import Die from "@/components/Die";
import DiceTray from "@/components/DiceTray";
import PotPile from "@/components/PotPile";
import {
  BUCK_FLY_MS,
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
import { Skip } from "@/components/icons";
import { useRemoteGame } from "@/context/RemoteGameContext";
import { rollCountForBucks } from "@/lib/game-logic";
import { playSfx, unlockAudio } from "@/lib/sfx";
import type { RollOutcome } from "@/lib/types";

type Phase =
  | "idle"
  | "slam"
  | "rolling"
  | "reveal"
  | "buckfly"
  | "outro"
  | "skip";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export default function ActiveGameView() {
  const router = useRouter();
  const { game, players, me, current, isMyTurn, roll, endTurn } =
    useRemoteGame();

  const [displayedBucks, setDisplayedBucks] = useState(0);
  const [displayedPot, setDisplayedPot] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [outcomeIdx, setOutcomeIdx] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [playedTurnId, setPlayedTurnId] = useState<string | null>(null);
  const animatingRef = useRef(false);
  const endingRef = useRef(false);

  const n = players.length;
  const currentSeat = game?.current_seat ?? 0;
  const leftNeighbor =
    current && n > 0
      ? players.find((p) => p.seat === (currentSeat - 1 + n) % n) ?? null
      : null;
  const rightNeighbor =
    current && n > 0
      ? players.find((p) => p.seat === (currentSeat + 1) % n) ?? null
      : null;

  // === Sync displayed counts when idle ===
  useEffect(() => {
    if (animatingRef.current) return;
    if (game?.last_turn && game.last_turn.id !== playedTurnId) return; // waiting to play turn
    setDisplayedBucks(current?.bucks ?? 0);
    setDisplayedPot(game?.pot ?? 0);
  }, [current?.bucks, game?.pot, game?.last_turn, playedTurnId]);

  // === Play turn animation when a new turn arrives ===
  useEffect(() => {
    if (!game || !game.last_turn) return;
    const turn = game.last_turn;
    if (turn.id === playedTurnId) return;
    if (animatingRef.current) return;

    let cancelled = false;
    animatingRef.current = true;

    async function play() {
      // Start from the pre-roll counts (use server data minus what's been transferred).
      // Simplest: server state at time of last_turn is current.bucks + everything transferred from them,
      // and pot is game.pot minus center transfers. But since we update displayedBucks/Pot at start,
      // we use the current bucks of the rolling player as the starting state.
      const rollerSeat =
        players.find((p) => p.id === turn.playerId)?.seat ?? null;
      const rollerCount = turn.transfers.filter(
        (t) => t.outcome !== "keep"
      ).length;
      // Reconstruct starting bucks by adding back the transferred ones to the
      // roller's current count. (Their server bucks have already been decremented.)
      const rollerNow =
        players.find((p) => p.id === turn.playerId)?.bucks ?? 0;
      const startBucks = rollerNow + rollerCount;

      const potCount = turn.transfers.filter(
        (t) => t.outcome === "center"
      ).length;
      const startPot = (game?.pot ?? 0) - potCount;

      // If the viewer is looking at the rolling player's stage, show their pile shrinking.
      if (rollerSeat === currentSeat) {
        setDisplayedBucks(startBucks);
      }
      setDisplayedPot(startPot);

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
        const o = turn.outcomes[i];
        if (o === "left") playSfx("slideLeft");
        else if (o === "right") playSfx("slideRight");
        else if (o === "center") playSfx("pot");
        else if (o === "keep") playSfx("keep");
        if (o !== "keep") {
          await sleep(140);
          if (cancelled) return;
          if (rollerSeat === currentSeat) {
            setDisplayedBucks((b) => Math.max(b - 1, 0));
          }
          if (o === "center") {
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
      setPlayedTurnId(turn.id);
      setPhase("idle");

      // Only the rolling device advances the turn. Use a ref guard against double-fires.
      const amTheRoller = me?.id === turn.playerId;
      if (amTheRoller && !endingRef.current) {
        endingRef.current = true;
        try {
          await endTurn();
        } catch {
          // ignore — realtime will catch up
        } finally {
          endingRef.current = false;
        }
      }
    }

    play();
    return () => {
      cancelled = true;
      animatingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.last_turn?.id]);

  // === Auto-skip 0-buck active player on their own device ===
  const isSkipping =
    isMyTurn &&
    !!current &&
    current.bucks <= 0 &&
    !game?.last_turn &&
    phase === "idle";

  useEffect(() => {
    if (!isSkipping) return;
    let cancelled = false;
    setPhase("skip");
    const t = setTimeout(async () => {
      if (cancelled) return;
      setPhase("idle");
      if (!endingRef.current) {
        endingRef.current = true;
        try {
          await endTurn();
        } finally {
          endingRef.current = false;
        }
      }
    }, 900);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isSkipping, endTurn]);

  // === Roll handler ===
  const onRoll = useCallback(async () => {
    if (!isMyTurn || phase !== "idle") return;
    if (!current || current.bucks <= 0) return;
    setErr(null);
    unlockAudio();
    playSfx("slam");
    setPhase("slam");
    await sleep(SLAM_MS);
    try {
      await roll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't roll");
      setPhase("idle");
    }
  }, [isMyTurn, phase, current, roll]);

  // === Derived display state ===
  const activeOutcome: RollOutcome | null = useMemo(() => {
    if (!game?.last_turn) return null;
    if (phase !== "reveal" && phase !== "buckfly") return null;
    return game.last_turn.outcomes[outcomeIdx] ?? null;
  }, [game?.last_turn, phase, outcomeIdx]);

  if (!game || !current) return null;

  const canRoll = isMyTurn && current.bucks > 0 && phase === "idle";
  const rollCount = rollCountForBucks(current.bucks);
  const stageColor = current.color;

  return (
    <main
      className="min-h-screen flex flex-col overflow-hidden relative"
      style={{ background: FELT_GRADIENT }}
    >
      <FeltBackground />

      {/* Top nav */}
      <div className="relative z-30 flex items-center justify-between px-4 pt-3 pb-1">
        <div className="text-white/80 text-xs font-black uppercase tracking-widest">
          Round <span className="text-buck-gold">{game.round}</span>
        </div>
        <button
          onClick={() => {
            if (confirm("Leave this game?")) router.replace("/multi");
          }}
          className="text-white/40 text-xs font-bold uppercase tracking-wider hover:text-white/80"
        >
          Leave
        </button>
      </div>

      {/* Pot band */}
      <div
        className="relative z-20 flex items-center justify-center px-4 py-2 border-y"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.35) 100%)",
          borderColor: "rgba(251,191,36,0.28)",
        }}
      >
        <PotPile count={displayedPot} />
      </div>

      {/* Player count strip */}
      <div className="relative z-20 px-4 pb-2 flex items-center justify-center gap-2 flex-wrap">
        {players.map((p) => {
          const isCurrent = p.seat === game.current_seat;
          return (
            <div
              key={p.id}
              className="flex items-center gap-1 rounded-full px-2 py-1 border"
              style={{
                background: isCurrent ? `${p.color}33` : "rgba(0,0,0,0.4)",
                borderColor: isCurrent ? p.color : "rgba(255,255,255,0.1)",
                opacity: p.bucks > 0 ? 1 : 0.45,
              }}
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                style={{ backgroundColor: p.color }}
              >
                {p.display_name.charAt(0).toUpperCase()}
              </div>
              <span
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: isCurrent ? p.color : "rgba(255,255,255,0.7)" }}
              >
                {p.display_name}
              </span>
              <span className="text-[10px] text-white/70 font-bold">
                ·{p.bucks}
              </span>
            </div>
          );
        })}
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
              {isMyTurn ? "Your turn" : "Rolling"}
            </div>
            <h1
              className="mt-1 font-black leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
              style={{
                color: stageColor,
                fontSize: "clamp(2.5rem, 10vw, 4.5rem)",
                letterSpacing: "-0.02em",
              }}
            >
              {current.display_name}
            </h1>
            {current.bucks > 0 && phase === "idle" && (
              <div className="mt-2 text-buck-gold/90 font-black uppercase tracking-widest text-xs">
                {rollCount} di{rollCount === 1 ? "e" : "ce"} to roll
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Buck pile */}
        <div className="relative mt-8 min-h-[140px] flex items-end justify-center w-full">
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
                  name={leftNeighbor.display_name}
                  color={leftNeighbor.color}
                />
              )}
            {phase === "buckfly" &&
              activeOutcome === "right" &&
              rightNeighbor && (
                <RecipientFlash
                  side="right"
                  name={rightNeighbor.display_name}
                  color={rightNeighbor.color}
                />
              )}
          </AnimatePresence>
        </div>

        {/* Dice tray + outcome card area */}
        <div className="relative min-h-[150px] flex flex-col items-center justify-center w-full gap-3 mt-2">
          <div className="h-24 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {activeOutcome && (
                <OutcomeCard
                  key={`oc-${outcomeIdx}-${activeOutcome}`}
                  outcome={activeOutcome}
                  recipientName={
                    activeOutcome === "left"
                      ? leftNeighbor?.display_name
                      : activeOutcome === "right"
                      ? rightNeighbor?.display_name
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
          {game.last_turn && (
            <DiceTray
              outcomes={game.last_turn.outcomes}
              phase={phase}
              activeIdx={outcomeIdx}
            />
          )}
        </div>
      </div>

      {/* Bottom action */}
      <div className="relative z-20 px-5 pb-7 pt-2">
        <div className="max-w-md mx-auto">
          {err && (
            <div className="mb-3 bg-buck-coral/15 border border-buck-coral/40 rounded-xl px-3 py-2 text-buck-coral text-xs font-bold text-center">
              {err}
            </div>
          )}
          {isMyTurn ? (
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
                padding: "26px 24px",
                background: canRoll
                  ? `linear-gradient(135deg, ${stageColor} 0%, ${stageColor}dd 50%, #000 200%)`
                  : `linear-gradient(135deg, #2a2a3a 0%, #1a1a2e 100%)`,
                borderColor: canRoll ? "#ffffff44" : "#ffffff10",
                boxShadow: canRoll
                  ? `0 12px 40px ${stageColor}80, inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -4px 0 rgba(0,0,0,0.3)`
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
                    boxShadow: `0 0 30px ${stageColor}, 0 0 60px ${stageColor}66`,
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
          ) : (
            <div
              className="w-full rounded-3xl font-black text-center px-6 py-6 border-2"
              style={{
                background: "rgba(0,0,0,0.4)",
                borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              <div className="text-[10px] uppercase tracking-[0.4em] text-white/50 font-black">
                Waiting for
              </div>
              <div
                className="mt-1 font-black text-2xl"
                style={{ color: stageColor }}
              >
                {current.display_name}
              </div>
              <div className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
                {phase === "rolling" || phase === "reveal" || phase === "buckfly"
                  ? "rolling…"
                  : "to roll"}
              </div>
            </div>
          )}
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
                style={{ color: current.color }}
              >
                {current.display_name}
              </div>
              <div className="text-buck-coral font-black text-sm uppercase tracking-widest mt-1">
                No bucks — skipped!
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
