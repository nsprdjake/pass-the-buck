"use client";

import { PLAYER_COLORS } from "./constants";
import {
  applyTurn,
  checkWinner,
  getNextActivePlayer,
  rollTurn,
} from "./game-logic";
import { getDeviceId, makeToken, saveMembership } from "./identity";
import { getSupabase } from "./supabase";
import type { GameMode, RollOutcome } from "./types";

export type ServerTransfer = {
  fromId: string;
  toId: string | "pot";
  outcome: RollOutcome;
};

export type ServerTurn = {
  /** unique id for this turn, also matches a row in ptb_turns */
  id: string;
  playerId: string;
  outcomes: RollOutcome[];
  transfers: ServerTransfer[];
  /** Pre-roll pot value, so observers can roll back their displayed pot
   *  to the starting state regardless of realtime event ordering. */
  potBefore: number;
  /** Pre-roll bucks for every player in the game, keyed by player id. Lets
   *  observers compute the starting state without relying on whether the
   *  per-player UPDATE events arrived before or after this turn's GAME
   *  UPDATE. */
  bucksBefore: Record<string, number>;
};

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
  last_turn: ServerTurn | null;
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

/**
 * Remove a player from the lobby. Host can remove any; non-host only themselves.
 *
 * If the player being removed was in a lobby and there are no players left
 * after the delete, also delete the game row so we don't leave stale lobbies
 * sitting around in the DB indefinitely.
 */
export async function leaveOrKick(opts: { playerId: string }) {
  const sb = getSupabase();
  const { data: removed } = await sb
    .from("ptb_players")
    .select("game_id")
    .eq("id", opts.playerId)
    .maybeSingle<{ game_id: string }>();

  const { error } = await sb
    .from("ptb_players")
    .delete()
    .eq("id", opts.playerId);
  if (error) throw new Error(error.message);

  if (!removed?.game_id) return;

  const [{ data: gameRow }, { count: remaining }] = await Promise.all([
    sb
      .from("ptb_games")
      .select("status")
      .eq("id", removed.game_id)
      .maybeSingle<{ status: string }>(),
    sb
      .from("ptb_players")
      .select("id", { count: "exact", head: true })
      .eq("game_id", removed.game_id),
  ]);

  // Only auto-clean lobbies. Active/finished games stay so other players
  // can still see the final state.
  if (gameRow?.status === "lobby" && (remaining ?? 0) === 0) {
    await sb.from("ptb_games").delete().eq("id", removed.game_id);
  }
}

/**
 * Host starts the game — deal buy-in bucks to every player, set status=active.
 */
