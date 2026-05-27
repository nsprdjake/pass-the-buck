"use client";

import { motion, type Transition } from "framer-motion";
import Die from "@/components/Die";

type RollButtonState =
  | "idle"
  | "slam"
  | "rolling"
  | "reveal"
  | "buckfly"
  | "outro"
  | "skip";

type RollButtonProps = {
  onTap: () => void;
  /** Whether the button is currently tappable. */
  enabled: boolean;
  /** Phase the page is in (used to drive label + animation). */
  state: RollButtonState;
  /** Player whose turn this is; their colour drives the glow halo. */
  playerColor: string;
  /** Bucks the active player currently holds — affects the disabled label. */
  bucks: number;
  /** Override the idle label (default "ROLL 'EM"). */
  idleLabel?: string;
};

/**
 * The big wooden saloon-plaque roll button used on both the local and
 * multi-device game screens. Brass studs at the corners, ink-brown border,
 * wood-grain face, and Rye font on the label.
 */
export default function RollButton({
  onTap,
  enabled,
  state,
  playerColor,
  bucks,
  idleLabel = "ROLL 'EM",
}: RollButtonProps) {
  const label =
    state === "rolling"
      ? "ROLLIN'…"
      : state === "reveal" || state === "buckfly" || state === "outro"
      ? "…"
      : state === "skip"
      ? "SKIPPIN'…"
      : bucks <= 0
      ? "PLUMB BROKE"
      : idleLabel;

  const animate =
    state === "slam"
      ? { scale: [1, 0.85, 1.04, 1] }
      : enabled
      ? { scale: [1, 1.02, 1] }
      : { scale: 1 };
  const transition: Transition =
    state === "slam"
      ? { duration: 0.22, times: [0, 0.4, 0.7, 1] }
      : enabled
      ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
      : {};

  return (
    <motion.button
      whileTap={enabled ? { scale: 0.93 } : {}}
      animate={animate}
      transition={transition}
      onClick={onTap}
      disabled={!enabled}
      className="w-full relative wood-grain disabled:cursor-not-allowed select-none"
      style={{
        padding: "22px 22px 24px",
        borderRadius: 10,
        border: "3px solid #2a1a0a",
        boxShadow: enabled
          ? `0 12px 36px ${playerColor}66, 0 0 0 4px rgba(0,0,0,0.35), 0 6px 18px rgba(0,0,0,0.7), inset 0 2px 0 rgba(255,255,255,0.15), inset 0 -3px 0 rgba(0,0,0,0.4)`
          : "0 4px 12px rgba(0,0,0,0.45), inset 0 -3px 0 rgba(0,0,0,0.4)",
        opacity: enabled ? 1 : 0.6,
      }}
    >
      {/* Decorative inner double-rule */}
      <span
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          inset: 5,
          borderRadius: 6,
          border: "1px dashed rgba(255, 218, 153, 0.45)",
        }}
      />

      {/* Brass corner studs */}
      {[
        { top: 8, left: 8 },
        { top: 8, right: 8 },
        { bottom: 8, left: 8 },
        { bottom: 8, right: 8 },
      ].map((pos, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute"
          style={{
            ...(pos as React.CSSProperties),
            width: 12,
            height: 12,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle at 30% 30%, #ffe3a0 0%, #c99a33 55%, #5c3c0e 100%)",
            border: "1px solid #2a1a0a",
            boxShadow: "0 1px 0 rgba(0,0,0,0.4)",
          }}
        />
      ))}

      {/* Pulsing colored halo when ready */}
      {enabled && (
        <motion.span
          aria-hidden
          className="absolute pointer-events-none"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            inset: -8,
            borderRadius: 14,
            boxShadow: `0 0 32px ${playerColor}cc, 0 0 64px ${playerColor}66`,
            zIndex: -1,
          }}
        />
      )}

      <span className="relative inline-flex items-center justify-center gap-3">
        <Die size={36} blind />
        <span
          className="leading-none"
          style={{
            fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
            fontSize: 28,
            color: "#ffe3a0",
            textShadow:
              "0 2px 0 #2a1a0a, 0 -1px 0 rgba(255,255,255,0.15), 1px 0 0 #2a1a0a, -1px 0 0 #2a1a0a",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </span>
        <Die size={36} blind />
      </span>
    </motion.button>
  );
}
