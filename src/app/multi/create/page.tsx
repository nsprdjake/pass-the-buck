"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, usePreferredName } from "@/context/AuthContext";
import { createGame, type GameRow } from "@/lib/remote-game";
import type { GameMode } from "@/lib/types";

const RYE: React.CSSProperties = {
  fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
};
const FELL: React.CSSProperties = {
  fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
};

export default function CreateMultiGamePage() {
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
            Set the Table
          </h1>
          <div />
        </div>

        <Suspense fallback={<Loading />}>
          <CreateMultiGameInner />
        </Suspense>
      </div>

      <style jsx>{`
        :global(.brass-slider) {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          background: linear-gradient(
            90deg,
            var(--accent-mid) 0%,
            var(--accent-mid) var(--fill, 50%),
            rgba(244, 228, 183, 0.18) var(--fill, 50%),
            rgba(244, 228, 183, 0.18) 100%
          );
          border-radius: 999px;
          outline: none;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.45) inset;
        }
        :global(.brass-slider::-webkit-slider-thumb) {
          -webkit-appearance: none;
          appearance: none;
          height: 22px;
          width: 22px;
          border-radius: 50%;
          background: radial-gradient(
            circle at 30% 30%,
            #ffe8a8 0%,
            #d8a93b 55%,
            #8a6720 100%
          );
          border: 1.5px solid var(--wood-mid);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.55),
            0 0 0 1px rgba(255, 240, 200, 0.4) inset;
          cursor: grab;
        }
        :global(.brass-slider::-moz-range-thumb) {
          height: 22px;
          width: 22px;
          border-radius: 50%;
          background: radial-gradient(
            circle at 30% 30%,
            #ffe8a8 0%,
            #d8a93b 55%,
            #8a6720 100%
          );
          border: 1.5px solid var(--wood-mid);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.55);
          cursor: grab;
        }
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
      `}</style>
    </main>
  );
}

function Loading() {
  return (
    <div
      className="py-10 text-center text-[var(--parchment-light)]/65"
      style={FELL}
    >
      Loading…
    </div>
  );
}

function CreateMultiGameInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { user, profile, loading } = useAuth();
  const preferred = usePreferredName();

  // Allow daily-challenge style prefills.
  const urlMode = (search.get("mode") === "loser" ? "loser" : "winner") as GameMode;
  const urlWager = search.get("wager") ?? "";
  const urlBuyIn = (() => {
    const raw = parseInt(search.get("buyIn") ?? "", 10);
    return Number.isFinite(raw) && raw >= 1 && raw <= 9 ? raw : 3;
  })();
  const fromDaily = search.get("from") === "daily";

  const [name, setName] = useState("");
  const [buyIn, setBuyIn] = useState(urlBuyIn);
  const [mode, setMode] = useState<GameMode>(urlMode);
  const [wager, setWager] = useState(urlWager);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<GameRow | null>(null);
  const [copied, setCopied] = useState(false);

  // Spec calls for signed-in creation. Bounce anonymous visitors to /auth
  // with a next= return path so they come right back here after sign-in.
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?next=/multi/create");
    }
  }, [loading, user, router]);

  // Prefill display name from the user's profile (or email-local-part) once
  // auth resolves, unless they've already typed something.
  useEffect(() => {
    if (preferred && !name) {
      setName(preferred);
    }
  }, [preferred, name]);

  // Loser mode hides the buy-in dial — pin it to 3 for consistent pacing.
  useEffect(() => {
    if (mode === "loser") setBuyIn(3);
  }, [mode]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { game } = await createGame({
        displayName: name.trim(),
        buyIn,
        mode,
        wager,
        userId: user?.id ?? null,
        color: profile?.color ?? null,
      });
      setCreated(game);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create game");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Older browsers — quietly no-op; the code is still on screen.
    }
  }

  async function shareCode() {
    if (!created) return;
    const url = `${window.location.origin}/multi/join?code=${created.code}`;
    const text = `Join my Pass the Buck game — code ${created.code}\n${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Pass the Buck", text, url });
        return;
      } catch {
        // user cancelled or share unavailable; fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // no-op
    }
  }

  if (loading || !user) {
    return <Loading />;
  }

  if (created) {
    return (
      <div className="space-y-4">
        {fromDaily && (
          <DailyBadge />
        )}

        <Panel>
          <div
            className="text-center text-[0.6rem] font-bold uppercase text-[var(--parchment-light)]/65"
            style={{ ...FELL, letterSpacing: "0.4em" }}
          >
            Your Join Code
          </div>
          <div
            className="mt-2 text-center"
            style={{
              ...RYE,
              fontSize: "clamp(2.5rem, 14vw, 3.6rem)",
              color: "var(--accent-light)",
              letterSpacing: "0.32em",
              textShadow:
                "0 2px 0 var(--wood-mid), 0 4px 0 rgba(0,0,0,0.45), 0 10px 24px rgba(0,0,0,0.55)",
            }}
          >
            {created.code}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <SecondaryButton onClick={copyCode}>
              {copied ? "Copied ✓" : "Copy"}
            </SecondaryButton>
            <SecondaryButton onClick={shareCode}>Share</SecondaryButton>
          </div>
          <p
            className="mt-4 text-center text-[0.78rem] italic leading-snug text-[var(--parchment-light)]/65"
            style={FELL}
          >
            Pass the code to your posse. They head to{" "}
            <span className="text-[var(--accent-light)]">/multi/join</span> on
            their own phones and punch it in.
          </p>
        </Panel>

        <button
          type="button"
          onClick={() => router.push(`/multi/${created.code}`)}
          className="brass-cta block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[var(--accent-dark)] py-4 text-center transition-transform active:scale-[0.985]"
        >
          <span
            className="relative block text-[1.05rem] font-bold uppercase text-[var(--wood-dark)]"
            style={{
              ...RYE,
              letterSpacing: "0.22em",
              textShadow: "0 1px 0 rgba(255,240,200,0.55)",
            }}
          >
            Take Your Seat
          </span>
          <span
            className="relative mt-0.5 block text-[0.62rem] uppercase text-[var(--wood-dark)]/75"
            style={{ ...FELL, letterSpacing: "0.36em" }}
          >
            Mosey to the lobby
          </span>
        </button>
      </div>
    );
  }

  return (
    <>
      {fromDaily && <DailyBadge />}

      <form onSubmit={handleCreate} className="space-y-4">
        <Panel>
          <label
            className="mb-2 block text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/65"
            style={{ ...FELL, letterSpacing: "0.36em" }}
            htmlFor="create-name"
          >
            Your name
          </label>
          <input
            id="create-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus
            placeholder="What should we call you?"
            className="parchment-input w-full rounded-[10px] px-4 py-3 text-[0.95rem] font-semibold text-[var(--wood-dark)] placeholder-[var(--wood-mid)]/55 focus:outline-none"
            style={FELL}
          />
        </Panel>

        <Panel>
          <div className="mb-3">
            <label
              className="text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/65"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              The Stakes
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ModeOption
              active={mode === "winner"}
              onClick={() => setMode("winner")}
              title="Last eyeBuck Wins"
              caption="Sole champion takes the pot"
            />
            <ModeOption
              active={mode === "loser"}
              onClick={() => setMode("loser")}
              title="Stuck with the Tab"
              caption="Last eyeBuck pays the wager"
            />
          </div>

          <div className="mt-4">
            <label
              htmlFor="wager-input"
              className="mb-2 block text-[0.6rem] font-bold uppercase text-[var(--parchment-light)]/55"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              {mode === "loser" ? "The Tab" : "Side Wager"}{" "}
              <span className="text-[var(--parchment-light)]/35">(optional)</span>
            </label>
            <input
              id="wager-input"
              type="text"
              value={wager}
              onChange={(e) => setWager(e.target.value)}
              placeholder={
                mode === "loser"
                  ? "Loser buys dinner"
                  : "Winner takes the bottle"
              }
              maxLength={80}
              className="parchment-input w-full rounded-[10px] px-4 py-3 text-[0.95rem] font-semibold text-[var(--wood-dark)] placeholder-[var(--wood-mid)]/55 focus:outline-none"
              style={FELL}
            />
          </div>
        </Panel>

        {mode === "winner" && (
          <Panel>
            <div className="mb-3 flex items-center justify-between">
              <label
                className="text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/65"
                style={{ ...FELL, letterSpacing: "0.36em" }}
              >
                Buy-in
              </label>
              <span
                className="text-[1.15rem]"
                style={{
                  ...RYE,
                  color: "var(--accent-light)",
                  textShadow: "0 1px 0 rgba(0,0,0,0.55)",
                }}
              >
                {buyIn} eyeBuck{buyIn === 1 ? "" : "s"}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={9}
              step={1}
              value={buyIn}
              onChange={(e) => setBuyIn(parseInt(e.target.value, 10))}
              className="brass-slider w-full"
              style={
                {
                  ["--fill" as string]: `${((buyIn - 1) / 8) * 100}%`,
                } as React.CSSProperties
              }
            />
            <p
              className="mt-3 text-[0.82rem] italic leading-snug text-[var(--parchment-light)]/60"
              style={FELL}
            >
              Sets the pot prize and game length. Each rider starts with this
              many eyeBucks and rolls one die per eyeBuck held (up to three).
            </p>
          </Panel>
        )}

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
          disabled={!name.trim() || busy}
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
            {busy ? "Dealin'…" : "Open the Saloon"}
          </span>
          {!busy && name.trim() && (
            <span
              className="relative mt-0.5 block text-[0.62rem] uppercase text-[var(--wood-dark)]/75"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              You&apos;ll get a 6-letter code to share
            </span>
          )}
        </button>
      </form>

      <p
        className="mt-5 text-center text-[0.78rem] italic text-[var(--parchment-light)]/55"
        style={FELL}
      >
        Players join on their own phones with the code.
      </p>
    </>
  );
}

function DailyBadge() {
  return (
    <div
      className="mb-4 rounded-[12px] border-[1.5px] border-[var(--accent-mid)]/55 px-3 py-2.5 text-center"
      style={{
        background:
          "linear-gradient(180deg, rgba(201,154,51,0.18) 0%, rgba(60,40,8,0.12) 100%)",
        fontFamily:
          "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
      }}
    >
      <div
        className="text-[0.55rem] font-bold uppercase text-[var(--accent-text)]/85"
        style={{ letterSpacing: "0.36em" }}
      >
        Today&apos;s Challenge
      </div>
      <div className="mt-0.5 text-[0.8rem] italic text-[var(--parchment-light)]/85">
        Stakes and wager pre-filled. Tune anything you like.
      </div>
    </div>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative rounded-[16px] border-[1.5px] border-[var(--accent-mid)]/35 p-4 ${className}`}
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

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[10px] border-[1.5px] border-[var(--accent-mid)]/55 bg-[rgba(5,28,20,0.65)] px-3 py-2 text-[0.78rem] font-bold uppercase text-[var(--parchment-light)] transition-colors hover:border-[var(--accent-light)]/80 hover:text-[var(--accent-light)] active:scale-[0.97]"
      style={{ ...FELL, letterSpacing: "0.22em" }}
    >
      {children}
    </button>
  );
}

