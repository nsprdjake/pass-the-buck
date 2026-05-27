"use client";

import { getSupabase } from "./supabase";

export type ThemeRow = {
  slug: string;
  name: string;
  tagline: string | null;
  price_eyebucks: number;
  sort_order: number;
  is_default: boolean;
};

export type OwnedTheme = {
  theme_slug: string;
  unlocked_at: string;
};

/**
 * Visual preview palette for each theme. These are display-only — they
 * power the thumbnail swatches on the theme picker. The Saloon theme is
 * what the rest of the app currently uses; other themes are reserved for
 * future visual rollouts. Until then, picking one is a status signal
 * (visible on profile) without actually re-skinning the whole app.
 */
export const THEME_PREVIEW: Record<
  string,
  { swatches: string[]; bg: string }
> = {
  saloon: {
    bg: "#0a4d33",
    swatches: ["#ffd17a", "#c99a33", "#f4e4b7", "#5c3b1e"],
  },
  speakeasy: {
    bg: "#0d2820",
    swatches: ["#e8c468", "#16876a", "#f6efd7", "#1a1410"],
  },
  cantina: {
    bg: "#5e1a0e",
    swatches: ["#ff9b3c", "#3aa6a0", "#ffe6c2", "#2a0a04"],
  },
  "old-money": {
    bg: "#10182a",
    swatches: ["#c9a059", "#7a1f2e", "#f0e6d2", "#0a0e1a"],
  },
  riverboat: {
    bg: "#1a242c",
    swatches: ["#c5a572", "#3a5566", "#dfd5c0", "#0d141a"],
  },
};

export async function listThemes(): Promise<ThemeRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ptb_themes")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as ThemeRow[];
}

export async function listOwnedThemes(userId: string): Promise<OwnedTheme[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ptb_owned_themes")
    .select("theme_slug, unlocked_at")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as OwnedTheme[];
}

/**
 * Purchase a theme. Returns nothing — caller should refresh profile +
 * owned-themes after a successful call. Server-side function locks the
 * balance row, deducts, and inserts ownership atomically.
 */
export async function purchaseTheme(slug: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.rpc("ptb_buy_theme", { p_slug: slug });
  if (error) throw new Error(prettifyPurchaseError(error.message));
}

/** Set the user's active theme. */
export async function setActiveTheme(slug: string): Promise<void> {
  const sb = getSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await sb
    .from("ptb_profiles")
    .update({
      active_theme_slug: slug,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
}

function prettifyPurchaseError(msg: string): string {
  const lc = msg.toLowerCase();
  if (lc.includes("not enough eyebucks")) return "Not enough eyeBucks for that.";
  if (lc.includes("not signed in")) return "Sign in first, partner.";
  return msg;
}
