"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

const PILL_CLASS =
  "inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--accent-mid)]/45 bg-[rgba(5,28,20,0.55)] px-3 py-1.5 text-[0.7rem] font-bold uppercase text-[var(--parchment-light)]/75 transition-colors hover:border-[var(--accent-light)]/70 hover:text-[var(--accent-light)]";

const PILL_STYLE: React.CSSProperties = {
  fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
  letterSpacing: "0.22em",
};

export default function AuthMenu() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (loading) {
    return (
      <span
        className={PILL_CLASS + " opacity-50"}
        style={PILL_STYLE}
        aria-hidden
      >
        …
      </span>
    );
  }

  if (!user) {
    return (
      <Link href="/auth" className={PILL_CLASS} style={PILL_STYLE}>
        Sign In
      </Link>
    );
  }

  const label = displayName(user.email);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await getSupabaseBrowserClient().auth.signOut();
      setOpen(false);
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={PILL_CLASS + " max-w-[10rem]"}
        style={PILL_STYLE}
      >
        <span aria-hidden>★</span>
        <span className="truncate">{label}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 min-w-[10rem] overflow-hidden rounded-[12px] border-[1.5px] border-[var(--accent-mid)]/45 text-left shadow-[0_14px_30px_rgba(0,0,0,0.5)]"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,40,28,0.95) 0%, rgba(5,28,20,0.97) 100%)",
          }}
        >
          {user.email && (
            <div
              className="border-b border-[var(--accent-mid)]/25 px-3 py-2 text-[0.65rem] uppercase text-[var(--parchment-light)]/60"
              style={{ ...PILL_STYLE, letterSpacing: "0.18em" }}
            >
              <span className="block truncate normal-case tracking-normal text-[0.78rem] text-[var(--parchment-light)]/85">
                {user.email}
              </span>
            </div>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="block w-full px-3 py-2 text-left text-[0.72rem] font-bold uppercase text-[var(--parchment-light)]/85 transition-colors hover:bg-[var(--accent-mid)]/15 hover:text-[var(--accent-light)] disabled:opacity-60"
            style={{ ...PILL_STYLE, letterSpacing: "0.22em" }}
          >
            {signingOut ? "Signing Out…" : "Sign Out"}
          </button>
        </div>
      )}
    </div>
  );
}

function displayName(email: string | undefined): string {
  if (!email) return "Account";
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}
