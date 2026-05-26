"use client";

import { motion } from "framer-motion";
import BuckChip from "./BuckChip";

type BuckStackProps = {
  bucks: string[]; // stable ids for layout animations
  color: string;
  chipSize?: number;
  offsetY?: number; // vertical lift per chip
  align?: "center" | "left" | "right";
};

// A vertical pile of poker chips. Each chip has a unique layoutId so Framer
// Motion can animate it across the screen when it moves to another stack.
export default function BuckStack({
  bucks,
  color,
  chipSize = 30,
  offsetY = 4,
  align = "center",
}: BuckStackProps) {
  const justify =
    align === "left"
      ? "justify-start"
      : align === "right"
      ? "justify-end"
      : "justify-center";
  return (
    <div
      className={`relative flex ${justify} items-end`}
      style={{
        height: chipSize + Math.max(bucks.length - 1, 0) * offsetY,
        width: chipSize,
      }}
    >
      {bucks.map((id, i) => (
        <motion.div
          key={id}
          layoutId={`buck-${id}`}
          layout
          transition={{
            layout: { type: "spring", stiffness: 380, damping: 32, mass: 0.7 },
          }}
          className="absolute"
          style={{
            bottom: i * offsetY,
            left: 0,
            width: chipSize,
            height: chipSize,
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))",
            zIndex: i,
          }}
        >
          <BuckChip size={chipSize} color={color} />
        </motion.div>
      ))}
    </div>
  );
}
