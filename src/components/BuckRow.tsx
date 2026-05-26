import BuckIcon from "./BuckIcon";

type BuckRowProps = {
  count: number;
  max?: number;
  color?: string;
  size?: number;
};

export default function BuckRow({
  count,
  max = 9,
  color = "#10B981",
  size = 18,
}: BuckRowProps) {
  const slots = Array.from({ length: max }, (_, i) => i < count);
  return (
    <div className="flex flex-wrap gap-1">
      {slots.map((filled, i) => (
        <div
          key={i}
          className="transition-opacity"
          style={{ opacity: filled ? 1 : 0.18 }}
        >
          <BuckIcon size={size} color={filled ? color : "#6b7280"} />
        </div>
      ))}
    </div>
  );
}
