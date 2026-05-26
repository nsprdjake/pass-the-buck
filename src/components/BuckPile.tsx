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

/**
 * Renders a player's bucks.
 *  - 1–3 bucks: shown side-by-side on the table, no stacking.
 *  - 4+ bucks: a single 3-high stack of bills with the total drawn next to it.
 */
export default function BuckPile({
  count,
  billHeight = 30,
  stackOffset = 5,
  gap = 6,
}: BuckPileProps) {
  if (count <= 0) {
    const w = Math.round(billHeight * 2.3);
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

  const billWidth = Math.round(billHeight * 2.3);

  // 1–3 bucks: lay them flat side-by-side.
  if (count <= 3) {
    return (
      <div className="flex items-end justify-center" style={{ gap }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              width: billWidth,
              height: billHeight,
              filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))",
            }}
          >
            <Buck height={billHeight} />
          </div>
        ))}
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
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute left-0"
            style={{
              top: i * stackOffset,
              width: billWidth,
              height: billHeight,
              filter: `drop-shadow(0 ${1.5 + i * 0.4}px ${
                2 + i * 0.3
              }px rgba(0,0,0,0.5))`,
              zIndex: i + 1,
            }}
          >
            <Buck height={billHeight} />
          </div>
        ))}
      </div>
      <div
        className="flex flex-col items-center justify-center font-black"
        style={{ height: stackHeight }}
      >
        <span className="text-white/40 text-base leading-none mb-0.5">×</span>
        <span
          className="text-white leading-none"
          style={{ fontSize: billHeight * 0.95 }}
        >
          {count}
        </span>
      </div>
    </div>
  );
}
