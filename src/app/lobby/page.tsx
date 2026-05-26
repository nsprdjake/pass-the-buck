"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useLocalGame } from "@/context/LocalGameContext";

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 12;

export default function LobbyPage() {
  const router = useRouter();
  const {
    status,
    players,
    buyIn,
    addPlayer,
    removePlayer,
    setBuyIn,
    startGame,
    newGame,
  } = useLocalGame();

  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // If a previous game is mid-play, offer to resume or start fresh.
  useEffect(() => {
    if (status === "active") {
      router.replace("/game/local");
    }
  }, [status, router]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (players.length >= MAX_PLAYERS) return;
    addPlayer(name);
    setName("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleStart() {
    if (players.length < MIN_PLAYERS) return;
    startGame();
    router.push("/game/local");
  }

  const canStart = players.length >= MIN_PLAYERS;

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
          <h1
            className="text-3xl"
            style={{
              fontFamily: "var(--font-rye), Georgia, serif",
              color: "#f4e4b7",
              textShadow: "0 2px 0 rgba(0,0,0,0.55)",
            }}
          >
            Saloon
          </h1>
          <button
            onClick={newGame}
            className="text-white/50 hover:text-white text-xs font-bold uppercase tracking-widest"
            title="Clear all players"
          >
            Clear
          </button>
        </div>

        <section className="bg-buck-card border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs uppercase tracking-widest text-white/60 font-bold">
              Buy-in
            </label>
            <span className="text-buck-gold font-black text-lg">
              {buyIn} buck{buyIn === 1 ? "" : "s"}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={9}
            step={1}
            value={buyIn}
            onChange={(e) => setBuyIn(parseInt(e.target.value, 10))}
            className="w-full accent-buck-green"
          />
          <p className="text-white/40 text-xs mt-2">
            Each player starts with this many bucks. They roll one die per
            buck they hold, up to 3 dice per turn.
          </p>
        </section>

        <section className="bg-buck-card border border-white/10 rounded-2xl p-4 mb-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                players.length === 0
                  ? "First player's name"
                  : "Add another player"
              }
              maxLength={20}
              disabled={players.length >= MAX_PLAYERS}
              className="flex-1 bg-buck-darker border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-buck-green disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!name.trim() || players.length >= MAX_PLAYERS}
              className="px-5 rounded-xl font-black bg-buck-green text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
            >
              ADD
            </button>
          </form>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs uppercase tracking-widest text-white/60 font-bold">
                Players
              </h2>
              <span className="text-white/50 text-xs font-bold">
                {players.length}/{MAX_PLAYERS}
              </span>
            </div>
            {players.length === 0 ? (
              <div className="text-center text-white/40 py-8 text-sm">
                Add at least {MIN_PLAYERS} players to start
              </div>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {players.map((p, i) => (
                    <motion.li
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 40, scale: 0.9 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center gap-3 bg-buck-darker rounded-xl px-3 py-2 border border-white/5"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black flex-shrink-0"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{p.name}</div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                          Seat {i + 1}
                        </div>
                      </div>
                      <button
                        onClick={() => removePlayer(p.id)}
                        className="text-white/40 hover:text-buck-coral text-lg font-black px-2"
                        aria-label={`Remove ${p.name}`}
                      >
                        ×
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </section>

        <button
          onClick={handleStart}
          disabled={!canStart}
          className="w-full py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-br from-buck-green to-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.35)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
        >
          {canStart
            ? "START GAME"
            : `NEED ${MIN_PLAYERS - players.length} MORE PLAYER${
                MIN_PLAYERS - players.length === 1 ? "" : "S"
              }`}
        </button>

        <p className="text-center text-white/40 text-xs mt-4">
          Pass-and-play on one device. No accounts, no setup.
        </p>
      </div>
    </main>
  );
}
