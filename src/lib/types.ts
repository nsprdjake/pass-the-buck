export type GameStatus = "waiting" | "active" | "finished";

export type RollOutcome = "left" | "center" | "right" | "keep";

/**
 * Game mode controls how the end of the game is framed.
 *
 * - "winner" — last player with bucks wins the pot (default; existing behavior).
 * - "loser"  — same mechanics, flipped framing: last player with bucks is
 *             "stuck with the tab" and owes the wager. Strategy inverts:
 *             players root for L/R/C rolls instead of ✱.
 */
export type GameMode = "winner" | "loser";

export interface Player {
  id: string;
  name: string;
  bucks: number;
  eliminated: boolean;
  color: string;
  order: number;
}

export interface Game {
  id: string;
  invite_code: string;
  status: GameStatus;
  host_id: string;
  buy_in: number;
  pot: number;
  current_player_idx: number;
  round: number;
  turn_timer: number | null;
  players: Player[];
  created_at: string;
  mode: GameMode;
  wager: string | null;
}

export interface Turn {
  id: string;
  game_id: string;
  player_id: string;
  round: number;
  outcomes: RollOutcome[];
  created_at: string;
}
