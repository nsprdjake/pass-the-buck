"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useRemoteGame } from "@/context/RemoteGameContext";
import { leaveOrKick } from "@/lib/remote-game";

export default function LobbyView({ code }: { code: string }) {
  const router = useRouter();
  const { game, players, me, isHost, start } = useRemoteGame();
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!game) return null;

  const canStart = players.length >= 2;

  async function handleStart() {
    if (!canStart || starting) return;
    setStarting(true);
    setErr(null);
    try {
      await start();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't start game");
      setStarting(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/multi/join?code=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  }

  async function handleLeave() {
    if (!me) return;
    if (!confirm("Leave this game?")) return;
    try {
      await leaveOrKick({ playerId: me.id });
    } catch {
      // ignore
    }
    router.replace("/multi");
  }

  async function handleKick(playerId: string, name: string) {
    if (!isHost) return;
    if (!confirm(`Kick ${name} from the lobby?`)) return;
    try {
      await leaveOrKick({ playerId });
    } catch {
      // ignore
    }
  }

  return (
    <main className="min-h-screen px-5 py-6 bg-gradient-to-b from-buck-dark via-buck-darker to-buck-dark">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleLeave}
            className="text-white/70 hover:text-white text-sm font-bold"
          >
            ← Leave
          </button>
          <h1 className="text-xl font-black">Lobby</h1>
          <div className="w-12" />
        </div>

        {/* Invite card */}
        <section className="bg-buck-card border border-white/10 rounded-2xl p-5 mb-4 text-center">
          <div className="text-[10px] uppercase tracking-[0.4em] text-white/50 font-black">
            Game code
          </div>
          <div className="my-3 font-black text-buck-gold tracking-[0.4em] text-5xl select-all">
            {code}
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyCode}
              className="flex-1 py-2 rounded-lg bg-buck-darker border border-white/10 font-black text-sm uppercase tracking-widest text-white/80 active:scale-95 transition-transform"
            >
              {copied ? "COPIED!" : "COPY CODE"}
            </button>
            <button
              onClick={copyLink}
              className="flex-1 py-2 rounded-lg bg-buck-darker border border-white/10 font-black text-sm uppercase tracking-widest text-white/80 active:scale-95 transition-transform"
            >
              COPY LINK
            </button>
          </div>
          <p className="text-white/40 text-xs mt-3">
            Share the code or link. Anyone with it can join.
          </p>
        </section>

        {/* Players */}
        <section className="bg-buck-card border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs uppercase tracking-widest text-white/60 font-bold">
              Players
            </h2>
            <span className="text-white/50 text-xs font-bold">
              {players.length}/12 · {game.buy_in} buck{game.buy_in === 1 ? "" : "s"} each
            </span>
          </div>
          {players.length === 0 ? (
            <div className="text-center text-white/40 py-8 text-sm">
              Waiting for players…
            </div>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {players.map((p) => {
                  const isMe = me?.id === p.id;
                  return (
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
                        {p.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate flex items-center gap-2">
                          {p.display_name}
                          {p.is_host && (
                            <span className="text-[9px] uppercase tracking-widest bg-buck-gold/20 text-buck-gold px-1.5 py-0.5 rounded">
                              Host
                            </span>
                          )}
                          {isMe && (
                            <span className="text-[9px] uppercase tracking-widest bg-buck-green/20 text-buck-green px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                          Seat {p.seat + 1}
                        </div>
                      </div>
                      {isHost && !isMe && (
                        <button
                          onClick={() => handleKick(p.id, p.display_name)}
                          className="text-white/40 hover:text-buck-coral text-lg font-black px-2"
                          aria-label={`Kick ${p.display_name}`}
                        >
                          ×
                        </button>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </section>

        {err && (
          <div className="bg-buck-coral/15 border border-buck-coral/40 rounded-xl px-4 py-3 text-buck-coral text-sm font-bold mb-4">
            {err}
          </div>
        )}

        {isHost ? (
          <button
            onClick={handleStart}
            disabled={!canStart || starting}
            className="w-full py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-br from-buck-green to-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.35)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
          >
            {starting
              ? "STARTING…"
              : canStart
              ? "START GAME"
              : "NEED AT LEAST 2 PLAYERS"}
          </button>
        ) : (
          <div className="text-center text-white/60 py-5 font-bold">
            Waiting for the host to start…
          </div>
        )}
      </div>
    </main>
  );
}
