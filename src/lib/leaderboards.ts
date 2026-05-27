"use client";

import { getSupabase } from "./supabase";

export type LeaderboardRow = {
  user_id: string;
  display_name: string | null;
  color: string | null;
  active_theme_slug: string;
  value: number; // the metric for this board (balance, pot, streak, games)
};

export type BoardKey = "richest" | "biggest_pot" | "longest_streak" | "most_games";

export const BOARD_META: Record<
  BoardKey,
  { label: string; subtitle: string; valueLabel: string; valueSuffix?: string }
> = {
  richest: {
    label: "Richest in the Saloon",
    subtitle: "Most eyeBucks on hand right now",
    valueLabel: "eyeBucks",
  },
  biggest_pot: {
    label: "Biggest Pot Pulled",
    subtitle: "Single largest haul",
    valueLabel: "eyeBucks",
  },
  longest_streak: {
    label: "Longest Win Streak",
    subtitle: "Most consecutive wins ever",
    valueLabel: "wins",
  },
  most_games: {
    label: "Most Hands Played",
    subtitle: "Hardest-working rider",
    valueLabel: "hands",
  },
};

type ProfileJoin = {
  id: string;
  display_name: string | null;
  color: string | null;
  active_theme_slug: string;
  balance: number;
  ptb_stats: {
    biggest_pot: number;
    longest_streak: number;
    games_played: number;
  }[] | null;
};

/**
 * Fetch the top N for any board. We do one big join + sort client-side
 * so we don't need four different queries. The dataset stays tiny while
 * the player pool is small; if it grows we'll move to dedicated views.
 */
export async function fetchLeaderboard(
  board: BoardKey,
  limit = 10
): Promise<LeaderboardRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ptb_profiles")
    .select(
      "id, display_name, color, active_theme_slug, balance, ptb_stats!ptb_stats_user_id_fkey(biggest_pot, longest_streak, games_played)"
    );
  if (error) throw new Error(error.message);

  const rows: LeaderboardRow[] = ((data as unknown as ProfileJoin[]) ?? [])
    .map((p) => {
      const s = p.ptb_stats?.[0] ?? {
        biggest_pot: 0,
        longest_streak: 0,
        games_played: 0,
      };
      let value: number;
      switch (board) {
        case "richest":
          value = p.balance ?? 0;
          break;
        case "biggest_pot":
          value = s.biggest_pot;
          break;
        case "longest_streak":
          value = s.longest_streak;
          break;
        case "most_games":
          value = s.games_played;
          break;
      }
      return {
        user_id: p.id,
        display_name: p.display_name,
        color: p.color,
        active_theme_slug: p.active_theme_slug,
        value,
      };
    })
    // Filter out users who haven't engaged at all — except for the richest
    // board, where the starter balance of 100 still counts.
    .filter((r) => (board === "richest" ? true : r.value > 0))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  return rows;
}
