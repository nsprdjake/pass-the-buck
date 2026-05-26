"use client";

import Buck from "./Buck";

type BuckPileProps = {
  count: number;
  /** Height of each bill */
  billHeight?: number;
  /** Vertical stack offset (px between bills in a stack of <=3) */
  stackOffset?: number;
  /** Horizontal gap between groups */
  groupGap?: number;
  /** How to handle the rightmost N bills as "flying off" (hide them in pile so the overlay reads cleanly) */
  hideTop?: number;
};

/**
 * Returns array of group sizes for a horizontal "row of stacks" layout.
 * Bills are shown side-by-side individually when ≤3; otherwise they are
 * grouped into stacks of 3 (with a smaller leftover stack on the right).
 *
 * Examples:
 *   1 → [1]
 *   3 → [1, 1, 1]
 *   4 → [3, 1]
 *   5 → [3, 2]
 *   6 → [3, 3]
 *   7 → [3, 3, 1]
 */
function groupSizes(count: number): number[] {
  if (count <= 0) return [];
  if (count <= 3) return Array.from({ length: count }, () => 1);
  const groups: number[] = [];
  let remaining = count;
  while (remaining > 3) {
    groups.push(3);
    remaining -= 3;
  }
  if (remaining > 0) groups.push(remaining);
  return groups;
}

/**
 * Render a single stack of N bills (1, 2, or 3), shown from above with the
 * top of each bill peeking from under the next.
 */
function BuckStack({
  n,
  height,
  offset,
}: {
  n: number;
  height: number;
  offset: number;
}) {
  const w = Math.round(height * 2.3);
  const stackHeight = height + Math.max(n - 1, 0) * offset;
  return (
    <div
      className="relative"
      style={{ width: w, height: stackHeight }}
    >
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0"
          style={{
            top: i * offset,
            width: w,
            height,
            filter: `drop-shadow(0 ${1.5 + i * 0.4}px ${2 + i * 0.3}px rgba(0,0,0,0.45))`,
            zIndex: i + 1,
          }}
        >
          <Buck height={height} />
        </div>
      ))}
    </div>
  );
}

/**
 * A horizontal row of buck groups. Bills lay flat side-by-side; if there are
 * more than 3, they cluster into stacks of 3 (plus a leftover stack on the
 * right). The whole row is centered.
 */
export default function BuckPile({
  count,
  billHeight = 30,
  stackOffset = 5,
  groupGap = 6,
  hideTop = 0,
}: BuckPileProps) {
  const visible = Math.max(count - hideTop, 0);
  const groups = groupSizes(visible);

  if (visible <= 0) {
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

  return (
    <div
      className="flex items-end justify-center"
      style={{ gap: groupGap }}
    >
      {groups.map((n, i) => (
        <BuckStack
          key={i}
          n={n}
          height={billHeight}
          offset={stackOffset}
        />
      ))}
    </div>
  );
}
