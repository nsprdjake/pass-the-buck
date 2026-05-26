import { OUTCOMES } from "./constants";
import type { Player, RollOutcome } from "./types";

export function rollOutcome(): RollOutcome {
  return OUTCOMES[Math.floor(Math.random() * OUTCOMES.length)];
}

export function rollTurn(numBucks: number): RollOutcome[] {
  const rolls = Math.min(Math.max(numBucks, 0), 3);
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

  // Eliminated is dynamic: a player with bucks > 0 is back in the game.
  for (const p of updated) {
    p.eliminated = p.bucks <= 0;
  }

  return { players: updated, pot: newPot };
}

export function checkWinner(players: Player[]): Player | null {
  const alive = players.filter((p) => p.bucks > 0);
  if (alive.length === 1) return alive[0];
  return null;
}

export function getNextActivePlayer(
  players: Player[],
  currentIdx: number
): number {
  const n = players.length;
  let idx = (currentIdx + 1) % n;
  let safety = 0;
  while (players[idx].bucks <= 0 && safety < n) {
    idx = (idx + 1) % n;
    safety++;
  }
  return idx;
}
