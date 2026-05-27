// nudge-push — sends a Web Push notification to every registered device
// belonging to the player currently sitting at a given seat in a given game.
//
// Called fire-and-forget from the client when someone hits "Nudge". The
// realtime broadcast still handles the in-app flash for connected tabs;
// this edge function picks up the slack for backgrounded / closed tabs.
//
// Required secrets (set in Supabase dashboard → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY     — same base64url key the client uses to subscribe
//   VAPID_PRIVATE_KEY    — keep private; never expose to client code
//   VAPID_SUBJECT        — mailto:you@example.com (web-push spec)
//
// Auto-injected by Supabase:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

type NudgePayload = {
  gameId: string;
  toSeat: number;
  fromName: string;
  fromColor: string;
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hi@nsprd.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(
      JSON.stringify({ error: "Push not configured (missing VAPID keys)" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  let body: NudgePayload;
  try {
    body = (await req.json()) as NudgePayload;
  } catch {
    return new Response(JSON.stringify({ error: "Bad JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { gameId, toSeat, fromName, fromColor } = body ?? {};
  if (!gameId || typeof toSeat !== "number" || !fromName) {
    return new Response(JSON.stringify({ error: "Missing fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Find the player at the target seat in this game.
  const { data: target, error: playerErr } = await admin
    .from("ptb_players")
    .select("user_id, display_name")
    .eq("game_id", gameId)
    .eq("seat", toSeat)
    .maybeSingle();

  if (playerErr) {
    return new Response(JSON.stringify({ error: playerErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!target || !target.user_id) {
    // Anonymous target — no push possible. Realtime broadcast still
    // covers them in-app.
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: "anon" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch every subscription belonging to that user.
  const { data: subs, error: subsErr } = await admin
    .from("ptb_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", target.user_id);
  if (subsErr) {
    return new Response(JSON.stringify({ error: subsErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no-subs" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = JSON.stringify({
    title: "Your turn at the saloon",
    body: `${fromName} is calling you over to roll.`,
    url: `/multi/${gameId}`,
    tag: `ptb-nudge-${gameId}`,
    fromColor,
  });

  const expiredEndpoints: string[] = [];
  let sent = 0;

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload,
          { TTL: 60 }
        );
        sent++;
      } catch (e: unknown) {
        // 404 / 410 from the push service means the subscription is dead —
        // mark it for cleanup so we don't keep retrying.
        const statusCode =
          (e && typeof e === "object" && "statusCode" in e
            ? (e as { statusCode?: number }).statusCode
            : undefined) ?? 0;
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(s.endpoint);
        }
      }
    })
  );

  if (expiredEndpoints.length > 0) {
    await admin
      .from("ptb_push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
  }

  return new Response(
    JSON.stringify({ ok: true, sent, pruned: expiredEndpoints.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
