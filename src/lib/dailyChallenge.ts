/**
 * Seven daily-challenge cards rotated by day of week.
 *
 * Lightweight, fully client-side for v1 — no backend tracking, no special
 * rewards beyond what the regular game settle already grants. Purely a
 * "today's a special table" prompt to seed engagement and give players
 * something to react to whenever they pop in.
 *
 * The challenge surface knows about a suggested mode + wager + buy-in,
 * which the landing-page pill passes through to /multi/create via URL
 * params so the host can deal in one tap.
 *
 * Future: move this to a server-side rotation or scheduled events. For
 * now the deterministic day-of-week pick is good enough.
 */

import type { GameMode } from "./types";

export type DailyChallenge = {
  /** Day index 0-6 (Sunday-Saturday) — matches Date#getDay(). */
  dayIndex: number;
  title: string;
  blurb: string;
  mode: GameMode;
  wager: string;
  buyIn?: number; // suggested in winner mode; ignored in loser mode
  emoji: string;
};

const CHALLENGES: DailyChallenge[] = [
  {
    dayIndex: 0,
    title: "Sunday Best",
    blurb: "End the weekend with a wager.",
    mode: "loser",
    wager: "Loser does the dishes",
    emoji: "🍽️",
  },
  {
    dayIndex: 1,
    title: "Monday Sundowner",
    blurb: "Settle the week's tab.",
    mode: "loser",
    wager: "Loser closes the tab",
    emoji: "🌅",
  },
  {
    dayIndex: 2,
    title: "Sharp Tuesday",
    blurb: "Pot's worth the climb today.",
    mode: "winner",
    wager: "Winner picks the next watering hole",
    buyIn: 5,
    emoji: "🎯",
  },
  {
    dayIndex: 3,
    title: "Hump-Day Heist",
    blurb: "Halfway home — somebody pays.",
    mode: "loser",
    wager: "Loser buys lunch tomorrow",
    emoji: "🪙",
  },
  {
    dayIndex: 4,
    title: "Lucky Seven",
    blurb: "Seven eyeBucks deep, winner takes all.",
    mode: "winner",
    wager: "Winner gets bragging rights",
    buyIn: 7,
    emoji: "🍀",
  },
  {
    dayIndex: 5,
    title: "Friday Wagon Train",
    blurb: "Whoever holds last drives the weekend.",
    mode: "loser",
    wager: "Loser is the designated driver",
    emoji: "🚂",
  },
  {
    dayIndex: 6,
    title: "Saturday Showdown",
    blurb: "Biggest pot of the week.",
    mode: "winner",
    wager: "Winner takes the round",
    buyIn: 9,
    emoji: "🌵",
  },
];

export function todaysChallenge(now: Date = new Date()): DailyChallenge {
  return CHALLENGES[now.getDay()];
}

/** Encode the challenge into a /multi/create query string the page can read. */
export function challengeQueryString(c: DailyChallenge): string {
  const p = new URLSearchParams();
  p.set("mode", c.mode);
  p.set("wager", c.wager);
  if (c.mode === "winner" && c.buyIn) p.set("buyIn", String(c.buyIn));
  p.set("from", "daily");
  return `?${p.toString()}`;
}
