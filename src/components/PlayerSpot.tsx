"use client";

import { motion } from "framer-motion";
import BuckStack from "./BuckStack";
import type { Player } from "@/lib/types";

type PlayerSpotProps = {
  player: Player;
  bucks: string[]; // synthetic ids matching player's current chip pile
  active?: boolean;
  // Position on table as percentages (0–100). The spot is anchored at its
  // center so it sits visually at that point on the felt.
  x: number;
  y: number;
};

export default function PlayerSpot({
  player,
  bucks,
  active = false,
  x,
  y,
}: PlayerSpotProps) {
  const initial = player.name.trim().charAt(0).toUpperCase() || "?";
  const isOut = bucks.length <= 0;

  return (
    <div
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="flex flex-col items-center gap-1">
        {/* Chip stack sits above the name plate */}
        <div className="h-12 flex items-end justify-center">
          <BuckStack bucks={bucks} color={player.color} chipSize={26} />
        </div>

        {/* Name plate */}
        <motion.div
          animate={{
            scale: active ? 1.05 : 1,
          }}
          transition={{ duration: 0.25 }}
          className="relative"
        >
          {/* Spotlight glow when active */}
          {active && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 -m-3 rounded-full blur-xl"
              style={{
                background: `radial-gradient(circle, ${player.color}88 0%, transparent 70%)`,
              }}
            />
          )}
          <div
            className={[
              "relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl",
              "border backdrop-blur-sm",
              active
                ? "border-buck-gold shadow-[0_0_18px_rgba(251,191,36,0.6)]"
                : "border-white/15",
              isOut ? "opacity-50" : "opacity-100",
            ].join(" ")}
            style={{
              background: active
                ? `linear-gradient(180deg, ${player.color}cc 0%, ${player.color}66 100%)`
                : "rgba(0,0,0,0.4)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                style={{ backgroundColor: player.color }}
              >
                {initial}
              </div>
              <span className="font-black text-xs text-white truncate max-w-[68px]">
                {player.name}
              </span>
            </div>
            <div className="text-[10px] font-bold text-white/80 leading-tight">
              {bucks.length} {bucks.length === 1 ? "buck" : "bucks"}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
