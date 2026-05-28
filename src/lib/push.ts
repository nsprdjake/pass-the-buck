"use client";

import { ensurePushSubscription, type StoredSubscription } from "./notifications";
import { getSupabase } from "./supabase";

/**
 * Glue between the browser PushManager and our Supabase storage.
 *
 * - syncPushSubscriptionFor(userId) — make sure the current device has a
 *   live push subscription and that row exists in ptb_push_subscriptions.
 *   Safe to call any number of times; the underlying APIs short-circuit.
 *
 * - notifyNudge(...) — fire-and-forget invocation of the nudge-push edge
 *   function from the sender's device so target devices get an OS-level
 *   push even if their tab is closed.
 */

let syncedFor: string | null = null;

export async function syncPushSubscriptionFor(userId: string): Promise<void> {
  if (!userId) return;
  // Don't repeat the upsert for the same user in the same page lifetime.
  if (syncedFor === userId) return;
  const sub: StoredSubscription | null = await ensurePushSubscription();
  if (!sub) return;
  const sb = getSupabase();
  try {
    await sb
      .from("ptb_push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : null,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );
    syncedFor = userId;
  } catch {
    // ignore — fall through to the in-app + active-tab Notification path
  }
}

/** Reset the in-page cache on sign-out so the next user gets their own upsert. */
export function resetPushSync() {
  syncedFor = null;
}

export type NudgeNotifyPayload = {
  gameId: string;
  toSeat: number;
  fromName: string;
  fromColor: string;
};

/**
 * POST to the nudge-push edge function so the target's other devices get
 * a Web Push delivered by the OS even when their tab is closed. Failures
 * are swallowed — push is best-effort and the realtime broadcast still
 * handles the in-app case.
 */
export async function notifyNudge(payload: NudgeNotifyPayload): Promise<void> {
  const sb = getSupabase();
  try {
    await sb.functions.invoke("nudge-push", { body: payload });
  } catch {
    // ignore
  }
}