export async function startGame(opts: { gameId: string; buyIn: number }) {
  const sb = getSupabase();
  const { error: uErr } = await sb
    .from("ptb_players")
    .update({ bucks: opts.buyIn })
    .eq("game_id", opts.gameId);
  if (uErr) throw new Error(uErr.message);

  const { error: gErr } = await sb
    .from("ptb_games")
    .update({
      status: "active",
      current_seat: 0,
      round: 1,
      pot: 0,
      winner_player_id: null,
      last_turn: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.gameId);
  if (gErr) throw new Error(gErr.message);
}

/**
 * Compute a roll for the active player and persist:
 *  - insert a row into ptb_turns
 *  - update ptb_games.last_turn (mirror for realtime)
 *  - update each affected player's bucks + the pot
 *
 * Does NOT advance current_seat; that happens in `endTurnRemote` after the
 * client-side animation finishes.
 */
export async function rollForActivePlayer(opts: {
  game: GameRow;
  players: PlayerRow[];
}): Promise<ServerTurn> {
  const sb = getSupabase();
  const { game, players } = opts;
  const sorted = [...players].sort((a, b) => a.seat - b.seat);
  const current = sorted.find((p) => p.seat === game.current_seat);
  if (!current) throw new Error("No active player");
  if (current.bucks <= 0) throw new Error("Active player has no bucks");

  const outcomes = rollTurn(current.bucks);
  const transfers: ServerTransfer[] = [];
  const n = sorted.length;
  let working = current.bucks;
  for (const o of outcomes) {
    if (working <= 0) break;
    if (o === "left") {
      const toIdx = (game.current_seat - 1 + n) % n;
      transfers.push({
        fromId: current.id,
        toId: sorted[toIdx].id,
        outcome: o,
      });
      working--;
    } else if (o === "right") {
      const toIdx = (game.current_seat + 1) % n;
      transfers.push({
        fromId: current.id,
        toId: sorted[toIdx].id,
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

  const asLocalPlayers = sorted.map((p) => ({
    id: p.id,
    name: p.display_name,
    bucks: p.bucks,
    eliminated: false,
    color: p.color,
    order: p.seat,
  }));
  const currentIdx = sorted.findIndex((p) => p.seat === game.current_seat);
  const result = applyTurn(asLocalPlayers, currentIdx, outcomes, game.pot);

  const { data: turnRow, error: tErr } = await sb
    .from("ptb_turns")
    .insert({
      game_id: game.id,
      player_id: current.id,
      round: game.round,
      outcomes,
      transfers,
      pot_after: result.pot,
    })
    .select()
    .single<{ id: string }>();
  if (tErr || !turnRow) throw new Error(tErr?.message ?? "Couldn't log turn");

  const bucksBefore: Record<string, number> = {};
  for (const p of sorted) bucksBefore[p.id] = p.bucks;

  const serverTurn: ServerTurn = {
    id: turnRow.id,
    playerId: current.id,
    outcomes,
    transfers,
    potBefore: game.pot,
    bucksBefore,
  };

  for (const p of result.players) {
    const before = sorted.find((s) => s.id === p.id);
    if (before && before.bucks === p.bucks) continue;
    await sb.from("ptb_players").update({ bucks: p.bucks }).eq("id", p.id);
  }

  await sb
    .from("ptb_games")
    .update({
      pot: result.pot,
      last_turn: serverTurn,
      updated_at: new Date().toISOString(),
    })
    .eq("id", game.id);

  return serverTurn;
}

/**
 * Called by the active player AFTER their local animation finishes.
 * Advances current_seat to the next active player (or sets winner/finished).
 *
 * Re-fetches authoritative game + players from the DB before deciding, so a
 * stale snapshot on the caller can't cause a missed or false winner.
 */
export async function endTurnRemote(opts: {
  gameId: string;
  /** Caller-provided fallback if the re-fetch fails — used purely for seat math */
  players?: PlayerRow[];
  /** Caller-provided fallback. Re-fetched authoritative values take precedence. */
  currentSeat?: number;
  currentRound?: number;
}) {
  const sb = getSupabase();

  const [gameRes, playersRes] = await Promise.all([
    sb.from("ptb_games").select("*").eq("id", opts.gameId).maybeSingle<GameRow>(),
    sb.from("ptb_players").select("*").eq("game_id", opts.gameId).order("seat"),
  ]);

  const freshGame = gameRes.data;
  const freshPlayers = ((playersRes.data as PlayerRow[]) ?? []).slice();
  const sorted = freshPlayers.length
    ? freshPlayers.sort((a, b) => a.seat - b.seat)
    : (opts.players ?? []).slice().sort((a, b) => a.seat - b.seat);
  const n = sorted.length;
  if (n === 0) return;

  const localShape = sorted.map((p) => ({
    id: p.id,
    name: p.display_name,
    bucks: p.bucks,
    eliminated: false,
    color: p.color,
    order: p.seat,
  }));
  const winner = checkWinner(localShape);

  if (winner) {
    await sb
      .from("ptb_games")
      .update({
        status: "finished",
        winner_player_id: winner.id,
        last_turn: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", opts.gameId);
    return;
  }

  const currentSeat = freshGame?.current_seat ?? opts.currentSeat ?? 0;
  const currentRound = freshGame?.round ?? opts.currentRound ?? 1;
  const currentIdxInSorted = sorted.findIndex((p) => p.seat === currentSeat);
  const safeCurrentIdx = currentIdxInSorted >= 0 ? currentIdxInSorted : 0;
  const nextIdx = getNextActivePlayer(localShape, safeCurrentIdx);
  const nextSeat = sorted[nextIdx]?.seat ?? (currentSeat + 1) % n;
  const nextRound = nextSeat <= currentSeat ? currentRound + 1 : currentRound;

  // Compare-and-swap on `current_seat` so two simultaneous callers (e.g. the
  // 0-buck player's auto-skip and another player tapping "Skip Them") can't
  // each advance the seat — only the caller whose snapshot still matches
  // wins. The loser's UPDATE matches no rows and is a silent no-op.
  await sb
    .from("ptb_games")
    .update({
      current_seat: nextSeat,
      round: nextRound,
      last_turn: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.gameId)
    .eq("current_seat", currentSeat);
}

/**
 * Credit eyeBucks to signed-in players based on game mode and outcome.
 * Server-side function is idempotent — multiple devices calling this in
 * parallel settle exactly once. Safe to call any time the client thinks a
 * game has finished; the server short-circuits if status != 'finished' or
 * if it's already settled.
 */
export async function settleGameRewards(gameId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.rpc("ptb_settle_game", { p_game_id: gameId });
  if (error) throw new Error(error.message);
}
