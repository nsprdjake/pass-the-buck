import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-buck-dark via-buck-darker to-buck-dark">
      <div className="flex flex-col items-center text-center max-w-md w-full">
        <div className="text-8xl mb-4 animate-float select-none" aria-hidden>
          💵
        </div>

        <h1 className="text-5xl font-black tracking-tight leading-none">
          Pass the <span className="text-buck-green">Buck</span>
        </h1>

        <p className="mt-3 text-white/70 text-lg">Who&apos;s keeping theirs?</p>

        <Link
          href="/lobby"
          className="mt-10 w-full text-center py-4 rounded-2xl font-black text-lg text-white bg-gradient-to-br from-buck-green to-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.35)] active:scale-[0.98] transition-transform"
        >
          NEW GAME
        </Link>

        <div className="mt-10 grid grid-cols-3 gap-3 w-full">
          {[
            { emoji: "⚡", label: "Simple" },
            { emoji: "🚀", label: "Fast" },
            { emoji: "🎉", label: "Fun" },
          ].map((p) => (
            <div
              key={p.label}
              className="bg-buck-card/70 border border-white/10 rounded-full py-2 text-sm font-semibold text-white/90"
            >
              <span className="mr-1">{p.emoji}</span>
              {p.label}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
