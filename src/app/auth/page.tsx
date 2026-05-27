"use client";

import { Suspense, useEffect, useRef, useState } from "react";
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

type Step = "email" | "code";

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
      <div className="text-[#f4e4b7]/65" style={FELL}>
        Loading…
      </div>
    </main>
  );
}

function AuthScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const { user, loading, sendOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resentAt, setResentAt] = useState<number | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  // If we're already signed in, bounce to the destination immediately.
  useEffect(() => {
    if (!loading && user) {
      router.replace(next);
    }
  }, [user, loading, router, next]);

  // When we advance to the code step, focus the OTP input.
  useEffect(() => {
    if (step === "code") {
      requestAnimationFrame(() => codeRef.current?.focus());
    }
  }, [step]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await sendOtp(email);
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the code");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (busy || code.trim().length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const session = await verifyOtp(email, code);
      if (session) {
        router.replace(next);
      } else {
        setError("Couldn't verify that code — try again.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendOtp(email);
      setResentAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't resend");
    } finally {
      setBusy(false);
    }
  }

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
          className="self-start text-[0.78rem] font-bold text-[#f4e4b7]/75 transition-colors hover:text-[#ffd17a]"
          style={FELL}
        >
          ← Back
        </Link>

        <span
          className="mt-6 text-[0.62rem] uppercase text-[#f4e4b7]/65"
          style={{ ...FELL, letterSpacing: "0.48em" }}
        >
          ★  Show Your Face  ★
        </span>

        <h1
          className="mt-3 leading-[0.95]"
          style={{
            ...RYE,
            fontSize: "clamp(2.5rem, 12vw, 4rem)",
            color: "#f4e4b7",
            textShadow:
              "0 2px 0 #5c3b1e, 0 3px 0 rgba(0,0,0,0.45), 0 10px 28px rgba(0,0,0,0.6)",
            letterSpacing: "0.01em",
          }}
        >
          {step === "email" ? (
            <>
              Open the
              <br />
              <span style={{ color: "#ffd17a" }}>Saloon Doors</span>
            </>
          ) : (
            <>
              Check
              <br />
              <span style={{ color: "#ffd17a" }}>Your Mail</span>
            </>
          )}
        </h1>

        <p
          className="mt-4 max-w-[20rem] text-[0.95rem] italic leading-snug text-[#f4e4b7]/80"
          style={FELL}
        >
          {step === "email"
            ? "Sign in to keep your name and game history with you across every device."
            : `We just sent a six-digit code to ${email}. Punch it in below.`}
        </p>

        {/* === Form panel === */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-8 w-full"
        >
          <section
            className="rounded-[16px] border-[1.5px] border-[#c99a33]/35 p-5"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,40,28,0.65) 0%, rgba(5,28,20,0.78) 100%)",
              boxShadow:
                "0 1px 0 rgba(244,228,183,0.06) inset, 0 14px 30px rgba(0,0,0,0.45)",
            }}
          >
            {step === "email" ? (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <label
                  htmlFor="auth-email"
                  className="block text-[0.62rem] font-bold uppercase text-[#f4e4b7]/65"
                  style={{ ...FELL, letterSpacing: "0.36em" }}
                >
                  Your Email
                </label>
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
                  className="parchment-input w-full rounded-[10px] px-4 py-3 text-[0.95rem] font-semibold text-[#2a1a0a] placeholder-[#5c3b1e]/55 focus:outline-none"
                  style={FELL}
                />
                <button
                  type="submit"
                  disabled={busy || !email.trim()}
                  className="brass-cta block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[#7a5a18] py-3.5 text-center transition-transform active:scale-[0.985] disabled:cursor-not-allowed"
                >
                  <span
                    className="relative block text-[1rem] font-bold uppercase text-[#2a1a0a]"
                    style={{
                      ...RYE,
                      letterSpacing: "0.22em",
                      textShadow: "0 1px 0 rgba(255,240,200,0.55)",
                    }}
                  >
                    {busy ? "Sendin' Word…" : "Send the Code"}
                  </span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-3">
                <label
                  htmlFor="auth-code"
                  className="block text-[0.62rem] font-bold uppercase text-[#f4e4b7]/65"
                  style={{ ...FELL, letterSpacing: "0.36em" }}
                >
                  Six-Digit Code
                </label>
                <input
                  ref={codeRef}
                  id="auth-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="• • • • • •"
                  className="parchment-input w-full rounded-[10px] px-4 py-4 text-center text-[1.5rem] font-bold tracking-[0.5em] text-[#2a1a0a] placeholder-[#5c3b1e]/40 focus:outline-none"
                  style={FELL}
                />
                <button
                  type="submit"
                  disabled={busy || code.length < 6}
                  className="brass-cta block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[#7a5a18] py-3.5 text-center transition-transform active:scale-[0.985] disabled:cursor-not-allowed"
                >
                  <span
                    className="relative block text-[1rem] font-bold uppercase text-[#2a1a0a]"
                    style={{
                      ...RYE,
                      letterSpacing: "0.22em",
                      textShadow: "0 1px 0 rgba(255,240,200,0.55)",
                    }}
                  >
                    {busy ? "Checkin'…" : "Step Inside"}
                  </span>
                </button>

                <div
                  className="flex items-center justify-between pt-1 text-[0.7rem] text-[#f4e4b7]/60"
                  style={FELL}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setCode("");
                      setError(null);
                    }}
                    className="underline transition-colors hover:text-[#ffd17a]"
                  >
                    Wrong email?
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={busy}
                    className="underline transition-colors hover:text-[#ffd17a] disabled:opacity-40"
                  >
                    {resentAt ? "Resent ✓" : "Resend code"}
                  </button>
                </div>
              </form>
            )}

            {error && (
              <div
                className="mt-3 rounded-[10px] border-[1.5px] border-[#8b2222]/55 bg-[#8b2222]/25 px-3 py-2 text-[0.82rem] font-bold text-[#ffd2c2]"
                style={FELL}
              >
                {error}
              </div>
            )}
          </section>
        </motion.div>

        <p
          className="mt-6 text-[0.78rem] italic text-[#f4e4b7]/55"
          style={FELL}
        >
          Don&apos;t want an account? <Link href="/" className="underline transition-colors hover:text-[#ffd17a]">Keep playing as a stranger.</Link>
        </p>
      </div>

      <style jsx>{`
        :global(.parchment-input) {
          background: linear-gradient(
            180deg,
            #fdf2ce 0%,
            #f1dfa3 60%,
            #d6b87a 100%
          );
          border: 1.5px solid #5c3b1e;
          box-shadow: 0 1px 0 rgba(255, 240, 210, 0.55) inset,
            0 -1px 0 rgba(101, 67, 33, 0.18) inset,
            0 3px 10px rgba(0, 0, 0, 0.35);
        }
        :global(.parchment-input:focus) {
          box-shadow: 0 0 0 2px #ffd17a,
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
