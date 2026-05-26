"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Buck from "@/components/Buck";
import { Confetti } from "@/components/game/shared";
import { MoneyBag, Trophy } from "@/components/icons";
import { useRemoteGame } from "@/context/RemoteGameContext";
import { playSfx } from "@/lib/sfx";

export default function FinishedView({ code }: { code: string }) {
  const router = useRouter();
  const { game, players } = useRemoteGame();

  useEffect(() => {
    playSfx("winner");
  }, []);

  if (!game) return null;
  const winner =
    players.find((p) => p.id === game.winner_player_id) ??
    players.find((p) => p.bucks > 0) ??
    players[0];
  const totalTaken = (winner?.bucks ?? 0) + game.pot;

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #0d5c3f 0%, #073d28 60%, #03200f 100%)",
      }}
    >
      <Confetti />
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{
              y: -80,
              x: `${Math.random() * 100}vw`,
              rotate: 0,
              opacity: 0,
            }}
            animate={{
              y: "110vh",
              rotate: 720,
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 3.5 + Math.random() * 2,
              delay: Math.random() * 2,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute"
          >
            <Buck height={28} />
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-50 text-center max-w-md w-full"
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: [0, 1.3, 1], rotate: [-20, 8, 0] }}
          transition={{ duration: 0.7, times: [0, 0.7, 1] }}
          className="mb-4 flex justify-center"
        >
          <Trophy size={128} />
        </motion.div>
        <div className="text-xs uppercase tracking-[0.4em] text-buck-gold font-black">
          Winner
        </div>
        <motion.h1
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          className="mt-2 text-6xl font-black leading-tight"
          style={{ color: winner?.color }}
        >
          {winner?.display_name}
        </motion.h1>
        <div className="mt-6 inline-flex items-center gap-2 bg-buck-gold/15 border-2 border-buck-gold/40 rounded-full px-5 py-3">
          <MoneyBag size={28} />
          <span className="text-buck-gold font-black text-2xl">
            {totalTaken} buck{totalTaken === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-3 text-white/70">
          Pot of {game.pot} buck{game.pot === 1 ? "" : "s"} + their last{" "}
          {winner?.bucks ?? 0}
        </p>
        <button
          onClick={() => router.replace(`/multi/${code}`)}
          className="mt-10 w-full py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-br from-buck-green to-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.35)] active:scale-[0.98] transition-transform"
        >
          REFRESH
        </button>
        <button
          onClick={() => router.replace("/multi")}
          className="mt-3 w-full py-4 rounded-2xl font-black text-white/70 bg-buck-card border border-white/10 active:scale-[0.98] transition-transform"
        >
          DONE
        </button>
      </motion.div>
    </main>
  );
}
