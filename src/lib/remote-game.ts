"use client";

import { PLAYER_COLORS } from "./constants";
import { getDeviceId, makeToken, saveMembership } from "./identity";
import { getSupabase } from "./supabase";
import type { GameMode } from "./types";

// Row shapes (mirror migrations 002 + 003 + 004).
export type GameRow = {
  id: string;
  code: string;
  host_token: string;
  status: "lobby" | "active" | "finished";
  buy_in: number;
  pot: number;
  current_seat: number;
  round: number;
  winner_player_id: string | null;
  last_turn: unknown;
  created_at: string;
  updated_at: string;
  mode: GameMode;
  wager: string | null;
  host_user_id: string | null;
};

export type PlayerRow = {
  id: string;
  game_id: string;
  device_id: string;
  claim_token: string;
  display_name: string;
  color: string;
  seat: number;
  bucks: number;
  is_host: boolean;
  created_at: string;
  user_id: string | null;
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(len = 6): string {
  let code = "";
  for (let i = 0; i < len; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function colorAt(i: number) {
  return PLAYER_COLORS[i % PLAYER_COLORS.length];
}

export async function createGame(opts: {
  displayName: string;
  buyIn: number;
  mode?: GameMode;
  wager?: string | null;
  userId?: string | null;
  color?: string | null;
}): Promise<{ game: GameRow; me: PlayerRow }> {
  const sb = getSupabase();
  const deviceId = getDeviceId();
  const hostToken = makeToken();
  const mode: GameMode = opts.mode ?? "winner";
  const wagerTrimmed = (opts.wager ?? "").trim().slice(0, 80);
  const wager = wagerTrimmed === "" ? null : wagerTrimmed;
  const hostUserId = opts.userId ?? null;

  let game: GameRow | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateCode();
    const { data, error } = await sb
      .from("ptb_games")
      .insert({
        code,
        host_token: hostToken,
        buy_in: opts.buyIn,
        status: "lobby",
        mode,
        wager,
        host_user_id: hostUserId,
      })
      .select()
      .single<GameRow>();
    if (!error && data) {
      game = data;
      break;
    }
    if (error && !/duplicate|unique/i.test(error.message)) {
      throw new Error(error.message);
    }
  }
  if (!game) throw new Error("Couldn't generate a unique game code");

  const claimToken = makeToken();
  const { data: playerRow, error: pErr } = await sb
    .from("ptb_players")
    .insert({
      game_id: game.id,
      device_id: deviceId,
      claim_token: claimToken,
      display_name: opts.displayName.slice(0, 20),
      color: opts.color || colorAt(0),
      seat: 0,
      bucks: 0,
      is_host: true,
      user_id: hostUserId,
    })
    .select()
    .single<PlayerRow>();
  if (pErr || !playerRow) throw new Error(pErr?.message ?? "Couldn't add host");

  saveMembership(game.code, {
    playerId: playerRow.id,
    claimToken,
    hostToken,
  });

  return { game, me: playerRow };
}

export async function findGame(code: string): Promise<GameRow> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ptb_games")
    .select("*")
    .eq("code", code.toUpperCase())
    .single<GameRow>();
  if (error || !data) throw new Error("Game not found");
  return data;
}

export async function joinGame(opts: {
  code: string;
  displayName: string;
  userId?: string | null;
  color?: string | null;
}): Promise<{ game: GameRow; me: PlayerRow }> {
  const sb = getSupabase();
  const deviceId = getDeviceId();
  const userId = opts.userId ?? null;
  const game = await findGame(opts.code);

  // If this device already has a row in this game, return it (rejoin works
  // even after the host has started).
  const { data: existing } = await sb
    .from("ptb_players")
    .select("*")
    .eq("game_id", game.id)
    .eq("device_id", deviceId)
    .maybeSingle<PlayerRow>();
  if (existing) return { game, me: existing };

  if (game.status !== "lobby") {
    throw new Error("Game already started — can't join now");
  }

  const { data: seatedPlayers } = await sb
    .from("ptb_players")
    .select("seat, color")
    .eq("game_id", game.id);
  const maxSeat = (seatedPlayers ?? []).reduce(
    (m, r) => (r.seat > m ? r.seat : m),
    -1
  );
  const nextSeat = maxSeat + 1;
  if (nextSeat >= 12) throw new Error("Game is full (max 12)");

  const taken = new Set((seatedPlayers ?? []).map((r) => r.color));
  let assignedColor: string;
  if (opts.color && !taken.has(opts.color)) {
    assignedColor = opts.color;
  } else {
    assignedColor =
      PLAYER_COLORS.find((c) => !taken.has(c)) ?? colorAt(nextSeat);
  }

  const claimToken = makeToken();
  const { data: playerRow, error } = await sb
    .from("ptb_players")
    .insert({
      game_id: game.id,
      device_id: deviceId,
      claim_token: claimToken,
      display_name: opts.displayName.slice(0, 20),
      color: assignedColor,
      seat: nextSeat,
      bucks: 0,
      is_host: false,
      user_id: userId,
    })
    .select()
    .single<PlayerRow>();
  if (error || !playerRow) throw new Error(error?.message ?? "Couldn't join");

  saveMembership(game.code, { playerId: playerRow.id, claimToken });

  return { game, me: playerRow };
}
