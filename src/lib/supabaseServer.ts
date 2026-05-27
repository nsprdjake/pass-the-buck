import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Build a Supabase client for a route handler. The user's JWT (forwarded
 * in the Authorization header) is attached so RPCs see the right
 * auth.uid() and RLS works correctly.
 *
 * Usage:
 *
 *   const accessToken = req.headers.get("authorization")?.split(" ")[1];
 *   const sb = createServerClient(accessToken);
 *   await sb.rpc(...);
 *
 * Never use the service-role key here — these handlers run on behalf of
 * the user, not as the platform.
 */
export function createServerClient(accessToken?: string | null): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : {},
  });
}
