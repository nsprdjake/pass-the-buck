"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import BuckPile from "@/components/BuckPile";
import DiceTray from "@/components/DiceTray";
import PotPile from "@/components/PotPile";
import RollButton from "@/components/game/RollButton";
import StakesRibbon from "@/components/game/StakesRibbon";
import {
  BUCK_FLY_MS,
  FlyingBuck,
  OUTCOME_GAP_MS,
  OutcomeCard,
  RecipientFlash,
  REVEAL_HOLD_MS,
  ROLLING_MS,
  SLAM_MS,
  TURN_OUTRO_MS,
} from "@/components/game/shared";
import { Bell, Skip } from "@/components/icons";
import { useRemoteGame, type Nudge } from "@/context/RemoteGameContext";
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

const NUDGE_COOLDOWN_MS = 10_000;

export default function ActiveGameView() {
  const router = useRouter();
  const { game, players, me, current, isMyTurn, roll, endTurn, sendNudge, lastNudge } =
    useRemoteGame();

  const [displayedBucks, setDisplayedBucks] = useState(0);
  const [displayedPot, setDisplayedPot] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [outcomeIdx, setOutcomeIdx] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [playedTurnId, setPlayedTurnId] = useState<string | null>(null);
  const [nudgeSentAt, setNudgeSentAt] = useState<number>(0);
  const [nudgeFlash, setNudgeFlash] = useState<Nudge | null>(null);
  const animatingRef = useRef(false);
  const endingRef = useRef(false);
  const lastShownNudgeAtRef = useRef<number>(0);

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
      // Pre-roll snapshot the server captured at the moment the roll
      // happened. Using these instead of reconstructing from the
      // currently-rendered state avoids visual overshoot when the per-player
      // realtime UPDATE arrives after the game UPDATE that carried last_turn.
      const rollerSeat =
        players.find((p) => p.id === turn.playerId)?.seat ?? null;
      const startBucks =
        turn.bucksBefore?.[turn.playerId] ??
        // Fallback for older turns saved before bucksBefore existed
        (players.find((p) => p.id === turn.playerId)?.bucks ?? 0) +
          turn.transfers.filter((t) => t.outcome !== "keep").length;
      const startPot = turn.potBefore;

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
  // === Nudge: when I'm the active player and a fresh nudge arrives, react ===
  useEffect(() => {
    if (!lastNudge) return;
    if (lastNudge.at === lastShownNudgeAtRef.current) return;
    // Only react if the nudge targets the seat I'm currently sitting in.
    if (!me || me.seat !== lastNudge.toSeat) return;
    lastShownNudgeAtRef.current = lastNudge.at;
    setNudgeFlash(lastNudge);
    playSfx("nudge");
    // Haptic on supporting devices (Android Chrome). iOS Safari ignores this.
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        (navigator as Navigator).vibrate?.([120, 80, 120, 80, 200]);
      } catch {
        // ignore
      }
    }
    const t = setTimeout(() => setNudgeFlash(null), 1800);
    return () => clearTimeout(t);
  }, [lastNudge, me]);

  const nudgeCooldownRemaining = Math.max(
    0,
    nudgeSentAt + NUDGE_COOLDOWN_MS - Date.now()
  );
  const canNudge =
    !isMyTurn &&
    !!current &&
    !!me &&
    nudgeCooldownRemaining === 0 &&
    game?.status === "active";

  const onNudge = useCallback(() => {
    if (!canNudge) return;
    unlockAudio();
    playSfx("joinClick");
    sendNudge();
    setNudgeSentAt(Date.now());
  }, [canNudge, sendNudge]);

  // Tick once a second while a cooldown is active so the button label
  // updates without needing a re-render trigger.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (nudgeCooldownRemaining === 0) return;
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [nudgeCooldownRemaining]);

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
    <main className="felt-saloon min-h-screen flex flex-col overflow-hidden relative">
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

      {/* Stakes ribbon — mode + optional wager */}
      <StakesRibbon mode={game.mode} wager={game.wager} />

      {/* Pot band — sits on a wood rail */}
      <div
        className="wood-grain relative z-20 flex items-center justify-center px-4 py-2"
        style={{
          borderTop: "3px solid #2a1a0a",
          borderBottom: "3px solid #2a1a0a",
          boxShadow:
            "inset 0 2px 0 rgba(255,225,170,0.12), inset 0 -2px 0 rgba(0,0,0,0.5), 0 6px 12px rgba(0,0,0,0.45)",
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
            <div
              className="text-[10px] uppercase tracking-[0.4em]"
              style={{ fontFamily: "var(--font-fell), Georgia, serif", color: "#f4e4b7", opacity: 0.75 }}
            >
              {isMyTurn ? "yer turn, partner" : "now rollin'"}
            </div>
            <h1
              className="mt-1 leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]"
              style={{
                fontFamily: "var(--font-rye), Georgia, serif",
                color: stageColor,
                fontSize: "clamp(2.5rem, 10vw, 4.5rem)",
                letterSpacing: "0.01em",
                textShadow: "0 3px 0 rgba(0,0,0,0.45)",
              }}
            >
              {current.display_name}
            </h1>
            {current.bucks > 0 && phase === "idle" && (
              <div
                className="mt-2 text-buck-gold/90 uppercase tracking-widest text-xs"
                style={{ fontFamily: "var(--font-fell), Georgia, serif" }}
              >
                {rollCount} di{rollCount === 1 ? "e" : "ce"} on the table
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Buck pile */}
        <div className="relative mt-6 min-h-[150px] flex items-end justify-center w-full">
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
                <BuckPile count={displayedBucks} />
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
            <RollButton
              onTap={onRoll}
              enabled={canRoll}
              state={phase}
              playerColor={stageColor}
              bucks={current.bucks}
            />
          ) : (
            <>
              <div
                className="wood-grain w-full px-6 py-5 text-center relative"
                style={{
                  borderRadius: 10,
                  border: "3px solid #2a1a0a",
                  boxShadow:
                    "inset 0 2px 0 rgba(255,255,255,0.12), inset 0 -3px 0 rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.5)",
                }}
              >
                <div
                  className="text-[10px] uppercase tracking-[0.4em] text-parchment"
                  style={{
                    fontFamily: "var(--font-fell), Georgia, serif",
                    color: "#f4e4b7",
                    opacity: 0.8,
                  }}
                >
                  Waitin' on
                </div>
                <div
                  className="mt-1"
                  style={{
                    fontFamily: "var(--font-rye), Georgia, serif",
                    color: stageColor,
                    fontSize: 28,
                    textShadow: "0 2px 0 rgba(0,0,0,0.7)",
                  }}
                >
                  {current.display_name}
                </div>
                <div
                  className="text-[11px] uppercase tracking-widest mt-1"
                  style={{
                    color: "#f4e4b7",
                    opacity: 0.7,
                    fontFamily: "var(--font-fell), Georgia, serif",
                  }}
                >
                  {phase === "rolling" || phase === "reveal" || phase === "buckfly"
                    ? "to make their roll…"
                    : "to step up to the table"}
                </div>
              </div>

              {/* Nudge button — visible to non-active members */}
              <motion.button
                whileTap={canNudge ? { scale: 0.94 } : {}}
                onClick={onNudge}
                disabled={!canNudge}
                className="mt-3 w-full flex items-center justify-center gap-2 py-3 disabled:cursor-not-allowed"
                style={{
                  borderRadius: 8,
                  border: "2px solid #2a1a0a",
                  background: canNudge
                    ? "linear-gradient(180deg, #a16207 0%, #6b4209 100%)"
                    : "linear-gradient(180deg, #3a2410 0%, #2a1a0a 100%)",
                  boxShadow: canNudge
                    ? "0 4px 0 #2a1a0a, 0 6px 14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,225,170,0.25)"
                    : "0 2px 0 #1a0c04, 0 2px 6px rgba(0,0,0,0.45)",
                  opacity: canNudge ? 1 : 0.55,
                }}
              >
                <Bell size={22} color={canNudge ? "#FFE3A0" : "#7a5c2e"} />
                <span
                  style={{
                    fontFamily: "var(--font-rye), Georgia, serif",
                    color: "#FFE3A0",
                    fontSize: 16,
                    letterSpacing: "0.04em",
                    textShadow: "0 1px 0 #2a1a0a",
                  }}
                >
                  {nudgeCooldownRemaining > 0
                    ? `Nudged! (${Math.ceil(nudgeCooldownRemaining / 1000)}s)`
                    : `Nudge ${current.display_name}`}
                </span>
              </motion.button>
            </>
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
                className="text-3xl"
                style={{
                  color: current.color,
                  fontFamily: "var(--font-rye), Georgia, serif",
                  textShadow: "0 2px 0 rgba(0,0,0,0.55)",
                }}
              >
                {current.display_name}
              </div>
              <div
                className="text-buck-coral text-sm uppercase tracking-widest mt-1"
                style={{ fontFamily: "var(--font-fell), Georgia, serif" }}
              >
                Plumb broke — skip 'em!
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NUDGE flash overlay — only fires on the active player's device */}
      <AnimatePresence>
        {nudgeFlash && (
          <motion.div
            key={`nudge-${nudgeFlash.at}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] pointer-events-none flex items-start justify-center pt-24"
          >
            {/* Edge flash — pulsing gold border */}
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0.4, 0.85, 0] }}
              transition={{ duration: 1.6, times: [0, 0.1, 0.5, 0.7, 1] }}
              className="absolute inset-0"
              style={{
                boxShadow:
                  "inset 0 0 0 8px #FFE3A0, inset 0 0 64px rgba(255,227,160,0.65)",
              }}
            />
            {/* Centered ping */}
            <motion.div
              initial={{ scale: 0.5, y: -20, rotate: -6 }}
              animate={{ scale: [0.5, 1.1, 1, 1.05, 1], y: 0, rotate: [-6, 4, -2, 1, 0] }}
              exit={{ scale: 0.85, opacity: 0, y: -10 }}
              transition={{ duration: 0.5, times: [0, 0.4, 0.6, 0.8, 1] }}
              className="parchment relative px-6 pt-3 pb-4 text-center"
              style={{
                border: "3px solid #2a1a0a",
                borderRadius: 4,
                boxShadow:
                  "0 14px 32px rgba(0,0,0,0.6), 0 0 60px rgba(255,227,160,0.55)",
                minWidth: 240,
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <Bell size={28} color="#a16207" />
                <span
                  style={{
                    fontFamily: "var(--font-rye), Georgia, serif",
                    color: "#2a1a0a",
                    fontSize: 26,
                  }}
                >
                  NUDGE!
                </span>
                <Bell size={28} color="#a16207" />
              </div>
              <div
                className="mt-1 text-sm"
                style={{
                  fontFamily: "var(--font-fell), Georgia, serif",
                  color: "#2a1a0a",
                }}
              >
                <span className="italic opacity-70">from </span>
                <span
                  className="font-black"
                  style={{ color: nudgeFlash.fromColor }}
                >
                  {nudgeFlash.fromName}
                </span>
              </div>
              <div
                className="mt-1 text-[10px] uppercase tracking-[0.3em]"
                style={{
                  fontFamily: "var(--font-fell), Georgia, serif",
                  color: "#2a1a0a",
                  opacity: 0.6,
                }}
              >
                yer turn, partner!
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
