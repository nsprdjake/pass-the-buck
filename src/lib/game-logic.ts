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

// Game ends when exactly one player holds all remaining (non-pot) bucks —
// i.e. one player has > 0 and everyone else has 0.
export function checkWinner(players: Player[]): Player | null {
  const withBucks = players.filter((p) => p.bucks > 0);
  if (withBucks.length === 1) return withBucks[0];
  return null;
}

// Advance to the next seat in order. Players with 0 bucks are NOT removed;
// they remain seated and can receive bucks from neighbors. The UI is
// responsible for auto-skipping a 0-buck seat with a brief message.
export function getNextActivePlayer(
  players: Player[],
  currentIdx: number
): number {
  const n = players.length;
  if (n === 0) return 0;
  return (currentIdx + 1) % n;
}
