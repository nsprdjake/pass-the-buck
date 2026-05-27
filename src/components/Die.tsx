import type { RollOutcome } from "@/lib/types";

type DieFace = {
  letter: string;
  letterFill: string;
  letterStroke: string;
  glow: string;
};

const FACE_BY_OUTCOME: Record<RollOutcome, DieFace> = {
  left: {
    letter: "L",
    letterFill: "#1e3a8a",
    letterStroke: "#0a1746",
    glow: "#60A5FA",
  },
  right: {
    letter: "R",
    letterFill: "#1e3a8a",
    letterStroke: "#0a1746",
    glow: "#60A5FA",
  },
  center: {
    letter: "C",
    letterFill: "#8b2222",
    letterStroke: "#3a0a0a",
    glow: "#F97066",
  },
  keep: {
    letter: "✱",
    letterFill: "#a16207",
    letterStroke: "#3a2410",
    glow: "#FBBF24",
  },
};

type DieProps = {
  size?: number;
  outcome?: RollOutcome;
  /** When true the letter is replaced with a "?" — used during the roll */
  blind?: boolean;
};

/**
 * A bone-coloured aged die face with an inked western letter. The body has
 * subtle wear and a slight ivory gradient so it feels carved/old rather than
 * plastic.
 */
export default function Die({ size = 40, outcome, blind = false }: DieProps) {
  const face: DieFace = outcome
    ? FACE_BY_OUTCOME[outcome]
    : FACE_BY_OUTCOME.keep;
  const id = Math.random().toString(36).slice(2, 8);
  const bodyGrad = `die-body-${id}`;
  const innerGrad = `die-inner-${id}`;
  const letter = blind ? "?" : face.letter;
  const letterFontSize = letter === "✱" ? size * 0.7 : size * 0.62;
  const letterYAdjust = letter === "✱" ? size * 0.22 : size * 0.22;
  const bone = "#f4e4c1";
  const boneShadow = "#a89169";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Die showing ${letter}`}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={bodyGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff5d6" />
          <stop offset="55%" stopColor={bone} />
          <stop offset="100%" stopColor={boneShadow} />
        </linearGradient>
        <radialGradient id={innerGrad} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.45} />
          <stop offset="80%" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Shadow under die */}
      <ellipse cx="30" cy="56" rx="22" ry="3" fill="#000000" opacity={0.4} />

      {/* Die body — soft rounded square, more carved than rounded-clean */}
      <path
        d="M 8 4 L 52 5 Q 56 5 56 9 L 55 51 Q 55 56 51 56 L 9 55 Q 4 55 4 51 L 5 9 Q 4 4 8 4 Z"
        fill={`url(#${bodyGrad})`}
        stroke="#3a2410"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />

      {/* Inner highlight */}
      <rect
        x={6.5}
        y={6.5}
        width={47}
        height={47}
        rx={7.5}
        fill={`url(#${innerGrad})`}
        pointerEvents="none"
      />

      {/* Inked border ring */}
      <rect
        x={7}
        y={7}
        width={46}
        height={46}
        rx={7}
        fill="none"
        stroke="#3a2410"
        strokeOpacity={0.65}
        strokeWidth={0.7}
      />

      {/* Top-left glossy ink chip */}
      <path
        d="M 12 10 Q 16 8 22 8"
        stroke="#ffffff"
        strokeOpacity={0.75}
        strokeWidth={1.2}
        strokeLinecap="round"
        fill="none"
      />

      {/* Subtle ageing pock marks */}
      <g opacity={0.32} fill="#3a2410">
        <circle cx={14} cy={50} r={0.7} />
        <circle cx={48} cy={14} r={0.6} />
        <circle cx={48} cy={48} r={0.5} />
        <circle cx={20} cy={20} r={0.4} />
      </g>

      {/* Letter */}
      <text
        x="30"
        y={30 + letterYAdjust}
        textAnchor="middle"
        fontSize={letterFontSize}
        fontWeight="900"
        fill={face.letterFill}
        stroke={face.letterStroke}
        strokeWidth={0.9}
        style={{
          fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
          letterSpacing: "-0.04em",
        }}
      >
        {letter}
      </text>
    </svg>
  );
}

export { FACE_BY_OUTCOME };
