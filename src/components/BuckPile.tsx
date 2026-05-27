"use client";

import Buck from "./Buck";

type BuckPileProps = {
  count: number;
  /** Height of each bill in px. Larger = easier to read at a glance. */
  billHeight?: number;
  /** Vertical offset between bills in the stack. */
  stackOffset?: number;
};

// Per-bill deterministic jitter for the "hand-tossed onto the table" feel.
function jitter(i: number): { rot: number; dx: number } {
  const s = i * 53 + 17;
  return {
    rot: ((s * 7) % 11) - 5, // -5..5 deg
    dx: ((s * 13) % 5) - 2, // -2..2 px
  };
}

/**
 * Renders a player's bucks as a single vertical stack.
 *
 *  - 1–3 bucks: each bill drawn full-size, stacked with a small overlap so
 *    you can see the top edge of every bill below.
 *  - 4+ bucks: a stack of 3 bills with a "×N" total displayed alongside.
 *
 * Bills are intentionally large here so the player's holding reads clearly
 * across the room.
 */
export default function BuckPile({
  count,
  billHeight = 46,
  stackOffset = 12,
}: BuckPileProps) {
  if (count <= 0) {
    const w = Math.round(billHeight * 2.35);
    return (
      <div
        className="rounded-md border-2 border-dashed border-white/15 flex items-center justify-center"
        style={{ width: w, height: billHeight + 4 }}
      >
        <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
          empty
        </span>
      </div>
    );
  }

  const billWidth = Math.round(billHeight * 2.35);
  const visibleCount = Math.min(count, 3);
  const stackHeight = billHeight + (visibleCount - 1) * stackOffset;

  const stack = (
    <div
      className="relative"
      style={{ width: billWidth, height: stackHeight }}
    >
      {Array.from({ length: visibleCount }).map((_, i) => {
        const j = jitter(i);
        return (
          <div
            key={i}
            className="absolute"
            style={{
              top: i * stackOffset,
              left: j.dx,
              width: billWidth,
              height: billHeight,
              transform: `rotate(${j.rot}deg)`,
              transformOrigin: "center",
              filter: `drop-shadow(0 ${2 + i * 0.6}px ${
                3 + i * 0.5
              }px rgba(0,0,0,0.55))`,
              zIndex: i + 1,
            }}
          >
            <Buck height={billHeight} />
          </div>
        );
      })}
    </div>
  );

  if (count <= 3) return stack;

  // 4+ bucks: stack of 3 + ×N badge to the right.
  return (
    <div
      className="flex items-center justify-center"
      style={{ gap: 14 }}
    >
      {stack}
      <div
        className="flex flex-col items-center justify-center font-black leading-none"
        style={{ height: stackHeight }}
      >
        <span
          className="text-white/45 leading-none"
          style={{ fontSize: billHeight * 0.45 }}
        >
          ×
        </span>
        <span
          className="text-white leading-none mt-1"
          style={{
            fontSize: billHeight * 1.1,
            fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
            textShadow: "0 3px 0 rgba(0,0,0,0.55)",
          }}
        >
          {count}
        </span>
      </div>
    </div>
  );
}
