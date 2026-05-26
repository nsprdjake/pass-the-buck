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
  cardFrom: string;
  cardTo: string;
  accent: string;
};

export const OUTCOME_META: Record<RollOutcome, OutcomeMeta> = {
  left: {
    label: "LEFT",
    cardFrom: "#1E40AF",
    cardTo: "#3B82F6",
    accent: "#60A5FA",
  },
  right: {
    label: "RIGHT",
    cardFrom: "#1E40AF",
    cardTo: "#3B82F6",
    accent: "#60A5FA",
  },
  center: {
    label: "POT!",
    cardFrom: "#9F1239",
    cardTo: "#F97066",
    accent: "#F97066",
  },
  keep: {
    label: "KEEP!",
    cardFrom: "#854D0E",
    cardTo: "#FBBF24",
    accent: "#FBBF24",
  },
};

function OutcomeIcon({ outcome, size }: { outcome: RollOutcome; size: number }) {
  if (outcome === "left") return <ArrowLeft size={size} color="#fff" />;
  if (outcome === "right") return <ArrowRight size={size} color="#fff" />;
  if (outcome === "center") return <ArrowDown size={size} color="#fff" />;
  return <Asterisk size={size} color="#fff" />;
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
  return (
    <motion.div
      key={`${outcome}-${recipientName ?? ""}`}
      initial={{ scale: 0.4, opacity: 0, rotateX: -45 }}
      animate={{ scale: 1, opacity: 1, rotateX: 0 }}
      exit={{ scale: 0.85, opacity: 0 }}
      transition={{ type: "spring", stiffness: 480, damping: 22 }}
      className="relative rounded-2xl px-6 py-4 text-center"
      style={{
        background: `linear-gradient(135deg, ${meta.cardFrom} 0%, ${meta.cardTo} 100%)`,
        boxShadow: `0 0 40px ${meta.accent}66, 0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)`,
        border: `2px solid ${meta.accent}`,
        minWidth: 220,
      }}
    >
      <div className="flex items-center justify-center mb-1">
        <OutcomeIcon outcome={outcome} size={42} />
      </div>
      <div className="font-black text-3xl tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
        {meta.label}
      </div>
      {recipientName && (
        <div className="mt-1 text-xs font-black uppercase tracking-widest">
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
      <Buck height={36} />
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
