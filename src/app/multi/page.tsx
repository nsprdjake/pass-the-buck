"use client";

import Link from "next/link";
import { Phone } from "@/components/icons";

export default function MultiLandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-buck-dark via-buck-darker to-buck-dark">
      <div className="flex flex-col items-center text-center max-w-md w-full">
        <Link
          href="/"
          className="self-start text-white/60 hover:text-white text-sm font-bold mb-6"
        >
          ← Home
        </Link>

        <div className="mb-3 flex justify-center" aria-hidden>
          <Phone size={88} color="#10B981" />
        </div>
        <h1
          className="leading-tight"
          style={{
            fontFamily: "var(--font-rye), Georgia, serif",
            fontSize: "clamp(2rem, 9vw, 3.5rem)",
            color: "#f4e4b7",
            textShadow: "0 3px 0 rgba(0,0,0,0.55)",
          }}
        >
          Saloon by Wire
        </h1>
        <p
          className="mt-3 italic"
          style={{
            fontFamily: "var(--font-fell), Georgia, serif",
            color: "rgba(244,228,183,0.8)",
          }}
        >
          Every cowpoke on their own phone. Ride into the game whenever you
          please — no need to share a table.
        </p>

        <Link
          href="/multi/create"
          className="mt-10 w-full text-center py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-br from-buck-green to-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.35)] active:scale-[0.98] transition-transform"
        >
          CREATE GAME
        </Link>

        <Link
          href="/multi/join"
          className="mt-3 w-full text-center py-5 rounded-2xl font-black text-lg text-buck-dark bg-buck-gold shadow-[0_10px_30px_rgba(251,191,36,0.35)] active:scale-[0.98] transition-transform"
        >
          JOIN WITH CODE
        </Link>

        <p className="mt-8 text-white/40 text-xs">
          No accounts. Pick a name, share a 6-letter code, and play.
        </p>
      </div>
    </main>
  );
}
