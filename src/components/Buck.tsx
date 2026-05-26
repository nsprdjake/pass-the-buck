type BuckProps = {
  /** Height of the bill in px. Width is derived from the bill's aspect ratio. */
  height?: number;
};

/**
 * A "buck" rendered as an aged saloon scrip — a piece of cream parchment
 * stamped in brown ink with a red wax seal at center. Slab-serif "1" stamps
 * sit in the top-left/bottom-right corners.
 */
export default function Buck({ height = 32 }: BuckProps) {
  const w = Math.round(height * 2.35);
  const h = height;
  const id = Math.random().toString(36).slice(2, 8);
  const paperGrad = `buck-paper-${id}`;
  const sealGrad = `buck-seal-${id}`;
  const sealHL = `buck-seal-hl-${id}`;
  // The illustration is laid out in a viewBox of 92×40 and scaled.
  const VB_W = 92;
  const VB_H = 40;
  const ink = "#3a2410";
  const inkLight = "#5a3818";
  const wax = "#8b2222";
  const waxDark = "#5c0f0f";

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="One buck"
      style={{ display: "block" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={paperGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fdf2ce" />
          <stop offset="50%" stopColor="#f1dfa3" />
          <stop offset="100%" stopColor="#d6b87a" />
        </linearGradient>
        <radialGradient id={sealGrad} cx="35%" cy="30%" r="85%">
          <stop offset="0%" stopColor="#c43838" />
          <stop offset="55%" stopColor={wax} />
          <stop offset="100%" stopColor={waxDark} />
        </radialGradient>
        <radialGradient id={sealHL} cx="38%" cy="28%" r="40%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Drop shadow */}
      <ellipse
        cx={VB_W / 2}
        cy={VB_H - 0.5}
        rx={VB_W * 0.46}
        ry={1.4}
        fill="#000000"
        opacity={0.45}
      />

      {/* Paper body with very slightly irregular corner rounding */}
      <path
        d={`M 2 3
            Q 2 1.4 3.6 1.4
            L ${VB_W - 3} 1.4
            Q ${VB_W - 1.5} 1.4 ${VB_W - 1.5} 3.2
            L ${VB_W - 1.4} ${VB_H - 4}
            Q ${VB_W - 1.4} ${VB_H - 2.5} ${VB_W - 3.4} ${VB_H - 2.4}
            L 3.2 ${VB_H - 2.6}
            Q 1.6 ${VB_H - 2.6} 1.6 ${VB_H - 4.2}
            Z`}
        fill={`url(#${paperGrad})`}
        stroke={ink}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />

      {/* Inner ornamental border */}
      <rect
        x={4}
        y={3.6}
        width={VB_W - 8}
        height={VB_H - 7.2}
        rx={1.2}
        fill="none"
        stroke={ink}
        strokeOpacity={0.7}
        strokeWidth={0.65}
      />
      <rect
        x={5.4}
        y={5}
        width={VB_W - 10.8}
        height={VB_H - 10}
        rx={0.7}
        fill="none"
        stroke={inkLight}
        strokeOpacity={0.55}
        strokeWidth={0.4}
        strokeDasharray="1.6 1.2"
      />

      {/* Filigree top — small repeating curls */}
      <path
        d={`M 16 8.5 Q 22 7.2 28 8.5 T 40 8.5 T 52 8.5 T 64 8.5 T 76 8.5`}
        fill="none"
        stroke={ink}
        strokeOpacity={0.55}
        strokeWidth={0.6}
      />
      <path
        d={`M 16 ${VB_H - 8.5} Q 22 ${VB_H - 7.2} 28 ${VB_H - 8.5} T 40 ${VB_H - 8.5} T 52 ${VB_H - 8.5} T 64 ${VB_H - 8.5} T 76 ${VB_H - 8.5}`}
        fill="none"
        stroke={ink}
        strokeOpacity={0.55}
        strokeWidth={0.6}
      />

      {/* Banner text top + bottom */}
      <text
        x={VB_W / 2}
        y={11.5}
        textAnchor="middle"
        fontSize={3.4}
        fontWeight={700}
        fill={ink}
        opacity={0.85}
        style={{
          fontFamily: "var(--font-rye), Georgia, serif",
          letterSpacing: "0.22em",
        }}
      >
        SALOON SCRIP
      </text>
      <text
        x={VB_W / 2}
        y={VB_H - 5.5}
        textAnchor="middle"
        fontSize={2.6}
        fontWeight={700}
        fill={ink}
        opacity={0.7}
        style={{
          fontFamily: "var(--font-fell), Georgia, serif",
          letterSpacing: "0.32em",
        }}
      >
        ★  PASS THE BUCK  ★
      </text>

      {/* Wax seal medallion — dripped circle, slightly off-round */}
      <g>
        <path
          d={`M ${VB_W / 2 - 8.5} ${VB_H / 2}
              Q ${VB_W / 2 - 8.5} ${VB_H / 2 - 8.2} ${VB_W / 2 + 0.4} ${VB_H / 2 - 8.4}
              Q ${VB_W / 2 + 8.5} ${VB_H / 2 - 8} ${VB_W / 2 + 8.6} ${VB_H / 2 + 0.6}
              Q ${VB_W / 2 + 8.2} ${VB_H / 2 + 8.4} ${VB_W / 2 - 0.4} ${VB_H / 2 + 8.6}
              Q ${VB_W / 2 - 8.6} ${VB_H / 2 + 8.2} ${VB_W / 2 - 8.5} ${VB_H / 2} Z`}
          fill={`url(#${sealGrad})`}
          stroke={waxDark}
          strokeWidth={0.55}
        />
        {/* drip */}
        <path
          d={`M ${VB_W / 2 - 3} ${VB_H / 2 + 8.2}
              Q ${VB_W / 2 - 2} ${VB_H / 2 + 10.5}
              ${VB_W / 2 - 1} ${VB_H / 2 + 9}`}
          fill={`url(#${sealGrad})`}
          stroke={waxDark}
          strokeWidth={0.45}
        />
        {/* shine */}
        <ellipse
          cx={VB_W / 2 - 1.8}
          cy={VB_H / 2 - 2.2}
          rx={4}
          ry={2.2}
          fill={`url(#${sealHL})`}
        />
        {/* engraved $ */}
        <text
          x={VB_W / 2}
          y={VB_H / 2 + 3.3}
          textAnchor="middle"
          fontSize={9}
          fontWeight="900"
          fill="#fbe08a"
          stroke="#5c0f0f"
          strokeWidth={0.4}
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          $
        </text>
      </g>

      {/* Corner "1" stamps in slab serif */}
      {[
        { cx: 10, cy: 11 },
        { cx: VB_W - 10, cy: VB_H - 11 },
      ].map((pos, i) => (
        <g key={`stamp1-${i}`} transform={`rotate(${i === 0 ? -6 : -4} ${pos.cx} ${pos.cy})`}>
          <rect
            x={pos.cx - 4.5}
            y={pos.cy - 4.5}
            width={9}
            height={9}
            rx={0.6}
            fill="none"
            stroke={ink}
            strokeOpacity={0.85}
            strokeWidth={0.5}
          />
          <text
            x={pos.cx}
            y={pos.cy + 2.4}
            textAnchor="middle"
            fontSize={6.4}
            fontWeight="900"
            fill={ink}
            style={{
              fontFamily: "var(--font-rye), Georgia, serif",
            }}
          >
            1
          </text>
        </g>
      ))}

      {/* Wear specks and a hairline crease across the middle */}
      <line
        x1={6}
        y1={VB_H / 2 + 0.6}
        x2={VB_W - 6}
        y2={VB_H / 2 - 0.6}
        stroke={ink}
        strokeOpacity={0.08}
        strokeWidth={0.5}
      />
      <g opacity={0.22} fill={ink}>
        <circle cx={22} cy={16} r={0.45} />
        <circle cx={70} cy={28} r={0.55} />
        <circle cx={34} cy={28} r={0.4} />
        <circle cx={58} cy={14} r={0.35} />
        <circle cx={80} cy={9} r={0.3} />
        <circle cx={12} cy={32} r={0.4} />
      </g>
      {/* coffee-stain blotch in a corner */}
      <ellipse
        cx={VB_W - 18}
        cy={VB_H - 14}
        rx={4}
        ry={2}
        fill={ink}
        opacity={0.06}
        transform={`rotate(-12 ${VB_W - 18} ${VB_H - 14})`}
      />
    </svg>
  );
}
