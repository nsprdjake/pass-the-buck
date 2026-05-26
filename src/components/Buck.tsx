type BuckProps = {
  /** Height of the bill in px. Width is derived from a ~2.3:1 ratio. */
  height?: number;
  /** Stylistic tint of the bill paper */
  tint?: string;
  /** Add a "fresh from the press" highlight */
  glossy?: boolean;
};

// A stylized "buck" — a wide, green dollar-bill rectangle with a $ medallion.
export default function Buck({
  height = 32,
  tint = "#1F8F5C",
  glossy = true,
}: BuckProps) {
  const w = Math.round(height * 2.3);
  const h = height;
  const id = Math.random().toString(36).slice(2, 8);
  const gradId = `buck-grad-${id}`;
  const borderId = `buck-border-${id}`;
  const sealId = `buck-seal-${id}`;
  const darker = "#0E7A4F";

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Buck"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2EAA72" />
          <stop offset="50%" stopColor={tint} />
          <stop offset="100%" stopColor={darker} />
        </linearGradient>
        <linearGradient id={borderId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0A5E3B" />
          <stop offset="100%" stopColor="#063A24" />
        </linearGradient>
        <radialGradient id={sealId} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="60%" stopColor="#E9B844" />
          <stop offset="100%" stopColor="#8C6B12" />
        </radialGradient>
      </defs>

      {/* drop shadow under the bill */}
      <rect
        x={1}
        y={h - 2}
        width={w - 2}
        height={2.5}
        rx={1}
        fill="#000000"
        opacity={0.4}
      />

      {/* outer bill */}
      <rect
        x={0.5}
        y={0.5}
        width={w - 1}
        height={h - 1}
        rx={2.5}
        fill={`url(#${gradId})`}
        stroke={`url(#${borderId})`}
        strokeWidth={0.8}
      />

      {/* inner border line */}
      <rect
        x={2.2}
        y={2.2}
        width={w - 4.4}
        height={h - 4.4}
        rx={1.6}
        fill="none"
        stroke="#0A5E3B"
        strokeOpacity={0.7}
        strokeWidth={0.5}
      />

      {/* dotted filigree top/bottom */}
      {[3, h - 3].map((cy, idx) => (
        <line
          key={idx}
          x1={6}
          y1={cy}
          x2={w - 6}
          y2={cy}
          stroke="#0A5E3B"
          strokeOpacity={0.5}
          strokeWidth={0.4}
          strokeDasharray="1,1.4"
        />
      ))}

      {/* left "1" */}
      <text
        x={5}
        y={h / 2 + h * 0.18}
        fontSize={h * 0.55}
        fontWeight="900"
        fill="#FFFFFF"
        style={{
          fontFamily: "Georgia, serif",
          filter: "drop-shadow(0 0.5px 0 rgba(0,0,0,0.45))",
        }}
      >
        1
      </text>

      {/* right "1" */}
      <text
        x={w - 9}
        y={h / 2 + h * 0.18}
        fontSize={h * 0.55}
        fontWeight="900"
        fill="#FFFFFF"
        style={{
          fontFamily: "Georgia, serif",
          filter: "drop-shadow(0 0.5px 0 rgba(0,0,0,0.45))",
        }}
      >
        1
      </text>

      {/* central seal medallion */}
      <circle
        cx={w / 2}
        cy={h / 2}
        r={h * 0.32}
        fill={`url(#${sealId})`}
        stroke="#5B3F0C"
        strokeWidth={0.5}
      />
      <text
        x={w / 2}
        y={h / 2 + h * 0.18}
        textAnchor="middle"
        fontSize={h * 0.5}
        fontWeight="900"
        fill="#3D2A05"
        style={{
          fontFamily: "Georgia, serif",
        }}
      >
        $
      </text>

      {/* top gloss highlight */}
      {glossy && (
        <rect
          x={3}
          y={2.5}
          width={w - 6}
          height={h * 0.25}
          rx={1.5}
          fill="#ffffff"
          opacity={0.12}
        />
      )}
    </svg>
  );
}
