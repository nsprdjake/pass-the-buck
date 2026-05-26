import type { RollOutcome } from "@/lib/types";

type DieFace = {
  letter: string;
  body: string;
  bodyDark: string;
  letterFill: string;
  letterStroke: string;
  glow: string;
};

const FACE_BY_OUTCOME: Record<RollOutcome, DieFace> = {
  left: {
    letter: "L",
    body: "#FAFAFA",
    bodyDark: "#C7CFD8",
    letterFill: "#1E40AF",
    letterStroke: "#0B1E4A",
    glow: "#60A5FA",
  },
  right: {
    letter: "R",
    body: "#FAFAFA",
    bodyDark: "#C7CFD8",
    letterFill: "#1E40AF",
    letterStroke: "#0B1E4A",
    glow: "#60A5FA",
  },
  center: {
    letter: "C",
    body: "#FAFAFA",
    bodyDark: "#C7CFD8",
    letterFill: "#B91C1C",
    letterStroke: "#5C0A0A",
    glow: "#F97066",
  },
  keep: {
    letter: "✱",
    body: "#FAFAFA",
    bodyDark: "#C7CFD8",
    letterFill: "#A16207",
    letterStroke: "#3D2A05",
    glow: "#FBBF24",
  },
};

type DieProps = {
  size?: number;
  outcome?: RollOutcome;
  /** If true, hides the letter and shows a generic "?" — for the rolling state */
  blind?: boolean;
};

/**
 * A single die face rendered as a rounded square with an outcome letter.
 * Looks like the front-facing face of a small casino die viewed head-on.
 */
export default function Die({ size = 40, outcome, blind = false }: DieProps) {
  const face: DieFace = outcome
    ? FACE_BY_OUTCOME[outcome]
    : FACE_BY_OUTCOME.keep;
  const id = Math.random().toString(36).slice(2, 8);
  const bodyGrad = `die-body-${id}`;
  const letter = blind ? "?" : face.letter;
  // The asterisk is visually a touch smaller because of its strokes.
  const letterFontSize = letter === "✱" ? size * 0.7 : size * 0.62;
  const letterYAdjust = letter === "✱" ? size * 0.22 : size * 0.22;

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
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor={face.body} />
          <stop offset="100%" stopColor={face.bodyDark} />
        </linearGradient>
      </defs>

      {/* Shadow under die */}
      <ellipse
        cx="30"
        cy="56"
        rx="22"
        ry="3"
        fill="#000000"
        opacity={0.35}
      />

      {/* Die body */}
      <rect
        x="3"
        y="3"
        width="54"
        height="54"
        rx="11"
        ry="11"
        fill={`url(#${bodyGrad})`}
        stroke="#5A6470"
        strokeWidth="1.2"
      />

      {/* inner bevel */}
      <rect
        x="6"
        y="6"
        width="48"
        height="48"
        rx="9"
        ry="9"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.7}
        strokeWidth="1"
      />

      {/* Top-left glossy highlight */}
      <path
        d="M 10 8 Q 14 6 22 6 L 36 6"
        stroke="#FFFFFF"
        strokeOpacity={0.85}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Subtle corner dot quartet for "die" texture */}
      {[
        [10, 10],
        [50, 10],
        [10, 50],
        [50, 50],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={1}
          fill="#9CA3AF"
          opacity={0.5}
        />
      ))}

      {/* The letter */}
      <text
        x="30"
        y={30 + letterYAdjust}
        textAnchor="middle"
        fontSize={letterFontSize}
        fontWeight="900"
        fill={face.letterFill}
        stroke={face.letterStroke}
        strokeWidth={0.8}
        style={{
          fontFamily: "Georgia, serif",
          letterSpacing: "-0.04em",
        }}
      >
        {letter}
      </text>
    </svg>
  );
}

export { FACE_BY_OUTCOME };
