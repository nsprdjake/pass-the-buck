"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PLAYER_COLORS } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";

const RYE: React.CSSProperties = {
  fontFamily: "var(--font-rye), Georgia, serif",
};
const FELL: React.CSSProperties = {
  fontFamily: "var(--font-fell), Georgia, serif",
};

type HistoryRow = {
  game_id: string;
  code: string;
  status: string;
  mode: "winner" | "loser";
  wager: string | null;
  pot: number;
  created_at: string;
  winner_player_id: string | null;
  /** My player row inside that game (so we know if we won/lost). */
  player_id: string;
  player_bucks: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, updateProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [color, setColor] = useState<string>(PLAYER_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);

  // Bounce signed-out visitors to the auth screen.
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?next=/profile");
    }
  }, [user, loading, router]);

  // Hydrate the form from the profile row once it arrives.
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setColor(profile.color ?? PLAYER_COLORS[0]);
    }
  }, [profile]);

  // Pull this user's last few multi-device games.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const sb = getSupabase();
    (async () => {
      const { data } = await sb
        .from("ptb_players")
        .select(
          "id, bucks, ptb_games!inner(id, code, status, mode, wager, pot, created_at, winner_player_id)"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled) return;
      const rows: HistoryRow[] = ((data as unknown as Array<{
        id: string;
        bucks: number;
        ptb_games: {
          id: string;
          code: string;
          status: string;
          mode: "winner" | "loser";
          wager: string | null;
          pot: number;
          created_at: string;
          winner_player_id: string | null;
        };
      }>) ?? []).map((r) => ({
        game_id: r.ptb_games.id,
        code: r.ptb_games.code,
        status: r.ptb_games.status,
        mode: r.ptb_games.mode,
        wager: r.ptb_games.wager,
        pot: r.ptb_games.pot,
        created_at: r.ptb_games.created_at,
        winner_player_id: r.ptb_games.winner_player_id,
        player_id: r.id,
        player_bucks: r.bucks,
      }));
      setHistory(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        display_name: displayName.trim() || null,
        color,
      });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  const finishedHistory = useMemo(
    () => (history ?? []).filter((h) => h.status === "finished"),
    [history]
  );

  if (loading || !user) {
    return (
      <main className="felt-saloon flex min-h-[100dvh] items-center justify-center">
        <div className="text-[#f4e4b7]/65" style={FELL}>Loading…</div>
      </main>
    );
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

      <div className="relative mx-auto max-w-md px-5 pt-7 pb-8">
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center">
          <Link
            href="/"
            className="justify-self-start text-[0.78rem] font-bold text-[#f4e4b7]/75 transition-colors hover:text-[#ffd17a]"
            style={FELL}
          >
            ← Back
          </Link>
          <h1
            className="justify-self-center"
            style={{
              ...RYE,
              fontSize: "clamp(1.6rem, 6.5vw, 2.1rem)",
              color: "#f4e4b7",
              textShadow:
                "0 2px 0 #5c3b1e, 0 3px 0 rgba(0,0,0,0.45), 0 6px 16px rgba(0,0,0,0.55)",
              letterSpacing: "0.02em",
            }}
          >
            My Saloon
          </h1>
          <button
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
            className="justify-self-end text-[0.66rem] font-bold uppercase text-[#f4e4b7]/55 transition-colors hover:text-[#ffd17a]"
            style={{ ...FELL, letterSpacing: "0.36em" }}
          >
            Sign Out
          </button>
        </div>

        {/* Profile editor */}
        <Panel className="mb-4">
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label
                htmlFor="profile-name"
                className="mb-2 block text-[0.62rem] font-bold uppercase text-[#f4e4b7]/65"
                style={{ ...FELL, letterSpacing: "0.36em" }}
              >
                Display Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="What should we call you?"
                maxLength={20}
                className="parchment-input w-full rounded-[10px] px-4 py-3 text-[0.95rem] font-semibold text-[#2a1a0a] placeholder-[#5c3b1e]/55 focus:outline-none"
                style={FELL}
              />
              <p
                className="mt-2 text-[0.72rem] italic text-[#f4e4b7]/55"
                style={FELL}
              >
                {user.email ?? user.phone ?? "signed in"}
              </p>
            </div>

            <div>
              <label
                className="mb-2 block text-[0.62rem] font-bold uppercase text-[#f4e4b7]/65"
                style={{ ...FELL, letterSpacing: "0.36em" }}
              >
                Color
              </label>
              <div className="grid grid-cols-6 gap-2">
                {PLAYER_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={`Pick ${c}`}
                    className="relative aspect-square rounded-full transition-transform active:scale-95"
                    style={{
                      backgroundColor: c,
                      boxShadow:
                        c === color
                          ? "0 0 0 2px #ffd17a, 0 0 0 4px #5c3b1e, 0 4px 10px rgba(0,0,0,0.45)"
                          : "0 0 0 1.5px rgba(92,59,30,0.6), 0 2px 6px rgba(0,0,0,0.35)",
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="brass-cta block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[#7a5a18] py-3.5 text-center transition-transform active:scale-[0.985] disabled:cursor-not-allowed"
            >
              <span
                className="relative block text-[0.95rem] font-bold uppercase text-[#2a1a0a]"
                style={{
                  ...RYE,
                  letterSpacing: "0.22em",
                  textShadow: "0 1px 0 rgba(255,240,200,0.55)",
                }}
              >
                {saving ? "Stampin'…" : savedAt ? "Saved ✓" : "Save"}
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
          </form>
        </Panel>

        {/* Game history */}
        <Panel>
          <div className="mb-3">
            <h2
              className="text-[0.66rem] font-bold uppercase text-[#f4e4b7]/65"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              Recent Hands
            </h2>
          </div>
          {history === null ? (
            <div
              className="py-5 text-center text-[0.85rem] italic text-[#f4e4b7]/50"
              style={FELL}
            >
              Riding into the records…
            </div>
          ) : finishedHistory.length === 0 ? (
            <div
              className="rounded-[10px] border border-dashed border-[#c99a33]/30 py-7 text-center text-[0.85rem] italic text-[#f4e4b7]/55"
              style={FELL}
            >
              No finished hands yet. Cross-device games you join while signed in
              will show up here.
            </div>
          ) : (
            <ul className="space-y-2">
              {finishedHistory.map((h) => {
                const iWon = h.winner_player_id === h.player_id;
                const stuck = h.mode === "loser" && iWon;
                const result = h.mode === "loser"
                  ? (stuck ? "Stuck with the Tab" : "Walked Free")
                  : (iWon ? "Champion" : "Knocked Out");
                const resultColor = h.mode === "loser"
                  ? (stuck ? "#c43838" : "#ffd17a")
                  : (iWon ? "#ffd17a" : "#f4e4b7");
                return (
                  <li
                    key={h.player_id}
                    className="flex items-center justify-between rounded-[10px] border-[1.5px] border-[#c99a33]/30 px-3 py-2"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[0.92rem] font-bold"
                        style={{ ...RYE, color: resultColor }}
                      >
                        {result}
                      </div>
                      <div
                        className="text-[0.7rem] italic text-[#f4e4b7]/55"
                        style={FELL}
                      >
                        {fmtDate(h.created_at)} · code {h.code}
                        {h.wager ? ` · ${h.wager}` : ""}
                      </div>
                    </div>
                    <div
                      className="ml-2 text-[0.7rem] uppercase text-[#f4e4b7]/45"
                      style={{ ...FELL, letterSpacing: "0.24em" }}
                    >
                      {h.mode === "loser" ? "Tab" : "Pot"}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
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
      `}</style>
    </main>
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
      className={`relative rounded-[16px] border-[1.5px] border-[#c99a33]/35 p-4 ${className}`}
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

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      d.getFullYear() === new Date().getFullYear() ? undefined : "2-digit",
  });
}