function ModeOption({
  active,
  onClick,
  title,
  caption,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  caption: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="relative overflow-hidden rounded-[12px] px-3 py-3 text-left transition-transform active:scale-[0.98]"
      style={{
        background: active
          ? "linear-gradient(180deg, #ffd989 0%, #d8a93b 48%, #a07a22 100%)"
          : "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
        border: `1.5px solid ${active ? "var(--accent-dark)" : "rgba(201,154,51,0.4)"}`,
        boxShadow: active
          ? "0 1px 0 rgba(255,240,200,0.75) inset, 0 -2px 0 rgba(60,40,8,0.35) inset, 0 4px 14px rgba(0,0,0,0.5)"
          : "0 1px 0 rgba(244,228,183,0.05) inset, 0 4px 10px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className={`text-[0.78rem] font-bold uppercase leading-tight ${
          active ? "text-[var(--wood-dark)]" : "text-[var(--parchment-light)]"
        }`}
        style={{
          ...RYE,
          letterSpacing: "0.12em",
          textShadow: active
            ? "0 1px 0 rgba(255,240,200,0.55)"
            : "0 2px 0 rgba(0,0,0,0.55)",
        }}
      >
        {title}
      </div>
      <div
        className={`mt-1 text-[0.62rem] italic leading-snug ${
          active ? "text-[var(--wood-dark)]/75" : "text-[var(--parchment-light)]/55"
        }`}
        style={FELL}
      >
        {caption}
      </div>
    </button>
  );
}
