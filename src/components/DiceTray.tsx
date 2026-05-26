"use client";

import { motion } from "framer-motion";
import Die, { FACE_BY_OUTCOME } from "./Die";
import type { RollOutcome } from "@/lib/types";

type Phase =
  | "idle"
  | "slam"
  | "rolling"
  | "reveal"
  | "buckfly"
  | "outro"
  | "skip"
  | "pass"
  | "finished";

type DiceTrayProps = {
  outcomes: RollOutcome[];
  phase: Phase;
  /** Index of the outcome currently being revealed/animated */
  activeIdx: number;
};

/**
 * Renders the dice the active player just rolled. During the rolling phase
 * the dice tumble face-down ("?"). When they settle, each one shows its
 * outcome letter. As the outcomes are revealed one-at-a-time, the active
 * die scales up and glows, finished dice dim, and pending dice sit ready.
 */
export default function DiceTray({ outcomes, phase, activeIdx }: DiceTrayProps) {
  if (outcomes.length === 0) return null;
  if (phase === "idle" || phase === "slam" || phase === "skip" || phase === "pass")
    return null;

  // Pick a die size that lets up to ~6 dice fit on a phone before wrapping.
  const count = outcomes.length;
  const baseSize =
    count <= 4 ? 46 : count <= 6 ? 40 : count <= 8 ? 36 : 32;

  return (
    <div
      className="flex items-center justify-center"
      style={{
        gap: 8,
        flexWrap: "wrap",
        maxWidth: "100%",
        rowGap: 10,
      }}
    >
      {outcomes.map((o, i) => {
        const isActive =
          (phase === "reveal" || phase === "buckfly") && i === activeIdx;
        const isPast =
          (phase === "reveal" || phase === "buckfly" || phase === "outro") &&
          i < activeIdx;
        const isRolling = phase === "rolling";
        const face = FACE_BY_OUTCOME[o];

        return (
          <motion.div
            key={i}
            initial={false}
            animate={
              isRolling
                ? {
                    rotate: [0, 360, 720, 1080],
                    y: [-22, 6, -4, 0],
                    scale: [0.85, 1.08, 0.96, 1],
                  }
                : {
                    rotate: 0,
                    y: 0,
                    scale: isActive ? 1.18 : 1,
                    opacity: isPast ? 0.45 : 1,
                  }
            }
            transition={
              isRolling
                ? {
                    duration: 0.85,
                    delay: i * 0.07,
                    times: [0, 0.45, 0.78, 1],
                    ease: "easeOut",
                  }
                : { type: "spring", stiffness: 380, damping: 22 }
            }
            style={{
              filter: isActive
                ? `drop-shadow(0 0 18px ${face.glow}cc) drop-shadow(0 6px 8px rgba(0,0,0,0.55))`
                : `drop-shadow(0 ${isPast ? 1 : 3}px 5px rgba(0,0,0,0.5))`,
            }}
          >
            <Die size={baseSize} outcome={o} blind={isRolling} />
          </motion.div>
        );
      })}
    </div>
  );
}
