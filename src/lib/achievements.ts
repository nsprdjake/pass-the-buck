"use client";

import { getSupabase } from "./supabase";

export type Achievement = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  reward_eyebucks: number;
  sort_order: number;
  hidden: boolean;
};

export type UserAchievement = {
  slug: string;
  awarded_at: string;
  seen: boolean;
};

/** Full catalog + per-user earned set. Used by the /profile list. */
export async function fetchAchievementsAndEarned(userId: string | null): Promise<{
  catalog: Achievement[];
  earned: Map<string, UserAchievement>;
}> {
  const sb = getSupabase();
  const [catalogRes, earnedRes] = await Promise.all([
    sb.from("ptb_achievements").select("*").order("sort_order"),
    userId
      ? sb
          .from("ptb_user_achievements")
          .select("slug, awarded_at, seen")
          .eq("user_id", userId)
      : Promise.resolve({ data: [] as UserAchievement[], error: null }),
  ]);
  if (catalogRes.error) throw new Error(catalogRes.error.message);
  const catalog = (catalogRes.data ?? []) as Achievement[];
  const earnedList = (earnedRes.data ?? []) as UserAchievement[];
  const earned = new Map<string, UserAchievement>();
  for (const e of earnedList) earned.set(e.slug, e);
  return { catalog, earned };
}

/** Just the unseen earned achievements, with their catalog info merged. */
export async function fetchUnseenAchievements(
  userId: string
): Promise<(Achievement & { awarded_at: string })[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ptb_user_achievements")
    .select(
      "slug, awarded_at, ptb_achievements!ptb_user_achievements_slug_fkey(slug, name, description, icon, reward_eyebucks, sort_order, hidden)"
    )
    .eq("user_id", userId)
    .eq("seen", false);
  if (error) throw new Error(error.message);
  type Row = {
    slug: string;
    awarded_at: string;
    ptb_achievements: Achievement | Achievement[] | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  return rows
    .map((r) => {
      const a = Array.isArray(r.ptb_achievements)
        ? r.ptb_achievements[0]
        : r.ptb_achievements;
      if (!a) return null;
      return { ...a, awarded_at: r.awarded_at };
    })
    .filter((x): x is Achievement & { awarded_at: string } => x !== null);
}

/** Mark unseen achievements as seen so the toast doesn't fire again. */
export async function markAchievementsSeen(
  userId: string,
  slugs: string[]
): Promise<void> {
  if (slugs.length === 0) return;
  const sb = getSupabase();
  await sb
    .from("ptb_user_achievements")
    .update({ seen: true })
    .eq("user_id", userId)
    .in("slug", slugs);
}
