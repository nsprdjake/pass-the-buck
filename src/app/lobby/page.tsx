"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_COLORS,
  STARTING_BALANCE,
} from "@/lib/constants";
import type { Player } from "@/lib/types";

type DraftPlayer = {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
};

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeGameId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function LobbyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [players, setPlayers] = useState<DraftPlayer[]>([
    { id: "host", name: "You", color: PLAYER_COLORS[0], isHost: true },
  ]);
  const [buyIn, setBuyIn] = useState(5);
  const [turnTimer, setTurnTimer] = useState(0); // 0 = off
  const [starting, setStarting] = useState(false);

  const canAdd = name.trim().length > 0 && players.length < MAX_PLAYERS;
  const canStart = players.length >= MIN_PLAYERS && !starting;
  const pot = buyIn * players.length;

  function addPlayer() {
    const trimmed = name.trim();
    if (!trimmed || players.length >= MAX_PLAYERS) return;
    const color = PLAYER_COLORS[players.length % PLAYER_COLORS.length];
    setPlayers((prev) => [
      ...prev,
      { id: makeId(), name: trimmed, color, isHost: false },
    ]);
    setName("");
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id || p.isHost));
  }

  function startGame() {
    if (!canStart) return;
    setStarting(true);
    const gameId = makeGameId();
    const seeded: Player[] = players.map((p, i) => ({
      id: p.id,
      name: p.name,
      bucks: STARTING_BALANCE,
      eliminated: false,
      color: p.color,
      order: i,
    }));
    const config = {
      id: gameId,
      buyIn,
      turnTimer: turnTimer || null,
      players: seeded,
      createdAt: new Date().toISOString(),
    };
    try {
      sessionStorage.setItem(`ptb:game:${gameId}`, JSON.stringify(config));
    } catch {
      // sessionStorage may be unavailable; route still proceeds
    }
    router.push(`/game/${gameId}`);
  }

  return (
    <main className="min-h-screen px-5 py-6 bg-gradient-to-b from-buck-dark via-buck-darker to-buck-dark">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="text-white/70 hover:text-white text-sm font-bold"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-black">Lobby</h1>
          <div className="w-12" />
        </div>

        <section className="bg-buck-card border border-white/10 rounded-2xl p-4 mb-4">
          <label className="block text-xs uppercase tracking-widest text-white/60 font-bold mb-2">
            Add player
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addPlayer();
              }}
              placeholder="Player name"
              maxLength={20}
              className="flex-1 bg-buck-darker border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-buck-green"
            />
            <button
              onClick={addPlayer}
              disabled={!canAdd}
              className="bg-buck-green disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-5 rounded-xl active:scale-[0.98] transition-transform"
            >
              +
            </button>
          </div>
        </section>

        <section className="bg-buck-card border border-white/10 rounded-2xl p-4 mb-4">
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
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{p.name}</div>
                  {p.isHost && (
                    <div className="text-[10px] uppercase tracking-widest text-buck-gold font-bold">
                      Host
                    </div>
                  )}
                </div>
                {!p.isHost && (
                  <button
                    onClick={() => removePlayer(p.id)}
                    aria-label={`Remove ${p.name}`}
                    className="text-buck-coral text-xl px-2 active:scale-90 transition-transform"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-buck-card border border-white/10 rounded-2xl p-4 mb-4 space-y-5">
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

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-sm text-white/70 font-bold">Total pot</span>
            <span className="text-buck-gold font-black text-lg">${pot}</span>
          </div>
        </section>

        <button
          onClick={startGame}
          disabled={!canStart}
          className="w-full py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-br from-buck-green to-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.35)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
        >
          {starting
            ? "STARTING…"
            : players.length < MIN_PLAYERS
            ? `NEED ${MIN_PLAYERS - players.length} MORE PLAYER${
                MIN_PLAYERS - players.length === 1 ? "" : "S"
              }`
            : "START GAME"}
        </button>
      </div>
    </main>
  );
}
