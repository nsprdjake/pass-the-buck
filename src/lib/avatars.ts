"use client";

import { getSupabase } from "./supabase";

export type AvatarStyle = {
  slug: string;
  name: string;
  prompt_suffix: string;
  sort_order: number;
  is_active: boolean;
};

export type AvatarRow = {
  id: string;
  user_id: string;
  style_slug: string;
  image_url: string;
  cost_eyebucks: number;
  created_at: string;
};

export type GenerateResult = {
  url: string;
  balance: number | null;
  style: string;
};

export const AVATAR_COST = 200;

export async function listAvatarStyles(): Promise<AvatarStyle[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ptb_avatar_styles")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as AvatarStyle[];
}

export async function listMyAvatars(userId: string): Promise<AvatarRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ptb_avatars")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) throw new Error(error.message);
  return (data ?? []) as AvatarRow[];
}

/**
 * Send the photo + chosen style to the server route, which charges 200
 * eyeBucks atomically before calling OpenAI. Returns the new public URL.
 *
 * Throws with a user-friendly message on any non-2xx response.
 */
export async function generateAvatar(opts: {
  photo: File;
  styleSlug: string;
}): Promise<GenerateResult> {
  const sb = getSupabase();
  const { data: sess } = await sb.auth.getSession();
  const accessToken = sess.session?.access_token;
  if (!accessToken) throw new Error("Sign in first.");

  const form = new FormData();
  form.append("photo", opts.photo);
  form.append("style", opts.styleSlug);

  const res = await fetch("/api/avatars/generate", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!res.ok) {
    let msg = `Generation failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      // ignore — keep default
    }
    throw new Error(msg);
  }
  return (await res.json()) as GenerateResult;
}

/**
 * Re-equip a past generation — flips profile.avatar_url back to one of
 * the rows in the user's gallery without spending eyeBucks.
 */
export async function setActiveAvatar(opts: {
  imageUrl: string;
  styleSlug: string;
}): Promise<void> {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Sign in first.");
  const { error } = await sb
    .from("ptb_profiles")
    .update({
      avatar_url: opts.imageUrl,
      avatar_style: opts.styleSlug,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
}

export async function clearActiveAvatar(): Promise<void> {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Sign in first.");
  const { error } = await sb
    .from("ptb_profiles")
    .update({
      avatar_url: null,
      avatar_style: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
}
