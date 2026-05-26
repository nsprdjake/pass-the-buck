"use client";

import { useMemo } from "react";
import { motion, type TargetAndTransition } from "framer-motion";
import Buck from "@/components/Buck";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Asterisk,
} from "@/components/icons";
import type { RollOutcome } from "@/lib/types";

// === Shared timing — pages should reference these for consistency ===
export const SLAM_MS = 200;
export const ROLLING_MS = 520;
export const REVEAL_HOLD_MS = 360;
export const BUCK_FLY_MS = 460;
export const OUTCOME_GAP_MS = 80;
export const TURN_OUTRO_MS = 380;

type OutcomeMeta = {
  label: string;
  /** Color used for the headline and the stamp accent. */
  inkColor: string;
  /** Tag line printed below the label in the smaller serif. */
  caption: string;
};

export const OUTCOME_META: Record<RollOutcome, OutcomeMeta> = {
  left: {
    label: "LEFT",
    inkColor: "#1e3a8a",
    caption: "yer neighbor takes a buck",
  },
  right: {
    label: "RIGHT",
    inkColor: "#1e3a8a",
    caption: "yer neighbor takes a buck",
  },
  center: {
    label: "POT!",
    inkColor: "#8b2222",
    caption: "into the kitty it goes",
  },
  keep: {
    label: "KEEP!",
    inkColor: "#a16207",
    caption: "yer buck rides another round",
  },
};

function OutcomeIcon({
  outcome,
  size,
  color,
}: {
  outcome: RollOutcome;
  size: number;
  color?: string;
}) {
  const c = color ?? OUTCOME_META[outcome].inkColor;
  if (outcome === "left") return <ArrowLeft size={size} color={c} />;
  if (outcome === "right") return <ArrowRight size={size} color={c} />;
  if (outcome === "center") return <ArrowDown size={size} color={c} />;
  return <Asterisk size={size} color={c} />;
}

// ============================================================
// Confetti
// ============================================================
export function Confetti() {
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
        return { left, delay, duration, color: colors[i % colors.length] };
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
// OutcomeCard
// ============================================================
export function OutcomeCard({
  outcome,
  recipientName,
  recipientColor,
}: {
  outcome: RollOutcome;
  recipientName?: string;
  recipientColor?: string;
}) {
  const meta = OUTCOME_META[outcome];
  // Slight tilt for character — outcome index would be nicer but we don't
  // have it here; deterministic per outcome label.
  const tilt = outcome === "left" || outcome === "keep" ? -2.5 : 2.5;
  return (
    <motion.div
      key={`${outcome}-${recipientName ?? ""}`}
      initial={{ scale: 0.4, opacity: 0, rotateX: -45, rotate: 0 }}
      animate={{ scale: 1, opacity: 1, rotateX: 0, rotate: tilt }}
      exit={{ scale: 0.85, opacity: 0 }}
      transition={{ type: "spring", stiffness: 460, damping: 22 }}
      className="parchment relative px-5 pt-2.5 pb-3 text-center min-w-[240px]"
      style={{
        // chunky deckle/aged edge via thick ink stroke + heavy shadow
        border: `3px solid #2a1a0a`,
        boxShadow: `0 10px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.4), inset 0 0 0 2px rgba(244,228,183,0.5)`,
        borderRadius: 3,
      }}
    >
      {/* Hairline inner border for that double-rule poster look */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          inset: 4,
          border: "1px solid #2a1a0a",
          borderRadius: 1,
          opacity: 0.65,
        }}
      />

      <div
        className="text-[9px] uppercase tracking-[0.4em]"
        style={{
          fontFamily: "var(--font-fell), Georgia, serif",
          color: "#2a1a0a",
          opacity: 0.7,
        }}
      >
        ★  the die says  ★
      </div>

      <div className="flex items-center justify-center gap-2.5 mt-0.5">
        <OutcomeIcon outcome={outcome} size={36} />
        <span
          className="leading-none"
          style={{
            fontFamily: "var(--font-rye), Georgia, serif",
            color: meta.inkColor,
            fontSize: 38,
            letterSpacing: "0.02em",
            textShadow: "1px 1px 0 rgba(0,0,0,0.18)",
          }}
        >
          {meta.label}
        </span>
      </div>

      {recipientName ? (
        <div
          className="mt-0.5"
          style={{
            fontFamily: "var(--font-fell), Georgia, serif",
            color: "#2a1a0a",
          }}
        >
          <span className="text-[11px] italic">to </span>
          <span
            className="text-base font-black"
            style={{
              color: recipientColor ?? "#2a1a0a",
              textShadow: "0 1px 0 rgba(244,228,183,0.7)",
            }}
          >
            {recipientName}
          </span>
        </div>
      ) : (
        <div
          className="mt-0.5 text-[10px] italic"
          style={{
            fontFamily: "var(--font-fell), Georgia, serif",
            color: "#2a1a0a",
            opacity: 0.7,
          }}
        >
          {meta.caption}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
// FlyingBuck
// ============================================================
export function FlyingBuck({
  direction,
}: {
  direction: "left" | "right" | "up" | "keep";
}) {
  let animate: TargetAndTransition = {};
  if (direction === "left") {
    animate = {
      x: [0, -90, -280],
      y: [0, -10, 10],
      opacity: [1, 1, 0],
      rotate: [0, -90, -240],
      scale: [1, 0.95, 0.8],
    };
  } else if (direction === "right") {
    animate = {
      x: [0, 90, 280],
      y: [0, -10, 10],
      opacity: [1, 1, 0],
      rotate: [0, 90, 240],
      scale: [1, 0.95, 0.8],
    };
  } else if (direction === "up") {
    animate = {
      x: [0, 0, -110],
      y: [0, -100, -320],
      opacity: [1, 1, 0],
      rotate: [0, 180, 540],
      scale: [1, 0.85, 0.4],
    };
  } else {
    animate = {
      y: [0, -24, 0, -12, 0],
      scale: [1, 1.18, 1, 1.06, 1],
      rotate: [0, -6, 6, -3, 0],
    };
  }

  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
      animate={animate}
      transition={{
        duration: BUCK_FLY_MS / 1000,
        times: direction === "keep" ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.4, 1],
        ease: direction === "keep" ? "easeInOut" : "easeOut",
      }}
      style={{
        filter:
          direction === "keep"
            ? "drop-shadow(0 0 22px rgba(251,191,36,0.85)) drop-shadow(0 4px 6px rgba(0,0,0,0.55))"
            : "drop-shadow(0 6px 10px rgba(0,0,0,0.55))",
      }}
    >
      <Buck height={46} />
    </motion.div>
  );
}

// ============================================================
// RecipientFlash
// ============================================================
export function RecipientFlash({
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
      transition={{ duration: 0.22 }}
      className="absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none"
      style={{ [side]: 8 } as React.CSSProperties}
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
// Felt background — used by both modes
// ============================================================
export function FeltBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-30"
      style={{
        backgroundImage:
          "radial-gradient(rgba(0,0,0,0.4) 0.5px, transparent 0.5px)",
        backgroundSize: "4px 4px",
        mixBlendMode: "multiply",
      }}
    />
  );
}

export const FELT_GRADIENT =
  "radial-gradient(ellipse at 50% 35%, #0d5c3f 0%, #073d28 55%, #03200f 100%)";
