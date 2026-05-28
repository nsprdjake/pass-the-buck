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
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getDeviceId, getMembership } from "@/lib/identity";
import {
  endTurnRemote,
  findGame,
  rollForActivePlayer,
  startGame as startGameRemote,
  type GameRow,
  type PlayerRow,
} from "@/lib/remote-game";
import { notifyNudge } from "@/lib/push";
import { getSupabase } from "@/lib/supabase";

export type Nudge = {
  /** sender's display name */
  fromName: string;
  /** sender's player color */
  fromColor: string;
  /** seat number of the player being nudged (the active seat at send time) */
  toSeat: number;
  /** local timestamp when the nudge arrived */
  at: number;
};

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
  /** Broadcast a nudge to every connected device in this game. Consumers
   *  whose `me.seat === game.current_seat` should react with feedback. */
  sendNudge: () => void;
  /** The most recently received nudge (or null). Consumers can watch
   *  `lastNudge?.at` for changes. */
  lastNudge: Nudge | null;
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
  const [lastNudge, setLastNudge] = useState<Nudge | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
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

  // Mobile browsers tear down realtime sockets when backgrounded, so
  // re-pull authoritative state when the tab returns to the foreground or
  // the network reconnects. Belt-and-suspenders on top of the channel's
  // built-in reconnect.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function maybeRefresh() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }
    document.addEventListener("visibilitychange", maybeRefresh);
    window.addEventListener("focus", maybeRefresh);
    window.addEventListener("online", maybeRefresh);
    // pageshow fires on bfcache restores (very common on iOS Safari)
    window.addEventListener("pageshow", maybeRefresh);
    return () => {
      document.removeEventListener("visibilitychange", maybeRefresh);
      window.removeEventListener("focus", maybeRefresh);
      window.removeEventListener("online", maybeRefresh);
      window.removeEventListener("pageshow", maybeRefresh);
    };
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refresh();

    let cleanup: (() => void) | null = null;

    const setupSub = async () => {
      const sb = getSupabase();
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
        .on("broadcast", { event: "nudge" }, ({ payload }) => {
          if (cancelled) return;
          if (
            !payload ||
            typeof payload.fromName !== "string" ||
            typeof payload.toSeat !== "number"
          ) {
            return;
          }
          setLastNudge({
            fromName: payload.fromName,
            fromColor: payload.fromColor ?? "#FBBF24",
            toSeat: payload.toSeat,
            at: Date.now(),
          });
        })
        .subscribe();

      channelRef.current = channel;
      cleanup = () => {
        channelRef.current = null;
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

  const sendNudge = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || !game || !me) return;
    // Snapshot the active seat at send time so a stale receiver still
    // matches against the right seat.
    channel.send({
      type: "broadcast",
      event: "nudge",
      payload: {
        fromName: me.display_name,
        fromColor: me.color,
        toSeat: game.current_seat,
      },
    });
    // Fire-and-forget OS-push for backgrounded/closed tabs. The realtime
    // broadcast above covers connected devices; this picks up the rest.
    void notifyNudge({
      gameId: game.id,
      toSeat: game.current_seat,
      fromName: me.display_name,
      fromColor: me.color,
    });
  }, [game, me]);

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
    sendNudge,
    lastNudge,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRemoteGame(): RemoteGameValue {
  const v = useContext(Ctx);
  if (!v)
    throw new Error("useRemoteGame must be used inside <RemoteGameProvider>");
  return v;
}

export { getMembership };
