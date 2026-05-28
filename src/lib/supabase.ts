"use client";

import { getSupabaseBrowserClient } from "./supabase/client";

/**
 * Legacy alias for the browser Supabase client. Older code paths (libs,
 * AuthContext, profile features) import `getSupabase()`; the modern code
 * uses `getSupabaseBrowserClient()`. Both must return the same instance
 * so they share a single auth session/storage.
 */
export function getSupabase() {
  return getSupabaseBrowserClient();
}
