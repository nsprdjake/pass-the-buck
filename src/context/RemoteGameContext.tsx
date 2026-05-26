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
import { getDeviceId, getMembership } from "@/lib/identity";
import {
  endTurnRemote,
  findGame,
  rollForActivePlayer,
  startGame as startGameRemote,
  type GameRow,
  type PlayerRow,
} from "@/lib/remote-game";
import { getSupabase } from "@/lib/supabase";

type RemoteGameValue = {
  loading: boolean;
  error: string | null;
  game: GameRow | null;
  players: PlayerRow[]; // sorted by seat
  me: PlayerRow | null;
  isHost: boolean;
  current: PlayerRow | null;
  isMyTurn: boolean;
  /** True once we have a row for this device in the game */
  isMember: boolean;
  /** Host action: start the game */
  start: () => Promise<void>;
  /** Active player action: roll the dice */
  roll: () => Promise<void>;
  /** Active player action after animation finishes: advance the seat */
  endTurn: () => Promise<void>;
  /** Force a fresh fetch of game + players */
  refresh: () => Promise<void>;
};

const Ctx = createContext<RemoteGameValue | null>(null);

export function RemoteGameProvider({
  code,
  children,
}: {
  code: string;
  children: React.ReactNode;
}) {
  const normalizedCode = code.toUpperCase();
  const [game, setGame] = useState<GameRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const deviceId = useRef<string | null>(null);

  if (deviceId.current === null && typeof window !== "undefined") {
    deviceId.current = getDeviceId();
  }

  const me = useMemo(() => {
    if (!deviceId.current) return null;
    return players.find((p) => p.device_id === deviceId.current) ?? null;
  }, [players]);

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.seat - b.seat),
    [players]
  );

  const current = useMemo(() => {
    if (!game) return null;
    return sortedPlayers.find((p) => p.seat === game.current_seat) ?? null;
  }, [game, sortedPlayers]);

  const isHost = !!me?.is_host;
  const isMyTurn = !!me && !!current && me.id === current.id;
  const isMember = !!me;

  const refresh = useCallback(async () => {
    try {
      const fetched = await findGame(normalizedCode);
      const sb = getSupabase();
      const { data: playerRows, error: pErr } = await sb
        .from("ptb_players")
        .select("*")
        .eq("game_id", fetched.id)
        .order("seat");
      if (pErr) throw new Error(pErr.message);
      // Write players FIRST, then game. The animation effect watches
      // `game?.last_turn?.id` — by setting players first we guarantee the
      // roster is already populated when the game update flushes through
      // React 18's automatic batching.
      setPlayers((playerRows as PlayerRow[]) ?? []);
      setGame(fetched);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't load game";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [normalizedCode]);

  // Initial load + realtime subscriptions
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refresh();

    let cleanup: (() => void) | null = null;

    const setupSub = async () => {
      const sb = getSupabase();
      // First fetch to get the game ID
      const initial = await sb
        .from("ptb_games")
        .select("*")
        .eq("code", normalizedCode)
        .maybeSingle<GameRow>();
      if (cancelled || !initial.data) return;
      const gameId = initial.data.id;

      const channel = sb
        .channel(`ptb:${gameId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "ptb_games",
            filter: `id=eq.${gameId}`,
          },
          (payload) => {
            if (cancelled) return;
            const next = payload.new as GameRow | null;
            if (next) setGame(next);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "ptb_players",
            filter: `game_id=eq.${gameId}`,
          },
          (payload) => {
            if (cancelled) return;
            if (payload.eventType === "INSERT") {
              const row = payload.new as PlayerRow;
              setPlayers((prev) =>
                prev.find((p) => p.id === row.id) ? prev : [...prev, row]
              );
            } else if (payload.eventType === "UPDATE") {
              const row = payload.new as PlayerRow;
              setPlayers((prev) =>
                prev.map((p) => (p.id === row.id ? row : p))
              );
            } else if (payload.eventType === "DELETE") {
              const old = payload.old as PlayerRow;
              setPlayers((prev) => prev.filter((p) => p.id !== old.id));
            }
          }
        )
        .subscribe();

      cleanup = () => {
        sb.removeChannel(channel);
      };
    };

    setupSub();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedCode]);

  const start = useCallback(async () => {
    if (!game) return;
    if (!me?.is_host) throw new Error("Only host can start");
    await startGameRemote({ gameId: game.id, buyIn: game.buy_in });
  }, [game, me?.is_host]);

  const roll = useCallback(async () => {
    if (!game) return;
    if (!isMyTurn) throw new Error("Not your turn");
    await rollForActivePlayer({ game, players: sortedPlayers });
  }, [game, isMyTurn, sortedPlayers]);

  const endTurn = useCallback(async () => {
    if (!game) return;
    await endTurnRemote({
      gameId: game.id,
      players: sortedPlayers,
      currentSeat: game.current_seat,
      currentRound: game.round,
    });
  }, [game, sortedPlayers]);

  const value: RemoteGameValue = {
    loading,
    error,
    game,
    players: sortedPlayers,
    me,
    isHost,
    current,
    isMyTurn,
    isMember,
    start,
    roll,
    endTurn,
    refresh,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRemoteGame(): RemoteGameValue {
  const v = useContext(Ctx);
  if (!v)
    throw new Error("useRemoteGame must be used inside <RemoteGameProvider>");
  return v;
}

// Re-export for convenience
export { getMembership };
