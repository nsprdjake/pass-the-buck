"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import FinishedScreen from "@/components/game/FinishedScreen";
import { useAuth } from "@/context/AuthContext";
import { useRemoteGame } from "@/context/RemoteGameContext";
import { settleGameRewards } from "@/lib/remote-game";
import { playSfx } from "@/lib/sfx";

export default function FinishedView({ code }: { code: string }) {
  const router = useRouter();
  const { game, players } = useRemoteGame();
  const { user, refreshProfile } = useAuth();

  useEffect(() => {
    // Only play the celebratory cue for winner mode. Loser mode is
    // intentionally quiet — the silence is the punchline.
    if (game?.mode !== "loser") {
      playSfx("winner");
    }
  }, [game?.mode]);

  // Settle eyeBuck rewards on game-end. Server-side function is idempotent,
  // so multiple devices arriving here in parallel all converge to one payout.
  // Refreshes the signed-in user's profile so their balance bump is visible
  // when they tap back to the landing.
  useEffect(() => {
    if (!game) return;
    if (game.status !== "finished") return;
    let cancelled = false;
    (async () => {
      try {
        await settleGameRewards(game.id);
        if (cancelled) return;
        if (user) await refreshProfile();
      } catch {
        // Silent: settlement is best-effort. Server retries are cheap and
        // surfacing this would only confuse a player on the finished screen.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [game, user, refreshProfile]);

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
