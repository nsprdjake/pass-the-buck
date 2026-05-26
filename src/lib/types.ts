export type GameStatus = "waiting" | "active" | "finished";

export type RollOutcome = "left" | "center" | "right" | "keep";

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
}

export interface Turn {
  id: string;
  game_id: string;
  player_id: string;
  round: number;
  outcomes: RollOutcome[];
  created_at: string;
}
