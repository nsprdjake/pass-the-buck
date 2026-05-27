"use client";

import { PLAYER_COLORS } from "./constants";
import { applyTurn, checkWinner, rollTurn } from "./game-logic";
import { getDeviceId, getMembership, makeToken, saveMembership } from "./identity";
import { getSupabase } from "./supabase";
import type { GameMode, RollOutcome } from "./types";

// === Row shapes (matches migrations 002 + 003) ===
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
  /** "winner" or "loser" — added in migration 003. Old rows backfilled to "winner". */
  mode: GameMode;
  /** Optional free-text wager, e.g. "Loser buys dinner". */
  wager: string | null;
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
  /** Optional auth.user.id — populated when the joining device was signed in. */
  user_id: string | null;
};

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

// =================================================================
// Helpers
// =================================================================

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

// =================================================================
// Game lifecycle (server-side mutations)
// =================================================================

/**
 * Create a new game, then add the host as the first player.
 */
export async function createGame(opts: {
  displayName: string;
  buyIn: number;
  mode?: GameMode;
  wager?: string | null;
  /** Optional auth.user.id — set when the host is signed in. */
  userId?: string | null;
  /** Override the seat-derived color. Used to respect a signed-in user's
   *  profile color. Falls back to PLAYER_COLORS[0] if not provided. */
  color?: string | null;
}): Promise<{ game: GameRow; me: PlayerRow }> {
  const sb = getSupabase();
  const deviceId = getDeviceId();
  const hostToken = makeToken();
  const mode: GameMode = opts.mode ?? "winner";
  const wagerTrimmed = (opts.wager ?? "").trim().slice(0, 80);
  const wager = wagerTrimmed === "" ? null : wagerTrimmed;
  const hostUserId = opts.userId ?? null;

  // Generate codes until we get a unique one (retry a few times).
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
    // continue on unique-constraint conflict; throw otherwise
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

/**
 * Look up a game by code. Throws if not found.
 */
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

/**
 * Join a game as a new player.
 */
export async function joinGame(opts: {
  code: string;
  displayName: string;
  /** Optional auth.user.id — set when the joining device is signed in. */
  userId?: string | null;
  /** Override the seat-derived color (signed-in user's profile color). */
  color?: string | null;
}): Promise<{ game: GameRow; me: PlayerRow }> {
  const sb = getSupabase();
  const deviceId = getDeviceId();
  const userId = opts.userId ?? null;
  const game = await findGame(opts.code);
  if (game.status !== "lobby") {
    // Allow rejoin if this device already has a row in this game
    const { data: existing } = await sb
      .from("ptb_players")
      .select("*")
      .eq("game_id", game.id)
      .eq("device_id", deviceId)
      .maybeSingle<PlayerRow>();
    if (existing) return { game, me: existing };
    throw new Error("Game already started — can't join now");
  }

  // If this device is already in the game, just return it
  const { data: existing } = await sb
    .from("ptb_players")
    .select("*")
    .eq("game_id", game.id)
    .eq("device_id", deviceId)
    .maybeSingle<PlayerRow>();
  if (existing) {
    return { game, me: existing };
  }

  // Find next seat AND collect every color already in use so we can
  // assign one that doesn't collide with another player.
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
    // Preferred color is free — use it.
    assignedColor = opts.color;
  } else {
    // Either no preference or it's taken. Walk PLAYER_COLORS for the first
    // free slot. Falls back to the seat-derived color if all 12 are taken
    // (impossible at the moment given max-players = 12, but safe anyway).
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
  // Look up the game first so we can clean it up if this was the last player
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

  // Only auto-clean lobbies. If a game is already active or finished we
  // leave the row so other players can still see the final state.
  if (gameRow?.status === "lobby" && (remaining ?? 0) === 0) {
    await sb.from("ptb_games").delete().eq("id", removed.game_id);
  }
}

/**
 * Host starts the game — deal buy-in bucks to every player, set status=active.
 */
export async function startGame(opts: { gameId: string; buyIn: number }) {
  const sb = getSupabase();
  // Set every player's bucks to buy_in
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
 * Does NOT advance current_seat; that happens in `endTurn` after the
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

  // Compute resulting bucks + pot using the shared helper. We need to map
  // server players to the Player shape that applyTurn expects.
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

  // Insert turn record
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

  // Persist bucks per player (one update per row — they're indexed by PK)
  for (const p of result.players) {
    const before = sorted.find((s) => s.id === p.id);
    if (before && before.bucks === p.bucks) continue;
    await sb.from("ptb_players").update({ bucks: p.bucks }).eq("id", p.id);
  }

  // Update game pot + last_turn so observers can pick up the animation
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
 * Re-fetches the authoritative game + players from the DB before deciding,
 * so an out-of-date snapshot on the caller can't cause a missed or false
 * winner detection.
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

  // Re-fetch the authoritative state. We use this for the winner check
  // because local realtime state could be stale.
  const [gameRes, playersRes] = await Promise.all([
    sb.from("ptb_games").select("*").eq("id", opts.gameId).maybeSingle<GameRow>(),
    sb.from("ptb_players").select("*").eq("game_id", opts.gameId).order("seat"),
  ]);

  const freshGame = gameRes.data;
  const freshPlayers = ((playersRes.data as PlayerRow[]) ?? []).slice();
  // If the fetch failed for any reason, fall back to whatever the caller knew.
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
  const nextSeat = (currentSeat + 1) % n;
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
 * Skip a 0-buck active player by advancing the seat. Same as endTurnRemote
 * but doesn't require an animation to have run.
 */
export async function skipTurnRemote(opts: {
  gameId: string;
  players: PlayerRow[];
  currentSeat: number;
  currentRound: number;
}) {
  await endTurnRemote(opts);
}

/**
 * Credit eyeBucks to signed-in players based on the game's mode and outcome.
 * Idempotent on the server side — multiple devices calling this in parallel
 * settle exactly once. Safe to call any time the client thinks a game has
 * finished; the server short-circuits if status != 'finished' or if it's
 * already settled.
 *
 *   winner mode → champion gets (num_players × buy_in) eyeBucks
 *   loser mode  → every non-loser gets (buy_in) eyeBucks as a survival bonus
 */
export async function settleGameRewards(gameId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.rpc("ptb_settle_game", { p_game_id: gameId });
  if (error) throw new Error(error.message);
}
