type BuckProps = {
  /** Height of the bill in px. Width is derived from the bill's aspect ratio. */
  height?: number;
  /** Override paper tint for variant looks */
  tint?: string;
};

/**
 * A stylized "buck" — an illustrated dollar-bill rectangle with an
 * ornamental central seal, stamped corner denominations, and filigree
 * accents. Slightly heavier black outline + paper texture than a generic
 * casino bill, leaning a bit vintage.
 */
export default function Buck({
  height = 32,
  tint = "#1B7A4D",
}: BuckProps) {
  const w = Math.round(height * 2.35);
  const h = height;
  const id = Math.random().toString(36).slice(2, 8);
  const bodyGrad = `buck-body-${id}`;
  const sealGrad = `buck-seal-${id}`;
  const innerGrad = `buck-inner-${id}`;
  // The illustration is laid out in a viewBox of 92×40 and scaled.
  const VB_W = 92;
  const VB_H = 40;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Buck"
      style={{ display: "block" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={bodyGrad} x1="0%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#3DA974" />
          <stop offset="55%" stopColor={tint} />
          <stop offset="100%" stopColor="#0C6038" />
        </linearGradient>
        <radialGradient id={innerGrad} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.25} />
          <stop offset="80%" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={sealGrad} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFF1B0" />
          <stop offset="55%" stopColor="#E0A82E" />
          <stop offset="100%" stopColor="#7A4B05" />
        </radialGradient>
      </defs>

      {/* Drop shadow under the bill */}
      <ellipse
        cx={VB_W / 2}
        cy={VB_H - 0.5}
        rx={VB_W * 0.46}
        ry={1.4}
        fill="#000000"
        opacity={0.4}
      />

      {/* Bill paper */}
      <rect
        x={1}
        y={1}
        width={VB_W - 2}
        height={VB_H - 2.5}
        rx={1.8}
        fill={`url(#${bodyGrad})`}
        stroke="#04341F"
        strokeWidth={1.5}
      />
      {/* center radial highlight for "paper" feel */}
      <rect
        x={1.5}
        y={1.5}
        width={VB_W - 3}
        height={VB_H - 3.5}
        rx={1.5}
        fill={`url(#${innerGrad})`}
        pointerEvents="none"
      />

      {/* Ornamental border — two concentric rectangles + corner flourishes */}
      <rect
        x={4}
        y={3.5}
        width={VB_W - 8}
        height={VB_H - 7}
        rx={1}
        fill="none"
        stroke="#04341F"
        strokeOpacity={0.85}
        strokeWidth={0.7}
      />
      <rect
        x={5.5}
        y={5}
        width={VB_W - 11}
        height={VB_H - 10}
        rx={0.6}
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.32}
        strokeWidth={0.5}
        strokeDasharray="2 1.2"
      />

      {/* Filigree along the top — small wavy curve */}
      <path
        d={`M 16 8.5 Q 22 7.3 28 8.5 T 40 8.5 T 52 8.5 T 64 8.5 T 76 8.5`}
        fill="none"
        stroke="#04341F"
        strokeOpacity={0.55}
        strokeWidth={0.55}
      />
      <path
        d={`M 16 ${VB_H - 8.5} Q 22 ${VB_H - 7.3} 28 ${VB_H - 8.5} T 40 ${VB_H - 8.5} T 52 ${VB_H - 8.5} T 64 ${VB_H - 8.5} T 76 ${VB_H - 8.5}`}
        fill="none"
        stroke="#04341F"
        strokeOpacity={0.55}
        strokeWidth={0.55}
      />

      {/* Center medallion */}
      <g>
        {/* outer dotted ring */}
        <circle
          cx={VB_W / 2}
          cy={VB_H / 2}
          r={9.5}
          fill="none"
          stroke="#04341F"
          strokeOpacity={0.6}
          strokeWidth={0.4}
          strokeDasharray="0.8 0.9"
        />
        {/* coin */}
        <circle
          cx={VB_W / 2}
          cy={VB_H / 2}
          r={8.2}
          fill={`url(#${sealGrad})`}
          stroke="#3D2A05"
          strokeWidth={0.55}
        />
        {/* coin inner band */}
        <circle
          cx={VB_W / 2}
          cy={VB_H / 2}
          r={6.5}
          fill="none"
          stroke="#3D2A05"
          strokeOpacity={0.5}
          strokeWidth={0.4}
          strokeDasharray="0.4 0.7"
        />
        {/* $ */}
        <text
          x={VB_W / 2}
          y={VB_H / 2 + 3.6}
          textAnchor="middle"
          fontSize={10}
          fontWeight="900"
          fill="#3D2A05"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          $
        </text>
      </g>

      {/* Corner stamps: top-left & bottom-right with "1" */}
      {[
        { cx: 11, cy: 11 },
        { cx: VB_W - 11, cy: VB_H - 11 },
      ].map((pos, i) => (
        <g key={`stamp1-${i}`}>
          <circle
            cx={pos.cx}
            cy={pos.cy}
            r={4.6}
            fill="#04341F"
            stroke="#FFFFFF"
            strokeOpacity={0.5}
            strokeWidth={0.5}
          />
          <text
            x={pos.cx}
            y={pos.cy + 2.4}
            textAnchor="middle"
            fontSize={6.5}
            fontWeight="900"
            fill="#FBE08A"
            style={{ fontFamily: "Georgia, serif" }}
          >
            1
          </text>
        </g>
      ))}

      {/* "ONE BUCK" banner along the top */}
      <text
        x={VB_W / 2}
        y={9.2}
        textAnchor="middle"
        fontSize={3.3}
        fontWeight="700"
        fill="#04341F"
        opacity={0.65}
        style={{
          fontFamily: "Georgia, serif",
          letterSpacing: "0.18em",
        }}
      >
        ONE BUCK
      </text>
      <text
        x={VB_W / 2}
        y={VB_H - 5.5}
        textAnchor="middle"
        fontSize={2.5}
        fontWeight="700"
        fill="#04341F"
        opacity={0.5}
        style={{
          fontFamily: "Georgia, serif",
          letterSpacing: "0.4em",
        }}
      >
        ★ PASS THE BUCK ★
      </text>

      {/* Wear specks for a subtle illustrated/aged feel */}
      <g opacity={0.18} fill="#04341F">
        <circle cx={22} cy={16} r={0.4} />
        <circle cx={70} cy={28} r={0.5} />
        <circle cx={34} cy={28} r={0.4} />
        <circle cx={58} cy={14} r={0.3} />
      </g>
    </svg>
  );
}
