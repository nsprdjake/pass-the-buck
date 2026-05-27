import type { GameMode } from "@/lib/types";

/**
 * Thin parchment ribbon sitting just above the pot band on active game
 * screens. Always reflects what's at stake at a glance:
 *
 *   - "Last eyeBuck Wins · Winner takes the pot"
 *   - "Stuck with the Tab · Loser buys dinner"
 *
 * The mode label is the always-visible part. If a wager was set on
 * creation it follows after a dot separator.
 */
export default function StakesRibbon({
  mode,
  wager,
}: {
  mode: GameMode;
  wager: string | null;
}) {
  const label = mode === "loser" ? "Stuck with the Tab" : "Last eyeBuck Wins";
  const fallback =
    mode === "loser" ? "Loser pays the tab" : "Winner takes the pot";
  const tail = wager?.trim() || fallback;

  return (
    <div className="relative z-30 flex items-center justify-center px-4 pt-1 pb-2">
      <div
        className="inline-flex max-w-full items-center gap-2 truncate rounded-full border px-3 py-1"
        style={{
          background:
            "linear-gradient(180deg, rgba(244,228,183,0.92) 0%, rgba(217,194,149,0.92) 100%)",
          borderColor: "var(--wood-mid)",
          boxShadow:
            "0 1px 0 rgba(255,240,210,0.6) inset, 0 2px 6px rgba(0,0,0,0.45)",
        }}
      >
        <span
          className="text-[0.6rem] font-bold uppercase text-[var(--wood-dark)]"
          style={{
            fontFamily: "var(--font-rye), Georgia, serif",
            letterSpacing: "0.22em",
          }}
        >
          {label}
        </span>
        <span aria-hidden className="text-[0.55rem] text-[var(--wood-mid)]/70">
          ✸
        </span>
        <span
          className="truncate text-[0.7rem] italic text-[var(--wood-mid)]"
          style={{ fontFamily: "var(--font-fell), Georgia, serif" }}
        >
          {tail}
        </span>
      </div>
    </div>
  );
}
