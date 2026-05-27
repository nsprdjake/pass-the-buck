"use client";

import Link from "next/link";
import Buck from "@/components/Buck";
import Die from "@/components/Die";
import { ArrowLeft, ArrowRight, ArrowDown, Asterisk } from "@/components/icons";

const RYE: React.CSSProperties = {
  fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
};
const FELL: React.CSSProperties = {
  fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
};

export default function HowToPlayPage() {
  return (
    <main className="felt-saloon relative min-h-[100dvh] overflow-hidden">
      <div
        aria-hidden
        className="wood-grain pointer-events-none absolute inset-x-0 top-0 h-3 shadow-[0_4px_14px_rgba(0,0,0,0.55)]"
      />
      <div
        aria-hidden
        className="wood-grain pointer-events-none absolute inset-x-0 bottom-0 h-3 shadow-[0_-4px_14px_rgba(0,0,0,0.55)]"
      />

      <div className="relative mx-auto max-w-md px-5 pt-7 pb-12">
        {/* Top bar */}
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center">
          <Link
            href="/"
            className="justify-self-start text-[0.78rem] font-bold text-[var(--parchment-light)]/75 transition-colors hover:text-[var(--accent-light)]"
            style={FELL}
          >
            ← Back
          </Link>
          <h1
            className="justify-self-center"
            style={{
              ...RYE,
              fontSize: "clamp(1.6rem, 6.5vw, 2.1rem)",
              color: "var(--parchment-light)",
              textShadow:
                "0 2px 0 var(--wood-mid), 0 3px 0 rgba(0,0,0,0.45), 0 6px 16px rgba(0,0,0,0.55)",
              letterSpacing: "0.02em",
            }}
          >
            House Rules
          </h1>
          <div />
        </div>

        {/* Eyebrow */}
        <p
          className="mb-7 text-center text-[0.95rem] italic leading-snug text-[var(--parchment-light)]/80"
          style={FELL}
        >
          Three dice, a fistful of eyeBucks, and a saloon&apos;s worth of
          nerve. Here&apos;s how a hand goes down.
        </p>

        {/* ─── Section 1: How a Hand Works ─── */}
        <SectionTitle eyebrow="The Loop" title="How a Hand Works" />

        <Step
          n={1}
          heading="Ante Up"
          body={
            <>
              Every player starts with the same number of{" "}
              <Currency /> — the host picks the buy-in (1 to 9) when setting
              the table.
            </>
          }
          visual={
            <div className="flex items-end justify-center gap-1 py-2">
              <Buck height={28} />
              <Buck height={28} />
              <Buck height={28} />
            </div>
          }
        />

        <Step
          n={2}
          heading="Roll Your Dice"
          body={
            <>
              On your turn, roll one die for every <Currency /> you&apos;re
              holding — <Em>up to three</Em>. Out of eyeBucks? Your turn is
              skipped.
            </>
          }
          visual={
            <div className="flex justify-center gap-2 py-2">
              <Die size={42} outcome="left" />
              <Die size={42} outcome="keep" />
              <Die size={42} outcome="right" />
            </div>
          }
        />

        <Step
          n={3}
          heading="Read the Dice"
          body={
            <>
              Each die tells you what happens to <Em>one</Em> of your
              eyeBucks. The four faces:
            </>
          }
          visual={<DieFacesGrid />}
        />

        <Step
          n={4}
          heading="Pass the Buck"
          body={
            <>
              Hand the phone to the next player (pass-and-play) or wait for
              your seat across devices. Repeat.
            </>
          }
        />

        <Step
          n={5}
          heading="Last One Holding"
          body={
            <>
              The hand ends when only one player still has any eyeBucks. What
              happens to that player depends on the mode you picked at the
              table.
            </>
          }
        />

        {/* ─── Section 2: The Two Modes ─── */}
        <div className="mt-10">
          <SectionTitle eyebrow="Choose Your Stakes" title="The Two Modes" />
        </div>

        <ModeCard
          accent="var(--accent-light)"
          title="Last eyeBuck Wins"
          subtitle="Sole champion takes the pot"
          body={
            <>
              The classic. Last player still holding eyeBucks is crowned
              champion and rakes in the pot. Strategy: <Em>hoard</Em>{" "}
              eyeBucks — root for ✱ (keep) and pray the dice don&apos;t move.
              <br />
              <br />
              <span className="text-[var(--parchment-light)]/60">
                Optional: ante real cash before you start — a buck a buy-in,
                a five, whatever — and settle up at the end. Exchange in
                person or send it digitally on your word. The eyeBucks
                just keep score; the trust is on you.
              </span>
            </>
          }
          example="“Winner takes the bottle. Or the pot.”"
        />

        <ModeCard
          accent="#c43838"
          title="Stuck with the Tab"
          subtitle="Last eyeBuck pays the wager"
          body={
            <>
              Same dice, flipped framing. The last player holding an eyeBuck
              is <Em>stuck with the tab</Em> and owes whatever wager the host
              set. Strategy inverts: <Em>bleed</Em> eyeBucks — root for L, R,
              and C.
            </>
          }
          example="“Loser buys dinner.”"
        />

        <p
          className="mt-6 text-center text-[0.82rem] italic leading-snug text-[var(--parchment-light)]/55"
          style={FELL}
        >
          The mechanics never change. Only who&apos;s the hero and who&apos;s
          the goat.
        </p>

        {/* ─── CTA ─── */}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/lobby"
            className="brass-cta block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[var(--accent-dark)] py-4 text-center transition-transform active:scale-[0.985]"
          >
            <span
              className="relative block text-[1.05rem] font-bold uppercase text-[var(--wood-dark)]"
              style={{
                ...RYE,
                letterSpacing: "0.22em",
                textShadow: "0 1px 0 rgba(255,240,200,0.55)",
              }}
            >
              Saddle Up
            </span>
            <span
              className="relative mt-0.5 block text-[0.62rem] uppercase text-[var(--wood-dark)]/75"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              Pass-and-play right here
            </span>
          </Link>
          <Link
            href="/multi"
            className="relative block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[var(--accent-mid)]/55 py-3.5 text-center transition-colors hover:border-[var(--accent-light)]/80 active:scale-[0.985]"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,30,20,0.7) 100%)",
              boxShadow:
                "0 1px 0 rgba(244,228,183,0.06) inset, 0 8px 22px rgba(0,0,0,0.4)",
            }}
          >
            <span
              className="relative block text-[1.05rem] font-bold uppercase text-[var(--parchment-light)]"
              style={{
                ...RYE,
                letterSpacing: "0.22em",
                textShadow: "0 2px 0 rgba(0,0,0,0.55)",
              }}
            >
              Play Across Devices
            </span>
          </Link>
        </div>
      </div>

      <style jsx>{`
        :global(.brass-cta) {
          background: linear-gradient(
            180deg,
            #ffd989 0%,
            #d8a93b 48%,
            #a07a22 100%
          );
          box-shadow: 0 1px 0 rgba(255, 240, 200, 0.85) inset,
            0 -2px 0 rgba(60, 40, 8, 0.35) inset,
            0 10px 26px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </main>
  );
}

// ─── Section title with eyebrow + flourish underline ─────────────
function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-4 text-center">
      <div
        className="text-[0.6rem] uppercase text-[var(--parchment-light)]/55"
        style={{ ...FELL, letterSpacing: "0.4em" }}
      >
        {eyebrow}
      </div>
      <h2
        className="mt-1 text-[1.45rem]"
        style={{
          ...RYE,
          color: "var(--parchment-light)",
          textShadow: "0 2px 0 var(--wood-mid), 0 3px 0 rgba(0,0,0,0.45)",
          letterSpacing: "0.02em",
        }}
      >
        {title}
      </h2>
      <div className="mt-2 flex justify-center">
        <div className="h-px w-20 bg-[var(--accent-mid)]/40" />
      </div>
    </div>
  );
}

// ─── A numbered "step" block: badge + heading + body + optional visual ─
function Step({
  n,
  heading,
  body,
  visual,
}: {
  n: number;
  heading: string;
  body: React.ReactNode;
  visual?: React.ReactNode;
}) {
  return (
    <section
      className="relative mb-3 rounded-[16px] border-[1.5px] border-[var(--accent-mid)]/35 p-4"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,40,28,0.65) 0%, rgba(5,28,20,0.78) 100%)",
        boxShadow:
          "0 1px 0 rgba(244,228,183,0.06) inset, 0 14px 30px rgba(0,0,0,0.45)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[1rem] font-bold text-[var(--wood-dark)]"
          style={{
            background:
              "linear-gradient(180deg, #ffd989 0%, #d8a93b 48%, #a07a22 100%)",
            border: "1.5px solid var(--accent-dark)",
            boxShadow:
              "0 1px 0 rgba(255,240,200,0.75) inset, 0 -2px 0 rgba(60,40,8,0.35) inset, 0 3px 8px rgba(0,0,0,0.45)",
            ...RYE,
            textShadow: "0 1px 0 rgba(255,240,200,0.45)",
          }}
        >
          {n}
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className="text-[1.05rem]"
            style={{
              ...RYE,
              color: "var(--accent-light)",
              letterSpacing: "0.04em",
              textShadow: "0 2px 0 rgba(0,0,0,0.5)",
            }}
          >
            {heading}
          </h3>
          <p
            className="mt-1 text-[0.92rem] leading-snug text-[var(--parchment-light)]/85"
            style={FELL}
          >
            {body}
          </p>
        </div>
      </div>
      {visual && <div className="mt-3 pl-12">{visual}</div>}
    </section>
  );
}

// ─── Mode comparison card (Winner / Loser) ──────────────────────
function ModeCard({
  accent,
  title,
  subtitle,
  body,
  example,
}: {
  accent: string;
  title: string;
  subtitle: string;
  body: React.ReactNode;
  example: string;
}) {
  return (
    <section
      className="relative mb-3 overflow-hidden rounded-[16px] border-[1.5px] p-4"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,40,28,0.7) 0%, rgba(5,28,20,0.82) 100%)",
        borderColor: `${accent}55`,
        boxShadow:
          "0 1px 0 rgba(244,228,183,0.06) inset, 0 14px 30px rgba(0,0,0,0.45)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ backgroundColor: accent, opacity: 0.85 }}
      />
      <h3
        className="text-[1.1rem]"
        style={{
          ...RYE,
          color: accent,
          letterSpacing: "0.04em",
          textShadow: "0 2px 0 rgba(0,0,0,0.55)",
        }}
      >
        {title}
      </h3>
      <p
        className="text-[0.62rem] uppercase text-[var(--parchment-light)]/55"
        style={{ ...FELL, letterSpacing: "0.32em" }}
      >
        {subtitle}
      </p>
      <p
        className="mt-2 text-[0.92rem] leading-snug text-[var(--parchment-light)]/85"
        style={FELL}
      >
        {body}
      </p>
      <div
        className="mx-auto mt-3 inline-block rounded-[8px] border-[1.5px] px-3 py-1 text-[0.78rem] italic"
        style={{
          background:
            "linear-gradient(180deg, var(--parchment-light) 0%, var(--parchment-mid) 60%, var(--parchment-dark) 100%)",
          borderColor: "var(--wood-mid)",
          color: "var(--wood-dark)",
          boxShadow: "0 1px 0 rgba(255,240,210,0.55) inset",
        }}
      >
        {example}
      </div>
    </section>
  );
}

// ─── The 4 die faces with what each does ────────────────────────
function DieFacesGrid() {
  const rows: Array<{
    outcome: "left" | "right" | "center" | "keep";
    label: string;
    body: string;
    Icon: React.ComponentType<{ size?: number; color?: string }>;
  }> = [
    {
      outcome: "left",
      label: "L",
      body: "One eyeBuck slides to your neighbor on the left.",
      Icon: ArrowLeft,
    },
    {
      outcome: "right",
      label: "R",
      body: "One eyeBuck slides to your neighbor on the right.",
      Icon: ArrowRight,
    },
    {
      outcome: "center",
      label: "C",
      body: "One eyeBuck drops into the pot. Dead money — nobody takes it back.",
      Icon: ArrowDown,
    },
    {
      outcome: "keep",
      label: "✱",
      body: "Keep that eyeBuck. The good one.",
      Icon: Asterisk,
    },
  ];
  return (
    <ul className="space-y-2">
      {rows.map(({ outcome, label, body, Icon }) => (
        <li key={label} className="flex items-center gap-3">
          <Die size={42} outcome={outcome} />
          <Icon size={18} color="var(--parchment-light)" />
          <span
            className="flex-1 text-[0.85rem] leading-snug text-[var(--parchment-light)]/85"
            style={FELL}
          >
            {body}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ─── Inline helpers ─────────────────────────────────────────────
function Currency() {
  return (
    <span
      className="font-bold text-[var(--accent-light)]"
      style={{ fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)" }}
    >
      eyeBucks
    </span>
  );
}

function Em({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-bold italic text-[var(--accent-light)]">{children}</span>
  );
}
