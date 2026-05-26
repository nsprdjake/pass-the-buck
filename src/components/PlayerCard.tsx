import BuckRow from "./BuckRow";
import type { Player } from "@/lib/types";

type PlayerCardProps = {
  player: Player;
  active?: boolean;
};

export default function PlayerCard({ player, active = false }: PlayerCardProps) {
  const initial = player.name.trim().charAt(0).toUpperCase() || "?";
  const isOut = player.eliminated || player.bucks <= 0;

  return (
    <div
      className={[
        "rounded-2xl p-3 transition-all",
        "bg-buck-card border",
        active ? "border-buck-gold shadow-[0_0_24px_rgba(251,191,36,0.35)]" : "border-white/10",
        isOut ? "opacity-50" : "opacity-100",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg flex-shrink-0"
          style={{ backgroundColor: player.color }}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={[
              "font-bold text-sm truncate",
              isOut ? "line-through text-white/60" : "text-white",
            ].join(" ")}
          >
            {player.name}
          </div>
          <div className="text-xs text-white/60">
            {isOut ? "Eliminated" : `${player.bucks} buck${player.bucks === 1 ? "" : "s"}`}
          </div>
        </div>
      </div>
      <div className="mt-2">
        <BuckRow count={player.bucks} max={9} color={player.color} size={14} />
      </div>
    </div>
  );
}
