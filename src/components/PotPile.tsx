"use client";

import { motion } from "framer-motion";
import BuckChip from "./BuckChip";

type PotPileProps = {
  bucks: string[];
  potColor?: string;
};

// Center pile of chips. Chips fan out around the center in a small cluster
// so a tall pot doesn't overflow vertically. The label sits underneath.
export default function PotPile({ bucks, potColor = "#FBBF24" }: PotPileProps) {
  const count = bucks.length;
  const chipSize = 28;
  // Cluster chips on a small radius — first chip dead center, subsequent
  // chips swirl around it. Larger pots stack outward, then upward.
  const positions = bucks.map((id, i) => {
    if (i === 0) return { x: 0, y: 0, id };
    const ring = Math.ceil(i / 6);
    const idxInRing = i - (1 + 6 * (ring - 1));
    const slots = ring * 6;
    const angle = (idxInRing / slots) * Math.PI * 2;
    const radius = 9 * ring;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius - i * 0.5,
      id,
    };
  });

  return (
    <div className="relative flex flex-col items-center gap-2">
      {/* Label */}
      <div className="flex items-center gap-1.5 bg-black/40 border border-buck-gold/40 rounded-full px-3 py-1 backdrop-blur-sm">
        <span className="text-buck-gold text-xs">💰</span>
        <span className="text-buck-gold font-black text-xs uppercase tracking-widest">
          Pot
        </span>
        <span className="text-white font-black text-sm">{count}</span>
      </div>

      {/* The chip cluster */}
      <div
        className="relative"
        style={{ width: 80, height: 60 }}
      >
        {positions.map(({ x, y, id }, i) => (
          <motion.div
            key={id}
            layoutId={`buck-${id}`}
            layout
            transition={{
              layout: { type: "spring", stiffness: 380, damping: 32, mass: 0.7 },
            }}
            className="absolute"
            style={{
              left: "50%",
              top: "50%",
              width: chipSize,
              height: chipSize,
              transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
              filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.6))",
              zIndex: i,
            }}
          >
            <BuckChip size={chipSize} color={potColor} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
