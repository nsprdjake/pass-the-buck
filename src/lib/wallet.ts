"use client";

import { getSupabase } from "./supabase";

export type EyebuckBundle = {
  id: string;
  label: string;
  tagline: string | null;
  price_cents: number;
  amount_eyebucks: number;
  sort_order: number;
  is_active: boolean;
};

/**
 * Bundles available for top-up. Pulled from the catalog table so we can
 * change pricing without redeploying the client.
 */
export async function listBundles(): Promise<EyebuckBundle[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ptb_eyebucks_bundles")
    .select("id, label, tagline, price_cents, amount_eyebucks, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as EyebuckBundle[];
}

export type PurchaseResult = {
  purchaseId: string;
  newBalance: number;
  amountEyebucks: number;
};

/**
 * TEST-MODE top-up. Credits eyeBucks without taking real money. The
 * `status` column on the purchase row is stamped 'test' so we can
 * distinguish from future real Stripe-backed purchases (status =
 * 'pending' → 'complete').
 *
 * When wiring real payments later: replace this call with a fetch to a
 * server route that creates a Stripe Checkout session. The webhook
 * handler then inserts the purchase row and credits the balance.
 */
export async function testPurchaseBundle(
  bundleId: string
): Promise<PurchaseResult> {
  const sb = getSupabase();
  const { data, error } = await sb.rpc("ptb_test_purchase_bundle", {
    p_bundle_id: bundleId,
  });
  if (error) throw new Error(prettifyPurchaseError(error.message));
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("No purchase row returned");
  return {
    purchaseId: row.purchase_id as string,
    newBalance: row.new_balance as number,
    amountEyebucks: row.amount_eyebucks as number,
  };
}

export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

/**
 * "X eyeBucks per $1" rate — useful as a transparency label so people
 * can see the bigger packs deliver more value.
 */
export function bucksPerDollar(b: EyebuckBundle): number {
  return Math.round((b.amount_eyebucks / b.price_cents) * 100);
}

function prettifyPurchaseError(msg: string): string {
  const lc = msg.toLowerCase();
  if (lc.includes("not signed in")) return "Sign in first, partner.";
  if (lc.includes("unknown or inactive bundle"))
    return "That bundle isn't available right now.";
  return msg;
}
