"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRemoteGame } from "@/context/RemoteGameContext";
import { getMembership } from "@/lib/identity";
import LobbyView from "./lobby";
import ActiveGameView from "./active";
import FinishedView from "./finished";

export default function MultiGameShell({ code }: { code: string }) {
  const router = useRouter();
  const { loading, error, game, isMember } = useRemoteGame();

  // If we don't have a membership for this code, kick to /multi/join?code=…
  useEffect(() => {
    if (loading || !game) return;
    if (!isMember) {
      const m = getMembership(code);
      if (!m) {
        router.replace(`/multi/join?code=${code}`);
      }
    }
  }, [loading, game, isMember, code, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-buck-dark">
        <div className="text-white/60 font-bold">Loading game…</div>
      </main>
    );
  }

  if (error || !game) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-buck-dark text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-black">Game not found</h1>
        <p className="mt-2 text-white/60">{error ?? "That code doesn't match any game."}</p>
        <button
          onClick={() => router.replace("/multi")}
          className="mt-8 px-6 py-3 rounded-xl font-black bg-buck-green text-white active:scale-95 transition-transform"
        >
          BACK
        </button>
      </main>
    );
  }

  if (game.status === "lobby") return <LobbyView code={code} />;
  if (game.status === "active") return <ActiveGameView />;
  return <FinishedView code={code} />;
}
