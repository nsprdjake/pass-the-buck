"use client";

import { AnimatePresence, motion } from "framer-motion";
import Buck from "./Buck";

type PotPileProps = {
  count: number;
};

// Up to this many bills are drawn in the visible heap; beyond that the
// number tells the rest of the story.
const MAX_VISIBLE = 9;

/** Deterministic pseudo-random transforms so the heap looks "tossed" but
 *  is stable across renders. */
function billTransforms(): Array<{ x: number; y: number; rot: number }> {
  const out: Array<{ x: number; y: number; rot: number }> = [];
  for (let i = 0; i < MAX_VISIBLE; i++) {
    const seed = i * 137 + 41;
    out.push({
      x: ((seed * 23) % 86) - 43, // -43..43
      y: ((seed * 19) % 32) - 16, // -16..16
      rot: ((seed * 11) % 84) - 42, // -42..42 deg
    });
  }
  return out;
}

const TRANSFORMS = billTransforms();

/**
 * A growing scattered heap of bucks representing the pot. Bills land in at
 * random rotations/offsets as `count` increases. The accompanying "POT N"
 * label is rendered to the right.
 */
export default function PotPile({ count }: PotPileProps) {
  const visible = Math.min(Math.max(count, 0), MAX_VISIBLE);

  return (
    <motion.div
      key={count}
      initial={{ scale: 1 }}
      animate={count > 0 ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="relative flex items-center justify-center gap-3"
    >
      {/* The heap */}
      <div
        className="relative shrink-0"
        style={{ width: 130, height: 64 }}
      >
        {/* faint felt halo */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(251,191,36,0.18) 0%, transparent 65%)",
          }}
        />
        {TRANSFORMS.map((t, i) => (
          <AnimatePresence key={`slot-${i}`}>
            {i < visible && (
              <motion.div
                key={`bill-${i}`}
                initial={{
                  scale: 0.3,
                  y: -90,
                  opacity: 0,
                  rotate: 0,
                }}
                animate={{
                  scale: 1,
                  y: 0,
                  opacity: 1,
                  rotate: t.rot,
                }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 14,
                  delay: i === visible - 1 ? 0 : 0,
                }}
                className="absolute"
                style={{
                  left: `calc(50% + ${t.x}px - 26px)`,
                  top: `calc(50% + ${t.y}px - 11px)`,
                  zIndex: i + 1,
                  transformOrigin: "center",
                }}
              >
                <Buck height={22} />
              </motion.div>
            )}
          </AnimatePresence>
        ))}

        {/* Empty state ghost */}
        {count <= 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="border-2 border-dashed border-white/15 rounded-md w-14 h-7 flex items-center justify-center">
              <span className="text-white/30 text-[8px] font-black uppercase tracking-widest">
                empty
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Label */}
      <div className="flex flex-col items-start leading-none">
        <span
          className="text-buck-gold tracking-[0.18em] text-sm"
          style={{
            fontFamily: "var(--font-rye), Georgia, serif",
            textShadow: "0 2px 0 rgba(0,0,0,0.55)",
          }}
        >
          The Pot
        </span>
        <motion.span
          key={`count-${count}`}
          initial={{ scale: 1.4, color: "#FFE3A0" }}
          animate={{ scale: 1, color: "#FFFFFF" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="text-white text-3xl leading-none mt-0.5"
          style={{
            fontFamily: "var(--font-rye), Georgia, serif",
            textShadow:
              "0 2px 0 rgba(0,0,0,0.5), 0 0 16px rgba(251,191,36,0.6)",
          }}
        >
          {count}
        </motion.span>
      </div>
    </motion.div>
  );
}
