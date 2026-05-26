type BuckIconProps = {
  size?: number;
  color?: string;
};

export default function BuckIcon({
  size = 24,
  color = "#10B981",
}: BuckIconProps) {
  const gradId = `buck-grad-${color.replace("#", "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Buck"
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.6} />
          <stop offset="55%" stopColor={color} stopOpacity={0.95} />
          <stop offset="100%" stopColor={color} stopOpacity={1} />
        </radialGradient>
      </defs>
      <circle
        cx="16"
        cy="16"
        r="15"
        fill={`url(#${gradId})`}
        stroke="#ffffff"
        strokeOpacity={0.35}
        strokeWidth={1}
      />
      <text
        x="16"
        y="22"
        textAnchor="middle"
        fontSize="18"
        fontWeight="900"
        fill="#ffffff"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        $
      </text>
    </svg>
  );
}
