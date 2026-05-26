"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createGame } from "@/lib/remote-game";

export default function CreateMultiGamePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [buyIn, setBuyIn] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { game } = await createGame({
        displayName: name.trim(),
        buyIn,
      });
      router.push(`/multi/${game.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create game");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-6 bg-gradient-to-b from-buck-dark via-buck-darker to-buck-dark">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/multi"
            className="text-white/70 hover:text-white text-sm font-bold"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-black">Create Game</h1>
          <div className="w-12" />
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <section className="bg-buck-card border border-white/10 rounded-2xl p-4">
            <label className="block text-xs uppercase tracking-widest text-white/60 font-bold mb-2">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoFocus
              placeholder="What should we call you?"
              className="w-full bg-buck-darker border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-buck-green"
            />
          </section>

          <section className="bg-buck-card border border-white/10 rounded-2xl p-4">
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

          {error && (
            <div className="bg-buck-coral/15 border border-buck-coral/40 rounded-xl px-4 py-3 text-buck-coral text-sm font-bold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!name.trim() || busy}
            className="w-full py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-br from-buck-green to-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.35)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
          >
            {busy ? "CREATING…" : "CREATE GAME"}
          </button>
        </form>

        <p className="text-center text-white/40 text-xs mt-6">
          You&apos;ll get a 6-letter code to share with other players.
        </p>
      </div>
    </main>
  );
}
