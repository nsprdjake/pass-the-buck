"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PLAYER_COLORS } from "@/lib/constants";
import {
  applyTurn,
  checkWinner,
  getNextActivePlayer,
  rollTurn,
} from "@/lib/game-logic";
import type { Player, RollOutcome } from "@/lib/types";

const STORAGE_KEY = "ptb:local-game";

export type LocalGameStatus = "lobby" | "active" | "finished";

export type LocalPlayer = Player;

export type Transfer = {
  fromId: string;
  toId: string | "pot";
  outcome: RollOutcome;
};

export type LastTurn = {
  playerId: string;
  outcomes: RollOutcome[];
  transfers: Transfer[];
};

export type LocalGameState = {
  status: LocalGameStatus;
  players: LocalPlayer[];
  buyIn: number;
  pot: number;
  round: number;
  currentIdx: number;
  winnerId: string | null;
  lastTurn: LastTurn | null;
};

type Ctx = LocalGameState & {
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  setBuyIn: (n: number) => void;
  startGame: () => void;
  rollDice: () => void;
  endTurn: () => void;
  newGame: () => void;
  resetForRematch: () => void;
  rolling: boolean;
};

const LocalGameContext = createContext<Ctx | null>(null);

function defaultState(): LocalGameState {
  return {
    status: "lobby",
    players: [],
    buyIn: 3,
    pot: 0,
    round: 1,
    currentIdx: 0,
    winnerId: null,
    lastTurn: null,
  };
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function colorAt(i: number) {
  return PLAYER_COLORS[i % PLAYER_COLORS.length];
}

export function LocalGameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LocalGameState>(defaultState);
  const [rolling, setRolling] = useState(false);
  const rollingRef = useRef(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LocalGameState;
        setState(parsed);
      }
    } catch {
      // ignore malformed storage
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state]);

  const addPlayer = useCallback((rawName: string) => {
    const name = rawName.trim().slice(0, 20);
    if (!name) return;
    setState((s) => {
      if (s.status !== "lobby") return s;
      if (s.players.length >= 12) return s;
      const id = makeId();
      const seat = s.players.length;
      const player: LocalPlayer = {
        id,
        name,
        bucks: s.buyIn,
        eliminated: false,
        color: colorAt(seat),
        order: seat,
      };
      return { ...s, players: [...s.players, player] };
    });
  }, []);

  const removePlayer = useCallback((id: string) => {
    setState((s) => {
      if (s.status !== "lobby") return s;
      const filtered = s.players
        .filter((p) => p.id !== id)
        .map((p, i) => ({ ...p, order: i, color: colorAt(i) }));
      return { ...s, players: filtered };
    });
  }, []);

  const setBuyIn = useCallback((n: number) => {
    setState((s) => {
      if (s.status !== "lobby") return s;
      const buyIn = Math.max(1, Math.min(9, Math.floor(n)));
      return {
        ...s,
        buyIn,
        players: s.players.map((p) => ({ ...p, bucks: buyIn })),
      };
    });
  }, []);

  const startGame = useCallback(() => {
    setState((s) => {
      if (s.players.length < 2) return s;
      return {
        ...s,
        status: "active",
        currentIdx: 0,
        pot: 0,
        round: 1,
        winnerId: null,
        lastTurn: null,
        players: s.players.map((p) => ({
          ...p,
          bucks: s.buyIn,
          eliminated: false,
        })),
      };
    });
  }, []);

  const rollDice = useCallback(() => {
    if (rollingRef.current) return;
    rollingRef.current = true;
    setRolling(true);

    setState((s) => {
      if (s.status !== "active") return s;
      const current = s.players[s.currentIdx];
      if (!current || current.bucks <= 0) return s;

      const rolls = rollTurn(current.bucks);
      const transfers: Transfer[] = [];
      let working = current.bucks;
      const n = s.players.length;

      for (const o of rolls) {
        if (working <= 0) break;
        if (o === "left") {
          const toIdx = (s.currentIdx - 1 + n) % n;
          transfers.push({
            fromId: current.id,
            toId: s.players[toIdx].id,
            outcome: o,
          });
          working--;
        } else if (o === "right") {
          const toIdx = (s.currentIdx + 1) % n;
          transfers.push({
            fromId: current.id,
            toId: s.players[toIdx].id,
            outcome: o,
          });
          working--;
        } else if (o === "center") {
          transfers.push({ fromId: current.id, toId: "pot", outcome: o });
          working--;
        } else {
          transfers.push({ fromId: current.id, toId: current.id, outcome: o });
        }
      }

      const { players: nextPlayers, pot: nextPot } = applyTurn(
        s.players,
        s.currentIdx,
        rolls,
        s.pot
      );
      const winner = checkWinner(nextPlayers);

      return {
        ...s,
        players: nextPlayers,
        pot: nextPot,
        winnerId: winner?.id ?? null,
        lastTurn: {
          playerId: current.id,
          outcomes: rolls,
          transfers,
        },
      };
    });
  }, []);

  const endTurn = useCallback(() => {
    setState((s) => {
      if (s.status !== "active") return s;
      if (s.winnerId) {
        return { ...s, status: "finished", lastTurn: null };
      }
      const nextIdx = getNextActivePlayer(s.players, s.currentIdx);
      const advancedRound = nextIdx <= s.currentIdx ? s.round + 1 : s.round;
      return {
        ...s,
        currentIdx: nextIdx,
        round: advancedRound,
        lastTurn: null,
      };
    });
    rollingRef.current = false;
    setRolling(false);
  }, []);

  const newGame = useCallback(() => {
    setState(defaultState());
    rollingRef.current = false;
    setRolling(false);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  const resetForRematch = useCallback(() => {
    setState((s) => ({
      ...s,
      status: "lobby",
      pot: 0,
      round: 1,
      currentIdx: 0,
      winnerId: null,
      lastTurn: null,
      players: s.players.map((p) => ({
        ...p,
        bucks: s.buyIn,
        eliminated: false,
      })),
    }));
    rollingRef.current = false;
    setRolling(false);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      rolling,
      addPlayer,
      removePlayer,
      setBuyIn,
      startGame,
      rollDice,
      endTurn,
      newGame,
      resetForRematch,
    }),
    [
      state,
      rolling,
      addPlayer,
      removePlayer,
      setBuyIn,
      startGame,
      rollDice,
      endTurn,
      newGame,
      resetForRematch,
    ]
  );

  return (
    <LocalGameContext.Provider value={value}>
      {children}
    </LocalGameContext.Provider>
  );
}

export function useLocalGame() {
  const ctx = useContext(LocalGameContext);
  if (!ctx) {
    throw new Error("useLocalGame must be used inside <LocalGameProvider>");
  }
  return ctx;
}
