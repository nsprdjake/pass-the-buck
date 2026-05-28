"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const PILL_CLASS =
  "inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--accent-mid)]/45 bg-[rgba(5,28,20,0.55)] px-3 py-1.5 text-[0.7rem] font-bold uppercase text-[var(--parchment-light)]/75 transition-colors hover:border-[var(--accent-light)]/70 hover:text-[var(--accent-light)]";

const PILL_STYLE: React.CSSProperties = {
  fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
  letterSpacing: "0.22em",
};

export default function AuthMenu() {
  const { user, loading } = useAuth();

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

  return (
    <Link
      href="/account"
      className={PILL_CLASS + " max-w-[10rem]"}
      style={PILL_STYLE}
      aria-label="Account settings"
    >
      <span aria-hidden>★</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function displayName(email: string | undefined): string {
  if (!email) return "Account";
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}
