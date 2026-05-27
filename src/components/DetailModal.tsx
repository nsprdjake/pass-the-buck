"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

type DetailModalProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible label for the dialog. */
  label: string;
  /** Content rendered inside the parchment card. */
  children: React.ReactNode;
  /** Optional accent colour applied to the card border (overrides default). */
  accentColor?: string;
};

/**
 * Mobile-first detail modal: full-screen backdrop, centered card, dismiss
 * via backdrop-tap, ✕ button, or Escape. Visual styling matches the
 * existing brass-bordered panels so it slots into the Saloon theme
 * naturally — and inherits theme accents via CSS variables.
 *
 * Pure presentational: the consumer renders the body so we can use a
 * single component for badges, power-ups, themes, recent hands, etc.
 */
export default function DetailModal({
  open,
  onClose,
  label,
  children,
  accentColor,
}: DetailModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="detail-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-5"
          style={{
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ y: 24, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xs overflow-hidden rounded-[18px] border-[1.5px] p-5"
            style={{
              background:
                "linear-gradient(180deg, rgba(45,30,8,0.96) 0%, rgba(20,12,4,0.98) 100%)",
              borderColor: accentColor ?? "rgba(201,154,51,0.55)",
              boxShadow:
                "0 1px 0 rgba(255,240,200,0.18) inset, 0 22px 48px rgba(0,0,0,0.65)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full text-[1.1rem] font-bold text-[var(--parchment-light)]/65 transition-colors hover:bg-white/10 hover:text-[var(--accent-light)] active:bg-white/15"
              style={{
                fontFamily:
                  "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
              }}
            >
              ✕
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
