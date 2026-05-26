type BuckChipProps = {
  size?: number;
  color?: string;
};

// A stylized poker chip with $ in the center.
export default function BuckChip({
  size = 32,
  color = "#10B981",
}: BuckChipProps) {
  const gradId = `chip-grad-${color.replace("#", "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Buck"
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.55} />
          <stop offset="55%" stopColor={color} stopOpacity={1} />
          <stop offset="100%" stopColor={color} stopOpacity={1} />
        </radialGradient>
      </defs>
      {/* outer rim */}
      <circle cx="20" cy="20" r="19" fill={color} />
      {/* dashed white wedges around outer ring */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * 2 * Math.PI;
        const r1 = 16;
        const r2 = 19;
        const aw = Math.PI / 16;
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
            fill="#ffffff"
            fillOpacity={0.85}
          />
        );
      })}
      {/* inner face */}
      <circle cx="20" cy="20" r="13" fill={`url(#${gradId})`} />
      <circle
        cx="20"
        cy="20"
        r="13"
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.4}
        strokeWidth={0.5}
      />
      {/* $ */}
      <text
        x="20"
        y="26"
        textAnchor="middle"
        fontSize="16"
        fontWeight="900"
        fill="#ffffff"
        style={{
          fontFamily: "system-ui, sans-serif",
          filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.3))",
        }}
      >
        $
      </text>
    </svg>
  );
}
