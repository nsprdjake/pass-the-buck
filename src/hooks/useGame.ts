"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  applyTurn,
  checkWinner,
  getNextActivePlayer,
  rollTurn,
} from "@/lib/game-logic";
import { PLAYER_COLORS } from "@/lib/constants";
import type { Player, RollOutcome } from "@/lib/types";

export type GameRow = {
  id: string;
  code: string;
  host_id: string | null;
  status: "lobby" | "active" | "finished";
  buy_in: number;
  turn_timer_seconds: number | null;
  current_turn_index: number;
  pot: number;
  winner_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PlayerRow = {
  id: string;
  game_id: string;
  user_id: string | null;
  display_name: string;
  bucks: number;
  is_out: boolean;
  seat_index: number;
  created_at: string;
};

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function toPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    name: row.display_name,
    bucks: row.bucks,
    eliminated: row.is_out,
    color: PLAYER_COLORS[row.seat_index % PLAYER_COLORS.length],
    order: row.seat_index,
  };
}

export function useGame(gameId: string | null) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [game, setGame] = useState<GameRow | null>(null);
  const [playerRows, setPlayerRows] = useState<PlayerRow[]>([]);
  const [outcomes, setOutcomes] = useState<RollOutcome[]>([]);
  const [rolling, setRolling] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function refreshPlayers() {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("game_id", gameId)
        .order("seat_index");
      if (!cancelled) setPlayerRows((data as PlayerRow[]) ?? []);
    }

    async function load() {
      const [{ data: g }, { data: ps }] = await Promise.all([
        supabase.from("games").select("*").eq("id", gameId).single(),
        supabase
          .from("players")
          .select("*")
          .eq("game_id", gameId)
          .order("seat_index"),
      ]);
      if (cancelled) return;
      setGame((g as GameRow) ?? null);
      setPlayerRows((ps as PlayerRow[]) ?? []);
      setLoading(false);
    }
    void load();

    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          if (payload.new && Object.keys(payload.new).length > 0) {
            setGame(payload.new as GameRow);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          void refreshPlayers();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [gameId, supabase]);

  const players = useMemo(() => playerRows.map(toPlayer), [playerRows]);

  const winner = useMemo<Player | null>(() => {
    if (!game || game.status !== "finished") return null;
    const alive = players.filter((p) => !p.eliminated && p.bucks > 0);
    if (alive.length === 1) return alive[0];
    if (game.winner_id) {
      const row = playerRows.find((r) => r.user_id === game.winner_id);
      if (row) return toPlayer(row);
    }
    return null;
  }, [game, players, playerRows]);

  const rollDice = useCallback(async () => {
    if (!game || rolling) return;
    if (game.status !== "active") return;

    const idx = game.current_turn_index;
    const currentRow = playerRows[idx];
    if (!currentRow) return;

    setRolling(true);
    const rolls = rollTurn(currentRow.bucks);
    setOutcomes(rolls);

    const { players: nextPlayers, pot: nextPot } = applyTurn(
      players,
      idx,
      rolls,
      game.pot
    );
    const w = checkWinner(nextPlayers);

    await supabase.from("turns").insert({
      game_id: game.id,
      player_id: currentRow.id,
      outcomes: rolls.map((r, i) => ({ die: i + 1, result: r })),
    });

    await Promise.all(
      nextPlayers.map((p) =>
        supabase
          .from("players")
          .update({ bucks: p.bucks, is_out: p.eliminated })
          .eq("id", p.id)
      )
    );

    if (w) {
      const winnerRow = playerRows.find((r) => r.id === w.id);
      await supabase
        .from("games")
        .update({
          pot: nextPot,
          status: "finished",
          winner_id: winnerRow?.user_id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", game.id);
    } else {
      const nextIdx = getNextActivePlayer(nextPlayers, idx);
      await supabase
        .from("games")
        .update({
          pot: nextPot,
          current_turn_index: nextIdx,
          updated_at: new Date().toISOString(),
        })
        .eq("id", game.id);
    }

    await new Promise((r) => setTimeout(r, 900));
    setOutcomes([]);
    setRolling(false);
  }, [game, playerRows, players, rolling, supabase]);

  const advanceTurn = useCallback(async () => {
    if (!game) return;
    const nextIdx = getNextActivePlayer(players, game.current_turn_index);
    await supabase
      .from("games")
      .update({
        current_turn_index: nextIdx,
        updated_at: new Date().toISOString(),
      })
      .eq("id", game.id);
  }, [game, players, supabase]);

  return {
    game,
    players,
    playerRows,
    outcomes,
    rolling,
    loading,
    winner,
    rollDice,
    advanceTurn,
  };
}

export async function createGame(opts: {
  hostName: string;
  buyIn: number;
  turnTimerSeconds: number | null;
}): Promise<{ gameId: string; code: string }> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  const code = makeCode();

  const { data: game, error } = await supabase
    .from("games")
    .insert({
      code,
      host_id: userId,
      status: "lobby",
      buy_in: opts.buyIn,
      turn_timer_seconds: opts.turnTimerSeconds,
      pot: 0,
      current_turn_index: 0,
    })
    .select()
    .single();
  if (error || !game) throw error ?? new Error("Failed to create game");

  const { error: pErr } = await supabase.from("players").insert({
    game_id: game.id,
    user_id: userId,
    display_name: opts.hostName,
    bucks: opts.buyIn,
    seat_index: 0,
  });
  if (pErr) throw pErr;

  return { gameId: game.id as string, code };
}

export async function joinGame(opts: {
  code: string;
  displayName: string;
}): Promise<{ gameId: string }> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;

  const { data: game, error } = await supabase
    .from("games")
    .select("id, buy_in, status")
    .eq("code", opts.code.toUpperCase())
    .single();
  if (error || !game) throw error ?? new Error("Game not found");
  if (game.status !== "lobby") throw new Error("Game already started");

  const { data: existing } = await supabase
    .from("players")
    .select("seat_index")
    .eq("game_id", game.id)
    .order("seat_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const seatIndex = ((existing?.seat_index as number | undefined) ?? -1) + 1;

  const { error: pErr } = await supabase.from("players").insert({
    game_id: game.id,
    user_id: userId,
    display_name: opts.displayName,
    bucks: game.buy_in,
    seat_index: seatIndex,
  });
  if (pErr) throw pErr;

  return { gameId: game.id as string };
}

export async function startGame(gameId: string) {
  const supabase = createClient();
  await supabase
    .from("games")
    .update({
      status: "active",
      current_turn_index: 0,
      pot: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId);
}
