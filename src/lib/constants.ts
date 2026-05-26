import type { RollOutcome } from "./types";

export const BRAND_COLORS = {
  buckGreen: "#10B981",
  buckDark: "#1A1A2E",
  buckDarker: "#12122A",
  buckCard: "#242444",
  buckGold: "#FBBF24",
  buckCoral: "#F97066",
  buckBlue: "#60A5FA",
} as const;

export const OUTCOMES: RollOutcome[] = [
  "left",
  "center",
  "right",
  "keep",
  "keep",
  "keep",
];

export const MAX_PLAYERS = 12;
export const MIN_PLAYERS = 3;
export const STARTING_BALANCE = 9;

export const PLAYER_COLORS = [
  "#10B981",
  "#60A5FA",
  "#FBBF24",
  "#F97066",
  "#A78BFA",
  "#F472B6",
  "#34D399",
  "#FB923C",
];
