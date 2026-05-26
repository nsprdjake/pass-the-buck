"use client";

import Buck from "./Buck";

type BuckPileProps = {
  count: number;
  /** Height of each bill */
  billHeight?: number;
  /** Vertical stack offset (px between bills in the stack of 3) */
  stackOffset?: number;
  /** Horizontal gap between bills in the side-by-side layout */
  gap?: number;
};

// Per-bill deterministic jitter for the "casual / hand-tossed" feel.
function jitter(i: number): { rot: number; dy: number } {
  const s = i * 53 + 17;
  return {
    rot: ((s * 7) % 11) - 5, // -5..5 deg
    dy: ((s * 13) % 7) - 3, // -3..3 px
  };
}

/**
 * Renders a player's bucks.
 *  - 1–3 bucks: shown side-by-side on the table, no stacking, with a small
 *    natural-looking jitter so they don't sit ruler-straight.
 *  - 4+ bucks: a single 3-high stack of bills with the total drawn next to it.
 */
export default function BuckPile({
  count,
  billHeight = 30,
  stackOffset = 5,
  gap = 6,
}: BuckPileProps) {
  if (count <= 0) {
    const w = Math.round(billHeight * 2.35);
    return (
      <div
        className="rounded-md border-2 border-dashed border-white/15 flex items-center justify-center"
        style={{ width: w, height: billHeight + 4 }}
      >
        <span className="text-white/30 text-[9px] font-bold uppercase tracking-widest">
          empty
        </span>
      </div>
    );
  }

  const billWidth = Math.round(billHeight * 2.35);

  // 1–3 bucks: lay them flat side-by-side with mild jitter.
  if (count <= 3) {
    return (
      <div
        className="flex items-end justify-center"
        style={{ gap, paddingTop: 4, paddingBottom: 4 }}
      >
        {Array.from({ length: count }).map((_, i) => {
          const j = jitter(i);
          return (
            <div
              key={i}
              style={{
                width: billWidth,
                height: billHeight,
                transform: `translateY(${j.dy}px) rotate(${j.rot}deg)`,
                transformOrigin: "center",
                filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.55))",
              }}
            >
              <Buck height={billHeight} />
            </div>
          );
        })}
      </div>
    );
  }

  // 4+ bucks: ONE stack of 3 bills with the total beside it.
  const stackHeight = billHeight + 2 * stackOffset;
  return (
    <div
      className="flex items-end justify-center"
      style={{ gap: gap + 6 }}
    >
      <div
        className="relative"
        style={{ width: billWidth, height: stackHeight }}
      >
        {[0, 1, 2].map((i) => {
          const j = jitter(i);
          return (
            <div
              key={i}
              className="absolute"
              style={{
                top: i * stackOffset + j.dy * 0.4,
                left: j.rot * 0.4, // tiny lateral shimmy
                width: billWidth,
                height: billHeight,
                transform: `rotate(${j.rot * 0.5}deg)`,
                filter: `drop-shadow(0 ${1.5 + i * 0.4}px ${
                  2 + i * 0.3
                }px rgba(0,0,0,0.55))`,
                zIndex: i + 1,
              }}
            >
              <Buck height={billHeight} />
            </div>
          );
        })}
      </div>
      <div
        className="flex flex-col items-center justify-center font-black"
        style={{ height: stackHeight }}
      >
        <span className="text-white/40 text-base leading-none mb-0.5">×</span>
        <span
          className="text-white leading-none"
          style={{
            fontSize: billHeight * 0.95,
            textShadow: "0 2px 0 rgba(0,0,0,0.5)",
          }}
        >
          {count}
        </span>
      </div>
    </div>
  );
}
