"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createGame, joinGame, startGame } from "@/hooks/useGame";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_COLORS,
  STARTING_BALANCE,
} from "@/lib/constants";

type Mode = "choose" | "create" | "join" | "waiting";

type LobbyPlayer = {
  id: string;
  display_name: string;
  seat_index: number;
};

type LobbyGame = {
  id: string;
  code: string;
  host_id: string | null;
  status: string;
  buy_in: number;
};

export default function LobbyPage() {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [mode, setMode] = useState<Mode>("choose");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [buyIn, setBuyIn] = useState(5);
  const [turnTimer, setTurnTimer] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [game, setGame] = useState<LobbyGame | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    if (mode !== "waiting" || !game) return;
    let cancelled = false;

    async function refresh() {
      const { data } = await supabase
        .from("ptb_players")
        .select("id, display_name, seat_index")
        .eq("game_id", game!.id)
        .order("seat_index");
      if (!cancelled) setPlayers((data as LobbyPlayer[]) ?? []);
    }
    void refresh();

    const channel = supabase
      .channel(`lobby:${game.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ptb_players",
          filter: `game_id=eq.${game.id}`,
        },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ptb_games",
          filter: `id=eq.${game.id}`,
        },
        (payload) => {
          const next = payload.new as LobbyGame | null;
          if (next && next.status === "active") {
            router.push(`/game/${game.id}`);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [mode, game, supabase, router]);

  async function handleCreate() {
    if (!displayName.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { gameId, code: newCode } = await createGame({
        hostName: displayName.trim(),
        buyIn,
        turnTimerSeconds: turnTimer || null,
      });
      const { data: g } = await supabase
        .from("ptb_games")
        .select("id, code, host_id, status, buy_in")
        .eq("id", gameId)
        .single();
      setGame((g as LobbyGame) ?? { id: gameId, code: newCode, host_id: userId, status: "lobby", buy_in: buyIn });
      setMode("waiting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!displayName.trim() || code.trim().length < 4 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { gameId } = await joinGame({
        code: code.trim(),
        displayName: displayName.trim(),
      });
      const { data: g } = await supabase
        .from("ptb_games")
        .select("id, code, host_id, status, buy_in")
        .eq("id", gameId)
        .single();
      setGame((g as LobbyGame) ?? null);
      setMode("waiting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join game");
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!game || busy) return;
    if (players.length < MIN_PLAYERS) return;
    setBusy(true);
    try {
      await startGame(game.id);
      router.push(`/game/${game.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-6 bg-gradient-to-b from-buck-dark via-buck-darker to-buck-dark">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          {mode === "choose" ? (
            <Link
              href="/"
              className="text-white/70 hover:text-white text-sm font-bold"
            >
              ← Back
            </Link>
          ) : (
            <button
              onClick={() => {
                setMode("choose");
                setError(null);
              }}
              className="text-white/70 hover:text-white text-sm font-bold"
            >
              ← Back
            </button>
          )}
          <h1 className="text-2xl font-black">
            {mode === "waiting" ? "Waiting Room" : "Lobby"}
          </h1>
          <div className="w-12" />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-buck-coral/40 bg-buck-coral/10 text-buck-coral px-4 py-3 text-sm font-bold">
            {error}
          </div>
        )}

        {mode === "choose" && (
          <div className="space-y-3">
            <button
              onClick={() => setMode("create")}
              className="w-full py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-br from-buck-green to-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.35)] active:scale-[0.98] transition-transform"
            >
              CREATE GAME
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full py-5 rounded-2xl font-black text-lg text-white bg-buck-card border border-white/10 active:scale-[0.98] transition-transform"
            >
              JOIN GAME
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="space-y-4">
            <section className="bg-buck-card border border-white/10 rounded-2xl p-4">
              <label className="block text-xs uppercase tracking-widest text-white/60 font-bold mb-2">
                Your name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                maxLength={20}
                className="w-full bg-buck-darker border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-buck-green"
              />
            </section>

            <section className="bg-buck-card border border-white/10 rounded-2xl p-4 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-widest text-white/60 font-bold">
                    Buy-in
                  </label>
                  <span className="text-buck-gold font-black">${buyIn}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={STARTING_BALANCE}
                  step={1}
                  value={buyIn}
                  onChange={(e) => setBuyIn(parseInt(e.target.value, 10))}
                  className="w-full accent-buck-green"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-widest text-white/60 font-bold">
                    Turn timer
                  </label>
                  <span className="text-white font-black">
                    {turnTimer === 0 ? "Off" : `${turnTimer}s`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={10}
                  value={turnTimer}
                  onChange={(e) => setTurnTimer(parseInt(e.target.value, 10))}
                  className="w-full accent-buck-blue"
                />
              </div>
            </section>

            <button
              onClick={handleCreate}
              disabled={!displayName.trim() || busy}
              className="w-full py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-br from-buck-green to-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.35)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
            >
              {busy ? "CREATING…" : "CREATE GAME"}
            </button>
          </div>
        )}

        {mode === "join" && (
          <div className="space-y-4">
            <section className="bg-buck-card border border-white/10 rounded-2xl p-4">
              <label className="block text-xs uppercase tracking-widest text-white/60 font-bold mb-2">
                Game code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="w-full bg-buck-darker border border-white/10 rounded-xl px-4 py-3 text-white text-2xl tracking-[0.4em] text-center font-black placeholder-white/40 focus:outline-none focus:border-buck-green"
              />
            </section>

            <section className="bg-buck-card border border-white/10 rounded-2xl p-4">
              <label className="block text-xs uppercase tracking-widest text-white/60 font-bold mb-2">
                Your name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                maxLength={20}
                className="w-full bg-buck-darker border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-buck-green"
              />
            </section>

            <button
              onClick={handleJoin}
              disabled={!displayName.trim() || code.trim().length < 4 || busy}
              className="w-full py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-br from-buck-green to-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.35)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
            >
              {busy ? "JOINING…" : "JOIN GAME"}
            </button>
          </div>
        )}

        {mode === "waiting" && game && (
          <div className="space-y-4">
            <section className="bg-buck-card border border-white/10 rounded-2xl p-5 text-center">
              <div className="text-xs uppercase tracking-widest text-white/60 font-bold">
                Share this code
              </div>
              <div className="mt-2 text-5xl font-black tracking-[0.4em] text-buck-green">
                {game.code}
              </div>
              <div className="mt-3 text-sm text-white/60">
                Buy-in <span className="text-buck-gold font-black">${game.buy_in}</span>
              </div>
            </section>

            <section className="bg-buck-card border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm uppercase tracking-widest text-white/60 font-bold">
                  Players
                </h2>
                <span className="text-white/70 text-sm font-bold">
                  {players.length}/{MAX_PLAYERS}
                </span>
              </div>
              <ul className="space-y-2">
                {players.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 bg-buck-darker rounded-xl px-3 py-2 border border-white/5"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black"
                      style={{
                        backgroundColor:
                          PLAYER_COLORS[p.seat_index % PLAYER_COLORS.length],
                      }}
                    >
                      {p.display_name.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{p.display_name}</div>
                      {p.seat_index === 0 && (
                        <div className="text-[10px] uppercase tracking-widest text-buck-gold font-bold">
                          Host
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {userId && game.host_id === userId ? (
              <button
                onClick={handleStart}
                disabled={players.length < MIN_PLAYERS || busy}
                className="w-full py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-br from-buck-green to-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.35)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
              >
                {busy
                  ? "STARTING…"
                  : players.length < MIN_PLAYERS
                  ? `NEED ${MIN_PLAYERS - players.length} MORE PLAYER${
                      MIN_PLAYERS - players.length === 1 ? "" : "S"
                    }`
                  : "START GAME"}
              </button>
            ) : (
              <div className="text-center text-white/60 font-bold py-4">
                Waiting for host to start…
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
