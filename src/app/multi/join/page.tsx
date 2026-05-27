"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth, usePreferredName } from "@/context/AuthContext";
import { joinGame } from "@/lib/remote-game";

const RYE: React.CSSProperties = {
  fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
};
const FELL: React.CSSProperties = {
  fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
};

function JoinForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { user, profile } = useAuth();
  const preferred = usePreferredName();
  const [code, setCode] = useState(search.get("code")?.toUpperCase() ?? "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preferred && !name) {
      setName(preferred);
    }
  }, [preferred, name]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { game } = await joinGame({
        code: code.trim().toUpperCase(),
        displayName: name.trim(),
        userId: user?.id ?? null,
        color: profile?.color ?? null,
      });
      router.push(`/multi/${game.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join game");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleJoin} className="space-y-4">
      <Panel>
        <label
          htmlFor="join-code"
          className="mb-2 block text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/65"
          style={{ ...FELL, letterSpacing: "0.36em" }}
        >
          Game Code
        </label>
        <input
          id="join-code"
          type="text"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
          }
          maxLength={6}
          autoFocus
          autoCapitalize="characters"
          placeholder="ABC123"
          className="parchment-input w-full rounded-[10px] px-4 py-3 text-center text-[1.6rem] font-bold uppercase tracking-[0.45em] text-[var(--wood-dark)] placeholder-[var(--wood-mid)]/40 focus:outline-none"
          style={FELL}
        />
      </Panel>

      <Panel>
        <label
          htmlFor="join-name"
          className="mb-2 block text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/65"
          style={{ ...FELL, letterSpacing: "0.36em" }}
        >
          Your Name
        </label>
        <input
          id="join-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="What should we call you?"
          className="parchment-input w-full rounded-[10px] px-4 py-3 text-[0.95rem] font-semibold text-[var(--wood-dark)] placeholder-[var(--wood-mid)]/55 focus:outline-none"
          style={FELL}
        />
      </Panel>

      {error && (
        <div
          className="rounded-[12px] border-[1.5px] border-[#8b2222]/55 bg-[#8b2222]/25 px-4 py-3 text-[0.85rem] font-bold text-[#ffd2c2]"
          style={FELL}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={code.length < 4 || !name.trim() || busy}
        className="brass-cta block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[var(--accent-dark)] py-4 text-center transition-transform active:scale-[0.985] disabled:cursor-not-allowed"
      >
        <span
          className="relative block text-[1.05rem] font-bold uppercase text-[var(--wood-dark)]"
          style={{
            ...RYE,
            letterSpacing: "0.22em",
            textShadow: "0 1px 0 rgba(255,240,200,0.55)",
          }}
        >
          {busy ? "Mosey'n in…" : "Pull Up A Chair"}
        </span>
      </button>
    </form>
  );
}

export default function JoinMultiGamePage() {
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

      <div className="relative mx-auto max-w-md px-5 pt-7 pb-8">
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center">
          <Link
            href="/multi"
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
            Join a Hand
          </h1>
          <div />
        </div>
        <Suspense
          fallback={
            <div
              className="py-8 text-center font-bold text-[var(--parchment-light)]/65"
              style={FELL}
            >
              Loading…
            </div>
          }
        >
          <JoinForm />
        </Suspense>
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

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="relative rounded-[16px] border-[1.5px] border-[var(--accent-mid)]/35 p-4"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,40,28,0.65) 0%, rgba(5,28,20,0.78) 100%)",
        boxShadow:
          "0 1px 0 rgba(244,228,183,0.06) inset, 0 14px 30px rgba(0,0,0,0.45)",
      }}
    >
      {children}
    </section>
  );
}
