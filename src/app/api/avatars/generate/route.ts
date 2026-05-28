import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createServerClient } from "@/lib/supabaseServer";

// Avatar generation runs server-side because (1) OPENAI_API_KEY must stay
// secret and (2) we need to atomically charge eyeBucks via an RPC before
// hitting OpenAI. The flow:
//
//   1. Validate session + style + photo
//   2. ptb_charge_avatar       (deducts 200 eB, throws if poor)
//   3. POST /v1/images/edits   (returns base64 png)
//   4. Upload to Storage      (avatars/<user_id>/<uuid>.png)
//   5. Insert into ptb_avatars + update profile.avatar_url
//   6. On step 3-5 error: ptb_refund_avatar then surface the error.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AVATAR_COST = 200; // keep in sync with ptb_charge_avatar()

export async function POST(req: Request): Promise<Response> {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not set on the server. Add it to .env.local and restart to enable avatar generation.",
      },
      { status: 503 }
    );
  }

  const accessToken = req.headers.get("authorization")?.split(" ")[1];
  if (!accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form-data" }, { status: 400 });
  }

  const photo = form.get("photo");
  const styleSlug = form.get("style");
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "Photo is required" }, { status: 400 });
  }
  if (typeof styleSlug !== "string" || !styleSlug) {
    return NextResponse.json({ error: "Style is required" }, { status: 400 });
  }
  if (photo.size > 8 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Photo too large — keep it under 8 MB" },
      { status: 413 }
    );
  }

  const sb = createServerClient(accessToken);

  // Pull who we are + the style row. Both reads run under RLS.
  const [{ data: { user } }, styleRes] = await Promise.all([
    sb.auth.getUser(),
    sb.from("ptb_avatar_styles").select("slug, prompt_suffix").eq("slug", styleSlug).eq("is_active", true).maybeSingle(),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }
  if (!styleRes.data) {
    return NextResponse.json({ error: "Unknown style" }, { status: 400 });
  }
  const promptSuffix = styleRes.data.prompt_suffix as string;
  const userId = user.id;

  // 1. Charge atomically. RPC throws on insufficient balance.
  const chargeRes = await sb.rpc("ptb_charge_avatar");
  if (chargeRes.error) {
    const msg = chargeRes.error.message ?? "Could not charge";
    return NextResponse.json(
      {
        error: msg.toLowerCase().includes("not enough")
          ? `You need ${AVATAR_COST} eyeBucks for a portrait.`
          : msg,
      },
      { status: 402 }
    );
  }

  // From this point on, any failure MUST refund. Wrap in try/catch.
  try {
    // 2. Call OpenAI image edits with the photo + style prompt.
    const oaForm = new FormData();
    oaForm.append("model", "gpt-image-1");
    oaForm.append("image", photo, photo.name || "photo.png");
    oaForm.append(
      "prompt",
      `A portrait of the person in the photo, rendered ${promptSuffix}. Head and shoulders, centered, clean background, square 1:1 format. Keep the person clearly recognizable.`
    );
    oaForm.append("size", "1024x1024");
    oaForm.append("n", "1");

    const oaRes = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: oaForm,
    });

    if (!oaRes.ok) {
      const text = await oaRes.text();
      throw new Error(
        `OpenAI ${oaRes.status}: ${text.slice(0, 300)}`
      );
    }

    const oaJson = (await oaRes.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const first = oaJson.data?.[0];
    let imageBytes: Uint8Array;
    if (first?.b64_json) {
      imageBytes = Uint8Array.from(Buffer.from(first.b64_json, "base64"));
    } else if (first?.url) {
      const r = await fetch(first.url);
      if (!r.ok) throw new Error(`Failed to fetch generated image`);
      imageBytes = new Uint8Array(await r.arrayBuffer());
    } else {
      throw new Error("OpenAI returned no image");
    }

    // 3. Upload to Supabase Storage.
    const fileId = randomUUID();
    const storagePath = `${userId}/${fileId}.png`;
    const uploadRes = await sb.storage
      .from("avatars")
      .upload(storagePath, imageBytes, {
        contentType: "image/png",
        upsert: false,
      });
    if (uploadRes.error) throw new Error(`Upload failed: ${uploadRes.error.message}`);

    const { data: pub } = sb.storage.from("avatars").getPublicUrl(storagePath);
    const publicUrl = pub.publicUrl;

    // 4. Record + flip profile pointer.
    const [{ error: insErr }, { error: updErr }] = await Promise.all([
      sb.from("ptb_avatars").insert({
        user_id: userId,
        style_slug: styleSlug,
        image_url: publicUrl,
        cost_eyebucks: AVATAR_COST,
      }),
      sb
        .from("ptb_profiles")
        .update({
          avatar_url: publicUrl,
          avatar_style: styleSlug,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId),
    ]);
    if (insErr) throw new Error(`History insert failed: ${insErr.message}`);
    if (updErr) throw new Error(`Profile update failed: ${updErr.message}`);

    // 5. Return what the client needs to refresh.
    const { data: profile } = await sb
      .from("ptb_profiles")
      .select("balance")
      .eq("id", userId)
      .maybeSingle();

    return NextResponse.json({
      url: publicUrl,
      balance: profile?.balance ?? null,
      style: styleSlug,
    });
  } catch (e) {
    // Refund the charge so the user isn't penalized for our outage.
    await sb.rpc("ptb_refund_avatar");
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json(
      { error: `${message} — eyeBucks refunded.` },
      { status: 502 }
    );
  }
}
