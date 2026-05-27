"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import FinishedScreen from "@/components/game/FinishedScreen";
import { useRemoteGame } from "@/context/RemoteGameContext";
import { playSfx } from "@/lib/sfx";

export default function FinishedView({ code }: { code: string }) {
  const router = useRouter();
  const { game, players } = useRemoteGame();

  useEffect(() => {
    // Only play the celebratory cue for winner mode. Loser mode is
    // intentionally quiet — the silence is the punchline.
    if (game?.mode !== "loser") {
      playSfx("winner");
    }
  }, [game?.mode]);

  if (!game) return null;
  const finalist =
    players.find((p) => p.id === game.winner_player_id) ??
    players.find((p) => p.bucks > 0) ??
    players[0];

  if (!finalist) return null;

  return (
    <FinishedScreen
      mode={game.mode}
      wager={game.wager}
      playerName={finalist.display_name}
      playerColor={finalist.color}
      finalBucks={finalist.bucks}
      pot={game.pot}
      onRematch={() => router.replace(`/multi/${code}`)}
      onExit={() => router.replace("/multi")}
      rematchLabel={game.mode === "loser" ? "Best Two Outta Three" : "Refresh"}
      exitLabel="Done"
    />
  );
}
