"use client";

type RollButtonProps = {
  onRoll: () => void;
  rolling: boolean;
  disabled?: boolean;
  color?: string;
};

export default function RollButton({
  onRoll,
  rolling,
  disabled = false,
  color = "#10B981",
}: RollButtonProps) {
  const isDisabled = disabled || rolling;
  return (
    <button
      onClick={onRoll}
      disabled={isDisabled}
      className={[
        "w-full py-5 rounded-2xl font-black text-lg tracking-wide text-white",
        "transition-all active:scale-[0.98]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.45)]",
        isDisabled ? "opacity-50 cursor-not-allowed" : "hover:brightness-110",
      ].join(" ")}
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}cc 60%, #12122A 140%)`,
      }}
    >
      <span className="inline-flex items-center justify-center gap-3">
        <span className={rolling ? "inline-block animate-spin" : ""}>🎲</span>
        <span>{rolling ? "ROLLING…" : "PASS THE BUCK"}</span>
        <span className={rolling ? "inline-block animate-spin" : ""}>🎲</span>
      </span>
    </button>
  );
}
