"use client";

import { getSupabase } from "./supabase";

export type PowerupRow = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  price_eyebucks: number;
  effect_type:
    | "win_multiplier_1_5x"
    | "win_flat_bonus_25"
    | "consolation_25";
  sort_order: number;
};

export type OwnedPowerup = {
  slug: string;
  quantity: number;
};

export async function listPowerups(): Promise<PowerupRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ptb_powerups")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as PowerupRow[];
}

export async function listOwnedPowerups(userId: string): Promise<OwnedPowerup[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ptb_user_powerups")
    .select("slug, quantity")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as OwnedPowerup[];
}

export async function buyPowerup(slug: string, qty = 1): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.rpc("ptb_buy_powerup", { p_slug: slug, p_qty: qty });
  if (error) throw new Error(prettify(error.message));
}

export async function equipPowerup(slug: string | null): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.rpc("ptb_equip_powerup", { p_slug: slug });
  if (error) throw new Error(prettify(error.message));
}

function prettify(msg: string): string {
  const lc = msg.toLowerCase();
  if (lc.includes("not enough eyebucks")) return "Not enough eyeBucks.";
  if (lc.includes("not signed in")) return "Sign in first, partner.";
  if (lc.includes("you do not own")) return "You don't own this power-up yet.";
  return msg;
}
