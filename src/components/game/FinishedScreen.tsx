"use client";

import { motion } from "framer-motion";
import Buck from "@/components/Buck";
import { Confetti } from "@/components/game/shared";
import { MoneyBag, NoEntry, Trophy } from "@/components/icons";
import type { GameMode } from "@/lib/types";

type Props = {
  mode: GameMode;
  wager: string | null;
  playerName: string;
  playerColor: string;
  finalBucks: number;
  pot: number;
  onRematch: () => void;
  onExit: () => void;
  rematchLabel?: string;
  exitLabel?: string;
};

/**
 * Game-over screen for both winner and loser modes.
 *
 * Winner mode  → Trophy, gold "Champion of the Saloon" banner, confetti,
 *                falling bucks, pot summary.
 * Loser mode   → NoEntry stamp, barn-red "Stuck with the Tab" banner,
 *                no confetti or celebratory animation, wager displayed.
 *
 * The mechanical "finalist" (last player holding bucks) is the same in
 * both modes — only the framing changes.
 */
export default function FinishedScreen({
  mode,
  wager,
  playerName,
  playerColor,
  finalBucks,
  pot,
  onRematch,
  onExit,
  rematchLabel = "Rematch",
  exitLabel = "New Game",
}: Props) {
  const isLoser = mode === "loser";

  // === LOSER MODE ===========================================
  if (isLoser) {
    const tab = wager?.trim();
    return (
      <main
        className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 py-12"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #2a0a0a 0%, #1a0606 60%, #0a0303 100%)",
        }}
      >
        {/* subtle dust motes drifting down — no celebration */}
        <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                y: -40,
                x: `${Math.random() * 100}vw`,
                opacity: 0,
              }}
              animate={{
                y: "110vh",
                opacity: [0, 0.5, 0.5, 0],
              }}
              transition={{
                duration: 8 + Math.random() * 4,
                delay: Math.random() * 3,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute h-1 w-1 rounded-full bg-[var(--parchment-light)]/40"
            />
          ))}
        </div>

        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative z-50 w-full max-w-md text-center"
        >
          {/* Stamp icon — heavier, more deliberate than the trophy */}
          <motion.div
            initial={{ scale: 0, rotate: -8 }}
            animate={{ scale: [0, 1.15, 1], rotate: [-8, 4, -2] }}
            transition={{ duration: 0.5, times: [0, 0.65, 1] }}
            className="mb-4 flex justify-center"
            style={{ filter: "drop-shadow(0 6px 0 rgba(0,0,0,0.55))" }}
          >
            <NoEntry size={128} color="#c43838" />
          </motion.div>

          <div
            className="text-[0.72rem] uppercase text-[#ff9b9b]"
            style={{
              fontFamily: "var(--font-rye), Georgia, serif",
              letterSpacing: "0.4em",
            }}
          >
            Stuck with the Tab
          </div>

          <motion.h1
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 280 }}
            className="mt-2 text-6xl leading-tight"
            style={{
              color: playerColor,
              fontFamily: "var(--font-rye), Georgia, serif",
              textShadow:
                "0 4px 0 rgba(0,0,0,0.65), 0 0 26px rgba(196,56,56,0.35)",
            }}
          >
            {playerName}
          </motion.h1>

          {tab ? (
            <div
              className="mx-auto mt-6 inline-flex max-w-full items-center gap-2 rounded-[10px] border-[1.5px] px-5 py-3"
              style={{
                background:
                  "linear-gradient(180deg, var(--parchment-light) 0%, var(--parchment-mid) 60%, var(--parchment-dark) 100%)",
                borderColor: "var(--wood-mid)",
                boxShadow:
                  "0 1px 0 rgba(255,240,210,0.6) inset, 0 4px 14px rgba(0,0,0,0.55)",
              }}
            >
              <span
                className="text-[0.6rem] font-bold uppercase text-[var(--wood-mid)]/85"
                style={{
                  fontFamily: "var(--font-rye), Georgia, serif",
                  letterSpacing: "0.32em",
                }}
              >
                Owes
              </span>
              <span
                className="text-[1.15rem] font-bold text-[var(--wood-dark)]"
                style={{
                  fontFamily: "var(--font-fell), Georgia, serif",
                }}
              >
                {tab}
              </span>
            </div>
          ) : (
            <p
              className="mt-4 text-[var(--parchment-light)]/65 italic"
              style={{ fontFamily: "var(--font-fell), Georgia, serif" }}
            >
              You know the deal. Pay up.
            </p>
          )}

          <p
            className="mt-4 text-[0.85rem] italic text-[var(--parchment-light)]/45"
            style={{ fontFamily: "var(--font-fell), Georgia, serif" }}
          >
            Last one with {finalBucks} eyeBuck
            {finalBucks === 1 ? "" : "s"} on the table.
            {pot > 0 ? ` Pot of ${pot} got dragged in.` : ""}
          </p>

          <button
            onClick={onRematch}
            className="brass-cta mt-10 block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[var(--accent-dark)] py-4 text-center transition-transform active:scale-[0.985]"
          >
            <span
              className="relative block text-[1.05rem] font-bold uppercase text-[var(--wood-dark)]"
              style={{
                fontFamily: "var(--font-rye), Georgia, serif",
                letterSpacing: "0.22em",
                textShadow: "0 1px 0 rgba(255,240,200,0.55)",
              }}
            >
              {rematchLabel}
            </span>
          </button>
          <button
            onClick={onExit}
            className="mt-3 block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[var(--accent-mid)]/40 py-3.5 text-center text-[var(--parchment-light)]/85 transition-transform active:scale-[0.985]"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,30,20,0.7) 100%)",
              fontFamily: "var(--font-rye), Georgia, serif",
              letterSpacing: "0.22em",
            }}
          >
            <span className="text-[0.95rem] font-bold uppercase">
              {exitLabel}
            </span>
          </button>
        </motion.div>

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
        `}</style>
      </main>
    );
  }

  // === WINNER MODE ==========================================
  const total = finalBucks + pot;
  return (
    <main
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 py-12"
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
            animate={{ y: "110vh", rotate: 720, opacity: [0, 1, 1, 0] }}
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
        className="relative z-50 w-full max-w-md text-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: [0, 1.3, 1], rotate: [-20, 8, 0] }}
          transition={{ duration: 0.7, times: [0, 0.7, 1] }}
          className="mb-4 flex justify-center"
        >
          <Trophy size={128} />
        </motion.div>
        <div
          className="text-xs uppercase tracking-[0.4em] text-buck-gold"
          style={{ fontFamily: "var(--font-rye), Georgia, serif" }}
        >
          Champion of the Saloon
        </div>
        <motion.h1
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          className="mt-2 text-6xl leading-tight"
          style={{
            color: playerColor,
            fontFamily: "var(--font-rye), Georgia, serif",
            textShadow: "0 4px 0 rgba(0,0,0,0.55)",
          }}
        >
          {playerName}
        </motion.h1>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-buck-gold/40 bg-buck-gold/15 px-5 py-3">
          <MoneyBag size={28} />
          <span className="text-2xl font-black text-buck-gold">
            {total} eyeBuck{total === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-3 text-white/70">
          Pot of {pot} eyeBuck{pot === 1 ? "" : "s"} + their last {finalBucks}
        </p>
        {wager?.trim() && (
          <p
            className="mt-2 text-[0.88rem] italic text-buck-gold/80"
            style={{ fontFamily: "var(--font-fell), Georgia, serif" }}
          >
            And the wager: {wager.trim()}
          </p>
        )}
        <button
          onClick={onRematch}
          className="brass-cta mt-10 block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[var(--accent-dark)] py-4 text-center transition-transform active:scale-[0.985]"
        >
          <span
            className="relative block text-[1.05rem] font-bold uppercase text-[var(--wood-dark)]"
            style={{
              fontFamily: "var(--font-rye), Georgia, serif",
              letterSpacing: "0.22em",
              textShadow: "0 1px 0 rgba(255,240,200,0.55)",
            }}
          >
            {rematchLabel}
          </span>
        </button>
        <button
          onClick={onExit}
          className="mt-3 block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[var(--accent-mid)]/40 py-3.5 text-center text-[var(--parchment-light)]/85 transition-transform active:scale-[0.985]"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,30,20,0.7) 100%)",
            fontFamily: "var(--font-rye), Georgia, serif",
            letterSpacing: "0.22em",
          }}
        >
          <span className="text-[0.95rem] font-bold uppercase">{exitLabel}</span>
        </button>
      </motion.div>

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
      `}</style>
    </main>
  );
}
