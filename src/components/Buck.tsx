type BuckProps = {
  /** Height of the bill in px. Width is derived from the bill's aspect ratio. */
  height?: number;
};

/**
 * The "eyeBuck" — a hand-stamped piece of saloon scrip.
 *
 * The icon is built around a single recognizable element: a five-point
 * sheriff star stamped into a small red wax seal at the bill's center.
 * Reads at every size we use this graphic (22px → 108px).
 *
 * Typography is intentionally restrained: "EYEBUCK" stamped across the top
 * and "ONE" across the bottom, both in Rye, both with measured letter-spacing
 * so they sit on the centerline cleanly. Corner "1" stamps anchor the
 * denomination at any zoom level.
 */

/** 5-pointed star path centered at (cx, cy) with given outer/inner radii. */
function starPath(cx: number, cy: number, rO: number, rI: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rO : rI;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(3)} ${y.toFixed(3)}`);
  }
  pts.push("Z");
  return pts.join(" ");
}
export default function Buck({ height = 32 }: BuckProps) {
  const w = Math.round(height * 2.35);
  const h = height;
  const id = Math.random().toString(36).slice(2, 8);
  const paperGrad = `buck-paper-${id}`;
  const sealGrad = `buck-seal-${id}`;
  const sealHL = `buck-seal-hl-${id}`;

  // Long, landed-on-the-table aspect ratio.
  const VB_W = 92;
  const VB_H = 40;
  const cx = VB_W / 2;
  const cy = VB_H / 2;

  // Palette tokens — keep close to the existing parchment + barn-red language
  const ink = "#3a2410";
  const inkLight = "#5a3818";
  const wax = "#8b2222"; // used by the sealGrad in <defs>
  const waxDark = "#5c0f0f";
  // Seal sizing — small enough to leave breathing room above and below
  // for the wordmarks, instead of dominating the bill.
  const SEAL_R = 6.4;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="One eyeBuck"
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
        <linearGradient id={`buck-star-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffe9a8" />
          <stop offset="55%" stopColor="#ffd17a" />
          <stop offset="100%" stopColor="#c99a33" />
        </linearGradient>
      </defs>

      {/* Drop shadow */}
      <ellipse
        cx={cx}
        cy={VB_H - 0.5}
        rx={VB_W * 0.46}
        ry={1.4}
        fill="#000000"
        opacity={0.45}
      />

      {/* Paper body — slightly irregular corner rounding for handmade feel */}
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

      {/* Inner ornamental borders */}
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

      {/* "EYEBUCK" wordmark across the top */}
      <text
        x={cx}
        y={11.6}
        textAnchor="middle"
        fontSize={4.4}
        fontWeight={700}
        fill={ink}
        opacity={0.92}
        style={{
          fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
          letterSpacing: "0.14em",
        }}
      >
        EYEBUCK
      </text>

      {/* Decorative side stars flanking the wordmark */}
      <text
        x={cx - 17}
        y={11.4}
        textAnchor="middle"
        fontSize={3}
        fill={ink}
        opacity={0.55}
      >
        ✦
      </text>
      <text
        x={cx + 17}
        y={11.4}
        textAnchor="middle"
        fontSize={3}
        fill={ink}
        opacity={0.55}
      >
        ✦
      </text>

      {/* === Sheriff Star in Wax Seal — the icon ========================
          Smaller, less dominant than before. Slight handpress
          irregularity in the seal silhouette to keep the aged feel. */}
      <g>
        {/* Wax seal disk */}
        <path
          d={`M ${cx - SEAL_R} ${cy + 0.2}
              Q ${cx - SEAL_R} ${cy - SEAL_R - 0.2} ${cx + 0.3} ${cy - SEAL_R - 0.3}
              Q ${cx + SEAL_R} ${cy - SEAL_R + 0.1} ${cx + SEAL_R + 0.1} ${cy + 0.4}
              Q ${cx + SEAL_R - 0.2} ${cy + SEAL_R + 0.1} ${cx - 0.3} ${cy + SEAL_R + 0.2}
              Q ${cx - SEAL_R - 0.1} ${cy + SEAL_R - 0.1} ${cx - SEAL_R} ${cy + 0.2} Z`}
          fill={`url(#${sealGrad})`}
          stroke={waxDark}
          strokeWidth={0.5}
        />
        {/* Tiny wax drip — proportionally smaller for the smaller seal */}
        <path
          d={`M ${cx - 1.8} ${cy + SEAL_R - 0.2}
              Q ${cx - 1} ${cy + SEAL_R + 1.8}
              ${cx - 0.2} ${cy + SEAL_R + 0.6}`}
          fill={`url(#${sealGrad})`}
          stroke={waxDark}
          strokeWidth={0.35}
        />
        {/* Wax shine */}
        <ellipse
          cx={cx - 1.6}
          cy={cy - 2}
          rx={2.8}
          ry={1.4}
          fill={`url(#${sealHL})`}
        />

        {/* Sheriff star — gold, inked outline */}
        <path
          d={starPath(cx, cy, 4.2, 1.75)}
          fill={`url(#buck-star-${id})`}
          stroke={waxDark}
          strokeWidth={0.4}
          strokeLinejoin="round"
        />
        {/* Tiny center pip — gives the star a punched/stamped feel */}
        <circle cx={cx} cy={cy} r={0.45} fill={waxDark} opacity={0.75} />
      </g>

      {/* "ONE" wordmark across the bottom */}
      <text
        x={cx}
        y={VB_H - 5}
        textAnchor="middle"
        fontSize={4.1}
        fontWeight={700}
        fill={ink}
        opacity={0.88}
        style={{
          fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
          letterSpacing: "0.32em",
        }}
      >
        ONE
      </text>

      {/* Corner "1" stamps in framed boxes — denomination anchors that
          still read at the smallest render sizes. */}
      {[
        { cx: 10, cy: 11, rot: -6 },
        { cx: VB_W - 10, cy: VB_H - 11, rot: -4 },
      ].map((pos, i) => (
        <g key={`stamp1-${i}`} transform={`rotate(${pos.rot} ${pos.cx} ${pos.cy})`}>
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
              fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
            }}
          >
            1
          </text>
        </g>
      ))}

      {/* Hairline crease through the middle + ink specks for aged feel */}
      <line
        x1={6}
        y1={cy + 0.6}
        x2={VB_W - 6}
        y2={cy - 0.6}
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
      {/* Coffee-stain blotch tucked in a corner */}
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
