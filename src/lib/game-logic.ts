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

function findNeighbor(
  players: Player[],
  fromIdx: number,
  direction: 1 | -1
): number {
  const n = players.length;
  let idx = (fromIdx + direction + n) % n;
  let safety = 0;
  while (players[idx].eliminated && idx !== fromIdx && safety < n) {
    idx = (idx + direction + n) % n;
    safety++;
  }
  return idx;
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
        const leftIdx = findNeighbor(updated, currentIdx, -1);
        if (leftIdx !== currentIdx) {
          current.bucks -= 1;
          updated[leftIdx].bucks += 1;
        }
        break;
      }
      case "right": {
        const rightIdx = findNeighbor(updated, currentIdx, 1);
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

  for (const p of updated) {
    if (p.bucks <= 0) {
      p.bucks = 0;
      p.eliminated = true;
    }
  }

  return { players: updated, pot: newPot };
}

export function checkWinner(players: Player[]): Player | null {
  const alive = players.filter((p) => !p.eliminated && p.bucks > 0);
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
  while (players[idx].eliminated && safety < n) {
    idx = (idx + 1) % n;
    safety++;
  }
  return idx;
}
