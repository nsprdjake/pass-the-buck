"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

const RYE: React.CSSProperties = {
  fontFamily: "var(--font-rye), Georgia, serif",
};
const FELL: React.CSSProperties = {
  fontFamily: "var(--font-fell), Georgia, serif",
};

type Mode = "signin" | "signup";

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <AuthScreen />
    </Suspense>
  );
}

function AuthFallback() {
  return (
    <main className="felt-saloon flex min-h-[100dvh] items-center justify-center">
      <div className="text-[var(--parchment-light)]/65" style={FELL}>
        Loading…
      </div>
    </main>
  );
}

function AuthScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const { user, loading, signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Already signed in? Skip the screen.
  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [user, loading, router, next]);

  // Wipe stale errors when switching modes.
  useEffect(() => {
    setError(null);
    setInfo(null);
  }, [mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signin") {
        const session = await signIn(email, password);
        if (session) router.replace(next);
        else setError("Couldn't sign in. Try again.");
      } else {
        const session = await signUp({ email, password });
        if (session) {
          // Auto-confirmed (no email gate): we're signed in.
          router.replace(next);
        } else {
          // Email confirmation is still enabled in this Supabase project.
          // Surface a friendly note so the user knows to check their inbox.
          setInfo(
            "Account created. Check your email to confirm, then sign in."
          );
          setMode("signin");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const submitDisabled =
    busy ||
    !email.trim() ||
    password.length < (mode === "signup" ? 6 : 1);

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

      <div className="relative mx-auto flex max-w-sm flex-col items-center px-6 pt-10 pb-10 text-center">
        <Link
          href="/"
          className="self-start text-[0.78rem] font-bold text-[var(--parchment-light)]/75 transition-colors hover:text-[var(--accent-light)]"
          style={FELL}
        >
          ← Back
        </Link>

        <span
          className="mt-6 text-[0.62rem] uppercase text-[var(--parchment-light)]/65"
          style={{ ...FELL, letterSpacing: "0.48em" }}
        >
          ★  {mode === "signin" ? "Welcome Back" : "Riding In"}  ★
        </span>

        <h1
          className="mt-3 leading-[0.95]"
          style={{
            ...RYE,
            fontSize: "clamp(2.4rem, 11vw, 3.7rem)",
            color: "var(--parchment-light)",
            textShadow:
              "0 2px 0 var(--wood-mid), 0 3px 0 rgba(0,0,0,0.45), 0 10px 28px rgba(0,0,0,0.6)",
            letterSpacing: "0.01em",
          }}
        >
          {mode === "signin" ? (
            <>
              Open the
              <br />
              <span style={{ color: "var(--accent-light)" }}>Saloon Doors</span>
            </>
          ) : (
            <>
              Stake Your
              <br />
              <span style={{ color: "var(--accent-light)" }}>Claim</span>
            </>
          )}
        </h1>

        <p
          className="mt-4 max-w-[20rem] text-[0.95rem] italic leading-snug text-[var(--parchment-light)]/80"
          style={FELL}
        >
          {mode === "signin"
            ? "Sign in to keep your name and game history with you across every device."
            : "Email and a password — that's it. You'll be in before you can shuffle the dice."}
        </p>

        {/* Mode toggle */}
        <div
          className="mt-7 inline-flex rounded-full border-[1.5px] border-[var(--accent-mid)]/40 p-1"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,40,28,0.6) 0%, rgba(5,28,20,0.75) 100%)",
          }}
        >
          <ToggleTab
            active={mode === "signin"}
            onClick={() => setMode("signin")}
          >
            Sign In
          </ToggleTab>
          <ToggleTab
            active={mode === "signup"}
            onClick={() => setMode("signup")}
          >
            Create Account
          </ToggleTab>
        </div>

        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-5 w-full"
        >
          <section
            className="rounded-[16px] border-[1.5px] border-[var(--accent-mid)]/35 p-5"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,40,28,0.65) 0%, rgba(5,28,20,0.78) 100%)",
              boxShadow:
                "0 1px 0 rgba(244,228,183,0.06) inset, 0 14px 30px rgba(0,0,0,0.45)",
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-3 text-left">
              <Field label="Email" htmlFor="auth-email">
                <input
                  id="auth-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="parchment-input w-full rounded-[10px] px-4 py-3 text-[0.95rem] font-semibold text-[var(--wood-dark)] placeholder-[var(--wood-mid)]/55 focus:outline-none"
                  style={FELL}
                />
              </Field>

              <Field
                label="Password"
                htmlFor="auth-password"
                hint={
                  mode === "signup" ? "Six characters or more." : undefined
                }
              >
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  required
                  minLength={mode === "signup" ? 6 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="parchment-input w-full rounded-[10px] px-4 py-3 text-[0.95rem] font-semibold text-[var(--wood-dark)] placeholder-[var(--wood-mid)]/55 focus:outline-none"
                  style={FELL}
                />
              </Field>

              <button
                type="submit"
                disabled={submitDisabled}
                className="brass-cta block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[var(--accent-dark)] py-3.5 text-center transition-transform active:scale-[0.985] disabled:cursor-not-allowed"
              >
                <span
                  className="relative block text-[1rem] font-bold uppercase text-[var(--wood-dark)]"
                  style={{
                    ...RYE,
                    letterSpacing: "0.22em",
                    textShadow: "0 1px 0 rgba(255,240,200,0.55)",
                  }}
                >
                  {busy
                    ? "Hold On…"
                    : mode === "signin"
                    ? "Step Inside"
                    : "Stake Your Claim"}
                </span>
              </button>

              {error && (
                <div
                  className="rounded-[10px] border-[1.5px] border-[#8b2222]/55 bg-[#8b2222]/25 px-3 py-2 text-[0.82rem] font-bold text-[#ffd2c2]"
                  style={FELL}
                >
                  {error}
                </div>
              )}
              {info && (
                <div
                  className="rounded-[10px] border-[1.5px] border-[var(--accent-mid)]/45 bg-[var(--accent-mid)]/15 px-3 py-2 text-[0.82rem] font-bold text-[var(--accent-light)]"
                  style={FELL}
                >
                  {info}
                </div>
              )}
            </form>
          </section>
        </motion.div>

        <p
          className="mt-6 text-[0.78rem] italic text-[var(--parchment-light)]/55"
          style={FELL}
        >
          Don&apos;t want an account?{" "}
          <Link
            href="/"
            className="underline transition-colors hover:text-[var(--accent-light)]"
          >
            Keep playing as a stranger.
          </Link>
        </p>
      </div>

      <style jsx>{`
        :global(.parchment-input) {
          background: linear-gradient(
            180deg,
            var(--parchment-light) 0%,
            var(--parchment-mid) 60%,
            var(--parchment-dark) 100%
          );
          border: 1.5px solid var(--wood-mid);
          box-shadow: 0 1px 0 rgba(255, 240, 210, 0.55) inset,
            0 -1px 0 rgba(101, 67, 33, 0.18) inset,
            0 3px 10px rgba(0, 0, 0, 0.35);
        }
        :global(.parchment-input:focus) {
          box-shadow: 0 0 0 2px var(--accent-light),
            0 1px 0 rgba(255, 240, 210, 0.55) inset,
            0 3px 10px rgba(0, 0, 0, 0.4);
        }
        :global(.brass-cta) {
          background: linear-gradient(
            180deg,
            #ffd989 0%,
            #d8a93b 48%,
            #a07a22 100%
          );
          box-shadow: 0 1px 0 rgba(255, 240, 200, 0.85) inset,
            0 -2px 0 rgba(60, 40, 8, 0.35) inset,
            0 10px 26px rgba(0, 0, 0, 0.5);
        }
        :global(.brass-cta:disabled) {
          background: linear-gradient(
            180deg,
            rgba(10, 40, 28, 0.55) 0%,
            rgba(5, 30, 20, 0.7) 100%
          );
          border-color: rgba(201, 154, 51, 0.35);
          box-shadow: 0 1px 0 rgba(244, 228, 183, 0.06) inset,
            0 8px 22px rgba(0, 0, 0, 0.4);
        }
        :global(.brass-cta:disabled > span) {
          color: rgba(244, 228, 183, 0.6) !important;
          text-shadow: 0 2px 0 rgba(0, 0, 0, 0.55) !important;
        }
      `}</style>
    </main>
  );
}

function ToggleTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="rounded-full px-4 py-1.5 text-[0.68rem] font-bold uppercase transition-colors"
      style={{
        ...FELL,
        letterSpacing: "0.22em",
        color: active ? "var(--wood-dark)" : "rgba(244,228,183,0.7)",
        background: active
          ? "linear-gradient(180deg, #ffd989 0%, #d8a93b 48%, #a07a22 100%)"
          : "transparent",
        boxShadow: active
          ? "0 1px 0 rgba(255,240,200,0.85) inset, 0 -2px 0 rgba(60,40,8,0.35) inset, 0 3px 8px rgba(0,0,0,0.4)"
          : "none",
        textShadow: active ? "0 1px 0 rgba(255,240,200,0.55)" : undefined,
      }}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-[0.62rem] font-bold uppercase text-[var(--parchment-light)]/65"
        style={{ ...FELL, letterSpacing: "0.36em" }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <p
          className="mt-1.5 text-[0.72rem] italic text-[var(--parchment-light)]/50"
          style={FELL}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
