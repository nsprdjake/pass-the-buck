"use client";

import { getSupabase } from "./supabase";

export type LeaderboardRow = {
  user_id: string;
  display_name: string | null;
  color: string | null;
  active_theme_slug: string;
  avatar_url?: string | null;
  value: number; // the metric for this board (balance, pot, streak, games)
};

export type BoardKey = "richest" | "biggest_pot" | "longest_streak" | "most_games";
export type BoardScope = "global" | "friends";

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
  avatar_url: string | null;
  ptb_stats: {
    biggest_pot: number;
    longest_streak: number;
    games_played: number;
  }[] | null;
};

/**
 * Pull the friend-set for a given user. Returns the OTHER user id in each
 * pair, filtered by the hidden_by_* flag so a user can quietly drop a
 * friend from their view. Throws if not signed in.
 */
export async function fetchFriendUserIds(userId: string): Promise<Set<string>> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ptb_friends")
    .select("user_a, user_b, hidden_by_a, hidden_by_b")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);
  if (error) throw new Error(error.message);
  const out = new Set<string>();
  for (const row of (data ?? []) as Array<{
    user_a: string;
    user_b: string;
    hidden_by_a: boolean;
    hidden_by_b: boolean;
  }>) {
    if (row.user_a === userId) {
      if (!row.hidden_by_a) out.add(row.user_b);
    } else {
      if (!row.hidden_by_b) out.add(row.user_a);
    }
  }
  // The viewer always appears on their own friends board so they can see
  // where they stand.
  out.add(userId);
  return out;
}

/**
 * Fetch the top N for any board, optionally scoped to a user's friends.
 * We do one big join + sort client-side so we don't need separate queries
 * per metric. Dataset stays small while the player pool is small.
 *
 * For friend scope we pull the viewer's friend set first, then filter
 * in-memory. When the pool grows past a few hundred this should move to
 * a server-side view.
 */
export async function fetchLeaderboard(
  board: BoardKey,
  limit = 10,
  opts: { scope?: BoardScope; viewerId?: string | null } = {}
): Promise<LeaderboardRow[]> {
  const { scope = "global", viewerId = null } = opts;
  const sb = getSupabase();

  let friendSet: Set<string> | null = null;
  if (scope === "friends") {
    if (!viewerId) return [];
    friendSet = await fetchFriendUserIds(viewerId);
    if (friendSet.size === 0) return [];
  }

  const { data, error } = await sb
    .from("ptb_profiles")
    .select(
      "id, display_name, color, active_theme_slug, balance, avatar_url, ptb_stats!ptb_stats_user_id_fkey(biggest_pot, longest_streak, games_played)"
    );
  if (error) throw new Error(error.message);

  const rows: LeaderboardRow[] = ((data as unknown as ProfileJoin[]) ?? [])
    .filter((p) => (friendSet ? friendSet.has(p.id) : true))
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
        avatar_url: p.avatar_url,
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
