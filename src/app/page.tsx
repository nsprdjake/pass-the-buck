"use client";

import Link from "next/link";
import { useLocalGame } from "@/context/LocalGameContext";
import { BillStack, Bolt, Smile, Sparkle } from "@/components/icons";

export default function Home() {
  const { status, players } = useLocalGame();
  const inProgress = status === "active" && players.length > 0;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-buck-dark via-buck-darker to-buck-dark">
      <div className="flex flex-col items-center text-center max-w-md w-full">
        <div className="mb-4 animate-float select-none flex justify-center" aria-hidden>
          <BillStack size={140} />
        </div>

        <h1 className="text-5xl font-black tracking-tight leading-none">
          Pass the <span className="text-buck-green">Buck</span>
        </h1>

        <p className="mt-3 text-white/70 text-lg">Who&apos;s keeping theirs?</p>

        {inProgress && (
          <Link
            href="/game/local"
            className="mt-10 w-full text-center py-4 rounded-2xl font-black text-lg text-buck-dark bg-buck-gold shadow-[0_10px_30px_rgba(251,191,36,0.35)] active:scale-[0.98] transition-transform"
          >
            CONTINUE GAME
          </Link>
        )}

        <Link
          href="/lobby"
          className={`${
            inProgress ? "mt-3" : "mt-10"
          } w-full text-center py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-br from-buck-green to-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.35)] active:scale-[0.98] transition-transform`}
        >
          <span className="block">PLAY ON THIS DEVICE</span>
          <span className="block text-xs font-bold uppercase tracking-widest text-white/70 mt-1">
            Pass-and-play, no setup
          </span>
        </Link>

        <Link
          href="/multi"
          className="mt-3 w-full text-center py-5 rounded-2xl font-black text-lg text-buck-dark bg-buck-gold shadow-[0_10px_30px_rgba(251,191,36,0.35)] active:scale-[0.98] transition-transform"
        >
          <span className="block">PLAY ACROSS DEVICES</span>
          <span className="block text-xs font-bold uppercase tracking-widest text-buck-dark/70 mt-1">
            Each player on their own phone
          </span>
        </Link>

        <div className="mt-10 grid grid-cols-3 gap-3 w-full">
          {[
            { Icon: Sparkle, label: "Simple", color: "#A78BFA" },
            { Icon: Bolt, label: "Fast", color: "#FBBF24" },
            { Icon: Smile, label: "Fun", color: "#F472B6" },
          ].map(({ Icon, label, color }) => (
            <div
              key={label}
              className="bg-buck-card/70 border border-white/10 rounded-full py-2 text-sm font-semibold text-white/90 flex items-center justify-center gap-1.5"
            >
              <Icon size={16} color={color} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
