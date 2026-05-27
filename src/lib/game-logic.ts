import { OUTCOMES } from "./constants";
import type { Player, RollOutcome } from "./types";

export function rollOutcome(): RollOutcome {
  return OUTCOMES[Math.floor(Math.random() * OUTCOMES.length)];
}

export function rollCountForBucks(numBucks: number): number {
  return Math.min(Math.max(numBucks, 0), 3);
}

export function rollTurn(numBucks: number): RollOutcome[] {
  const rolls = rollCountForBucks(numBucks);
  const results: RollOutcome[] = [];
  for (let i = 0; i < rolls; i++) {
    results.push(rollOutcome());
  }
  return results;
}

function neighborIndex(
  players: Player[],
  fromIdx: number,
  direction: 1 | -1
): number {
  const n = players.length;
  return (fromIdx + direction + n) % n;
}

export function applyTurn(
  players: Player[],
  currentIdx: number,
  outcomes: RollOutcome[],
  pot: number
): { players: Player[]; pot: number } {
  const updated = players.map((p) => ({ ...p }));
  let newPot = pot;
  const current = updated[currentIdx];

  for (const outcome of outcomes) {
    if (current.bucks <= 0) break;

    switch (outcome) {
      case "left": {
        const leftIdx = neighborIndex(updated, currentIdx, -1);
        if (leftIdx !== currentIdx) {
          current.bucks -= 1;
          updated[leftIdx].bucks += 1;
        }
        break;
      }
      case "right": {
        const rightIdx = neighborIndex(updated, currentIdx, 1);
        if (rightIdx !== currentIdx) {
          current.bucks -= 1;
          updated[rightIdx].bucks += 1;
        }
        break;
      }
      case "center": {
        current.bucks -= 1;
        newPot += 1;
        break;
      }
      case "keep":
        break;
    }
  }

  return { players: updated, pot: newPot };
}

// Game ends when only ONE buck remains outside the pot. The player holding
// that last buck is the winner (and collects the pot). If a player has 2+
// bucks and everyone else has 0, the game continues — they must keep rolling
// until the chips are either redistributed or fed into the pot.
export function checkWinner(players: Player[]): Player | null {
  const total = players.reduce((s, p) => s + p.bucks, 0);
  if (total !== 1) return null;
  return players.find((p) => p.bucks === 1) ?? null;
}

// Advance to the next seat *that still has bucks to roll*. Players with 0
// bucks are NOT removed from the table — they remain seated and can receive
// bucks from neighbors — but they get skipped on the way around because
// they'd have nothing to do on their turn anyway.
//
// If somehow nobody at the table has bucks (shouldn't happen in a normal
// game — checkWinner triggers when total === 1), we fall back to the next
// seat in order so we never loop forever.
export function getNextActivePlayer(
  players: Player[],
  currentIdx: number
): number {
  const n = players.length;
  if (n === 0) return 0;
  for (let step = 1; step <= n; step++) {
    const idx = (currentIdx + step) % n;
    if (players[idx].bucks > 0) return idx;
  }
  // No one has bucks — return the next seat as a safety fallback.
  return (currentIdx + 1) % n;
}
