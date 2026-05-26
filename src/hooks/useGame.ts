"use client";

import { useCallback, useState } from "react";
import {
  applyTurn,
  checkWinner,
  getNextActivePlayer,
  rollTurn,
} from "@/lib/game-logic";
import type { Player, RollOutcome } from "@/lib/types";

type UseGameInit = {
  players: Player[];
  buyIn: number;
};

type DoRollResult = {
  outcomes: RollOutcome[];
  winner: Player | null;
};

export function useGame({ players: initialPlayers, buyIn }: UseGameInit) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [pot, setPot] = useState(buyIn * initialPlayers.length);
  const [round, setRound] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [outcomes, setOutcomes] = useState<RollOutcome[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);

  const doRoll = useCallback(async (): Promise<DoRollResult> => {
    if (rolling || gameOver) return { outcomes: [], winner };

    setRolling(true);
    setOutcomes([]);

    const current = players[currentIdx];
    const rolls = rollTurn(current.bucks);

    await new Promise((r) => setTimeout(r, 600));
    setOutcomes(rolls);

    const { players: nextPlayers, pot: nextPot } = applyTurn(
      players,
      currentIdx,
      rolls,
      pot
    );

    setPlayers(nextPlayers);
    setPot(nextPot);

    const w = checkWinner(nextPlayers);
    if (w) {
      setWinner(w);
      setGameOver(true);
      setRolling(false);
      return { outcomes: rolls, winner: w };
    }

    await new Promise((r) => setTimeout(r, 900));

    const nextIdx = getNextActivePlayer(nextPlayers, currentIdx);
    if (nextIdx <= currentIdx) {
      setRound((r) => r + 1);
    }
    setCurrentIdx(nextIdx);
    setOutcomes([]);
    setRolling(false);

    return { outcomes: rolls, winner: null };
  }, [players, currentIdx, pot, rolling, gameOver, winner]);

  return {
    players,
    currentIdx,
    pot,
    round,
    rolling,
    outcomes,
    gameOver,
    winner,
    doRoll,
  };
}
