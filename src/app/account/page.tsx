"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

const RYE: React.CSSProperties = {
  fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
};
const FELL: React.CSSProperties = {
  fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
};

export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useSupabaseUser();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth?next=/account");
  }, [loading, user, router]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await getSupabaseBrowserClient().auth.signOut();
      router.replace("/");
    } finally {
      setSigningOut(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="felt-saloon flex min-h-[100dvh] items-center justify-center">
        <div className="text-[var(--parchment-light)]/65" style={FELL}>
          Loading…
        </div>
      </main>
    );
  }

  const handle = handleFromEmail(user.email);
  const createdAt = user.created_at ? formatDate(user.created_at) : null;
  const lastSignIn = user.last_sign_in_at ? formatDate(user.last_sign_in_at) : null;

  return (
    <main className="felt-saloon relative min-h-[100dvh] overflow-hidden">
      <div
        aria-hidden
        className="wood-grain pointer-events-none absolute inset-x-0 top-0 h-3 shadow-[0_4px_14px_rgba(0,0,0,0.55)]"
      />
      <div
        aria-hidden
        className="wood-grain pointer-events-none absolute inset-x-0 bottom-0 h-3 shadow-[0_-4px_14px_rgba(0,0,0,0.55)]"
      />

      <div className="relative mx-auto max-w-sm px-6 pt-7 pb-12">
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center">
          <Link
            href="/"
            className="justify-self-start text-[0.78rem] font-bold text-[var(--parchment-light)]/75 transition-colors hover:text-[var(--accent-light)]"
            style={FELL}
          >
            ← Back
          </Link>
          <h1
            className="justify-self-center"
            style={{
              ...RYE,
              fontSize: "clamp(1.6rem, 6.5vw, 2.1rem)",
              color: "var(--parchment-light)",
              textShadow:
                "0 2px 0 var(--wood-mid), 0 3px 0 rgba(0,0,0,0.45), 0 6px 16px rgba(0,0,0,0.55)",
              letterSpacing: "0.02em",
            }}
          >
            Account
          </h1>
          <div />
        </div>

        <p
          className="mb-7 text-center text-[0.95rem] italic leading-snug text-[var(--parchment-light)]/80"
          style={FELL}
        >
          Your seat at the saloon — name on the door, brand on the bar.
        </p>

        <section
          className="rounded-[16px] border-[1.5px] border-[var(--accent-mid)]/35 p-5"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,40,28,0.65) 0%, rgba(5,28,20,0.78) 100%)",
            boxShadow:
              "0 1px 0 rgba(244,228,183,0.06) inset, 0 14px 30px rgba(0,0,0,0.45)",
          }}
        >
          <Row label="Handle" value={handle} />
          <Row label="Email" value={user.email ?? "—"} mono />
          {createdAt && <Row label="Joined" value={createdAt} />}
          {lastSignIn && <Row label="Last Visit" value={lastSignIn} />}
        </section>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-7 block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[var(--accent-dark)] py-3.5 text-center transition-transform active:scale-[0.985] disabled:cursor-not-allowed"
          style={{
            background:
              "linear-gradient(180deg, #ffd989 0%, #d8a93b 48%, #a07a22 100%)",
            boxShadow:
              "0 1px 0 rgba(255,240,200,0.85) inset, 0 -2px 0 rgba(60,40,8,0.35) inset, 0 10px 26px rgba(0,0,0,0.5)",
          }}
        >
          <span
            className="relative block text-[1rem] font-bold uppercase text-[var(--wood-dark)]"
            style={{
              ...RYE,
              letterSpacing: "0.22em",
              textShadow: "0 1px 0 rgba(255,240,200,0.55)",
            }}
          >
            {signingOut ? "Heading Out…" : "Sign Out"}
          </span>
        </button>

        <p
          className="mt-6 text-center text-[0.78rem] italic text-[var(--parchment-light)]/55"
          style={FELL}
        >
          Mosey on back to the{" "}
          <Link
            href="/"
            className="underline transition-colors hover:text-[var(--accent-light)]"
          >
            front porch
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="border-b border-[var(--accent-mid)]/20 py-3 last:border-b-0">
      <div
        className="text-[0.62rem] font-bold uppercase text-[var(--parchment-light)]/60"
        style={{ ...FELL, letterSpacing: "0.36em" }}
      >
        {label}
      </div>
      <div
        className={
          "mt-1 break-words text-[0.95rem] text-[var(--parchment-light)]" +
          (mono ? " font-semibold" : "")
        }
        style={FELL}
      >
        {value}
      </div>
    </div>
  );
}

function handleFromEmail(email: string | undefined): string {
  if (!email) return "Stranger";
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
