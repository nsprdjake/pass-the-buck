"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { joinGame } from "@/lib/remote-game";

function JoinForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [code, setCode] = useState(search.get("code")?.toUpperCase() ?? "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { game } = await joinGame({
        code: code.trim().toUpperCase(),
        displayName: name.trim(),
      });
      router.push(`/multi/${game.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join game");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleJoin} className="space-y-4">
      <section className="bg-buck-card border border-white/10 rounded-2xl p-4">
        <label className="block text-xs uppercase tracking-widest text-white/60 font-bold mb-2">
          Game code
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
          }
          maxLength={6}
          autoFocus
          autoCapitalize="characters"
          placeholder="6-letter code"
          className="w-full bg-buck-darker border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-buck-green text-center font-black text-3xl tracking-[0.5em] uppercase"
        />
      </section>

      <section className="bg-buck-card border border-white/10 rounded-2xl p-4">
        <label className="block text-xs uppercase tracking-widest text-white/60 font-bold mb-2">
          Your name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="What should we call you?"
          className="w-full bg-buck-darker border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-buck-green"
        />
      </section>

      {error && (
        <div className="bg-buck-coral/15 border border-buck-coral/40 rounded-xl px-4 py-3 text-buck-coral text-sm font-bold">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={code.length < 4 || !name.trim() || busy}
        className="w-full py-5 rounded-2xl font-black text-lg text-buck-dark bg-buck-gold shadow-[0_10px_30px_rgba(251,191,36,0.35)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
      >
        {busy ? "JOINING…" : "JOIN GAME"}
      </button>
    </form>
  );
}

export default function JoinMultiGamePage() {
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
          <h1
            className="text-2xl"
            style={{
              fontFamily: "var(--font-rye), Georgia, serif",
              color: "#f4e4b7",
            }}
          >
            Pull Up A Chair
          </h1>
          <div className="w-12" />
        </div>
        <Suspense
          fallback={
            <div className="text-center text-white/50 py-8 font-bold">
              Loading…
            </div>
          }
        >
          <JoinForm />
        </Suspense>
      </div>
    </main>
  );
}
