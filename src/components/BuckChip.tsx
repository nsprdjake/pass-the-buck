type BuckChipProps = {
  size?: number;
  /**
   * Tint of the inner face. Defaults to a casino green. The outer rim is
   * always a deep gold so chips read the same regardless of player color.
   */
  faceColor?: string;
  /** Optional small accent at top for stacking realism */
  edgeTint?: string;
};

// A weighty, casino-style poker chip. Gold rim with notches, green center
// with $ symbol, baked-in highlight + shadow for a 3D feel.
export default function BuckChip({
  size = 40,
  faceColor = "#0E7A4F",
  edgeTint = "#D4A017",
}: BuckChipProps) {
  const id = Math.random().toString(36).slice(2, 8);
  const faceGrad = `chip-face-${id}`;
  const rimGrad = `chip-rim-${id}`;
  const edgeGrad = `chip-edge-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Chip"
      style={{ display: "block" }}
    >
      <defs>
        {/* Outer gold rim — bright top-left highlight, darker bottom-right */}
        <radialGradient id={rimGrad} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="45%" stopColor={edgeTint} />
          <stop offset="100%" stopColor="#7A5A0F" />
        </radialGradient>
        {/* Inner face — slight gloss on top */}
        <radialGradient id={faceGrad} cx="50%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.45} />
          <stop offset="35%" stopColor={faceColor} />
          <stop offset="100%" stopColor={faceColor} />
        </radialGradient>
        {/* Subtle edge thickness ring */}
        <linearGradient id={edgeGrad} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#000000" stopOpacity={0.45} />
        </linearGradient>
      </defs>

      {/* drop shadow below chip */}
      <ellipse
        cx="20"
        cy="37"
        rx="15"
        ry="2"
        fill="#000000"
        opacity={0.35}
      />

      {/* outer rim */}
      <circle cx="20" cy="20" r="19" fill={`url(#${rimGrad})`} />

      {/* edge ring (subtle thickness band) */}
      <circle
        cx="20"
        cy="20"
        r="19"
        fill="none"
        stroke={`url(#${edgeGrad})`}
        strokeWidth={1.2}
        opacity={0.7}
      />

      {/* notches on gold rim — 8 evenly-spaced darker wedges */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * 2 * Math.PI + Math.PI / 8;
        const r1 = 15.5;
        const r2 = 19;
        const aw = Math.PI / 22;
        const x1 = 20 + r1 * Math.cos(a - aw);
        const y1 = 20 + r1 * Math.sin(a - aw);
        const x2 = 20 + r2 * Math.cos(a - aw);
        const y2 = 20 + r2 * Math.sin(a - aw);
        const x3 = 20 + r2 * Math.cos(a + aw);
        const y3 = 20 + r2 * Math.sin(a + aw);
        const x4 = 20 + r1 * Math.cos(a + aw);
        const y4 = 20 + r1 * Math.sin(a + aw);
        return (
          <path
            key={i}
            d={`M${x1},${y1} L${x2},${y2} L${x3},${y3} L${x4},${y4} Z`}
            fill="#3D2A05"
            fillOpacity={0.55}
          />
        );
      })}

      {/* inner face */}
      <circle cx="20" cy="20" r="13" fill={`url(#${faceGrad})`} />
      <circle
        cx="20"
        cy="20"
        r="13"
        fill="none"
        stroke="#000000"
        strokeOpacity={0.25}
        strokeWidth={0.6}
      />
      {/* face highlight crescent */}
      <path
        d="M 10 15 Q 20 8 30 15"
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.35}
        strokeWidth={1.2}
        strokeLinecap="round"
      />

      {/* $ */}
      <text
        x="20"
        y="26"
        textAnchor="middle"
        fontSize="17"
        fontWeight="900"
        fill="#ffffff"
        style={{
          fontFamily: "system-ui, sans-serif",
          filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.55))",
        }}
      >
        $
      </text>
    </svg>
  );
}
