"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import GameHeader from "@/components/GameHeader";
import PlayerCard from "@/components/PlayerCard";
import RollButton from "@/components/RollButton";
import BuckRow from "@/components/BuckRow";
import { useGame } from "@/hooks/useGame";
import type { RollOutcome } from "@/lib/types";

const OUTCOME_META: Record<RollOutcome, { emoji: string; label: string }> = {
  left: { emoji: "⬅️", label: "Left" },
  right: { emoji: "➡️", label: "Right" },
  center: { emoji: "⬇️", label: "Center" },
  keep: { emoji: "✊", label: "Keep" },
};

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 1.5;
        const duration = 2 + Math.random() * 2;
        const colors = [
          "#10B981",
          "#FBBF24",
          "#60A5FA",
          "#F97066",
          "#A78BFA",
          "#F472B6",
        ];
        const color = colors[i % colors.length];
        return { left, delay, duration, color };
      }),
    []
  );
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden z-50"
      aria-hidden
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 w-2 h-3 rounded-sm animate-confetti"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  const {
    game,
    players,
    playerRows,
    outcomes,
    rolling,
    loading,
    winner,
    rollDice,
  } = useGame(id);

  if (loading || !game) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-buck-dark">
        <div className="text-white/60 font-bold">Loading game…</div>
      </main>
    );
  }

  if (game.status === "finished" && winner) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-buck-dark via-buck-darker to-buck-dark relative">
        <Confetti />
        <div className="relative z-10 text-center max-w-md w-full">
          <div className="text-7xl mb-4 animate-pop-in">🏆</div>
          <div className="text-xs uppercase tracking-widest text-white/60 font-bold">
            Winner
          </div>
          <h1 className="mt-1 text-4xl font-black">
            <span style={{ color: winner.color }}>{winner.name}</span>
          </h1>
          <div className="mt-6 inline-flex items-center gap-2 bg-buck-gold/15 border border-buck-gold/40 rounded-full px-5 py-3">
            <span className="text-buck-gold text-2xl">💰</span>
            <span className="text-buck-gold font-black text-2xl">
              ${game.pot * game.buy_in}
            </span>
          </div>
          <p className="mt-3 text-white/70">
            Pot of {game.pot} buck{game.pot === 1 ? "" : "s"}
          </p>
          <button
            onClick={() => router.push("/lobby")}
            className="mt-10 w-full py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-br from-buck-green to-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.35)] active:scale-[0.98] transition-transform"
          >
            PLAY AGAIN
          </button>
        </div>
      </main>
    );
  }

  const currentIdx = game.current_turn_index;
  const current = players[currentIdx];
  if (!current) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-buck-dark">
        <div className="text-white/60 font-bold">Waiting for players…</div>
      </main>
    );
  }

  const currentRow = playerRows[currentIdx];
  const isMyTurn = !!userId && currentRow?.user_id === userId;
  const round = 1;

  return (
    <main className="min-h-screen px-4 pt-5 pb-32 bg-gradient-to-b from-buck-dark via-buck-darker to-buck-dark">
      <div className="max-w-md mx-auto">
        <GameHeader round={round} pot={game.pot} />

        <section className="mt-5 bg-buck-card border border-white/10 rounded-3xl p-5 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${current.color}33 0%, transparent 70%)`,
            }}
          />
          <div className="relative">
            <div className="text-xs uppercase tracking-widest text-white/60 font-bold">
              {isMyTurn ? "Your turn" : "Current turn"}
            </div>
            <div className="mt-2 flex items-center justify-center gap-3">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-2xl"
                style={{ backgroundColor: current.color }}
              >
                {current.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="text-2xl font-black">{current.name}</div>
                <div className="text-white/60 text-sm">
                  {current.bucks} buck{current.bucks === 1 ? "" : "s"} ·{" "}
                  {Math.min(current.bucks, 3)} roll
                  {Math.min(current.bucks, 3) === 1 ? "" : "s"}
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <BuckRow
                count={current.bucks}
                max={9}
                color={current.color}
                size={20}
              />
            </div>

            <div className="mt-5 min-h-[68px] flex items-center justify-center gap-3 flex-wrap">
              {outcomes.length === 0 && !rolling && (
                <div className="text-white/40 text-sm">
                  {isMyTurn
                    ? "Tap below to roll the dice"
                    : `Waiting on ${current.name}…`}
                </div>
              )}
              {rolling && outcomes.length === 0 && (
                <div className="text-white/70 text-sm font-bold animate-pulse">
                  Rolling…
                </div>
              )}
              {outcomes.map((o, i) => (
                <div
                  key={i}
                  className="animate-pop-in bg-buck-darker border border-white/10 rounded-2xl px-3 py-2 flex flex-col items-center min-w-[60px]"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <span className="text-2xl">{OUTCOME_META[o].emoji}</span>
                  <span className="text-[10px] uppercase tracking-widest text-white/70 font-bold mt-0.5">
                    {OUTCOME_META[o].label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5">
          <h2 className="text-xs uppercase tracking-widest text-white/60 font-bold mb-3">
            Players
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {players.map((p, i) => (
              <PlayerCard
                key={p.id}
                player={p}
                active={i === currentIdx && game.status === "active"}
              />
            ))}
          </div>
        </section>
      </div>

      {isMyTurn && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-4 bg-gradient-to-t from-buck-dark via-buck-dark/95 to-transparent">
          <div className="max-w-md mx-auto">
            <RollButton
              onRoll={() => void rollDice()}
              rolling={rolling}
              disabled={game.status !== "active" || current.bucks <= 0}
              color={current.color}
            />
          </div>
        </div>
      )}
    </main>
  );
}
