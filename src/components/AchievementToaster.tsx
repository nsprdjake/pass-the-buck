"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  fetchUnseenAchievements,
  markAchievementsSeen,
  type Achievement,
} from "@/lib/achievements";

type Pending = Achievement & { awarded_at: string };

/**
 * Periodically polls for unseen achievements for the signed-in user, pops
 * each one as a parchment slip toast (~4s), and marks it seen server-side.
 *
 * Polling cadence: lazy. Fires on mount, after auth state change, on
 * window focus (catches "I won a game on another tab" scenarios), and
 * after every 90 seconds while the tab is open. Tiny query — cheap.
 */
export default function AchievementToaster() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<Pending[]>([]);
  const [current, setCurrent] = useState<Pending | null>(null);
  const lastFetchAt = useRef<number>(0);

  // Fetch routine — deduplicated by lastFetchAt timestamp.
  useEffect(() => {
    if (!user) {
      setQueue([]);
      setCurrent(null);
      return;
    }

    async function poll() {
      if (!user) return;
      // 5-second floor between polls so window focus + visibility change
      // events don't double-fire when restoring from a sleep.
      if (Date.now() - lastFetchAt.current < 5000) return;
      lastFetchAt.current = Date.now();
      try {
        const unseen = await fetchUnseenAchievements(user.id);
        if (unseen.length === 0) return;
        setQueue((q) => {
          const have = new Set(q.map((x) => x.slug));
          const fresh = unseen.filter((x) => !have.has(x.slug));
          return [...q, ...fresh];
        });
      } catch {
        // ignore — toaster is best-effort
      }
    }

    poll();
    const onFocus = () => poll();
    const interval = setInterval(poll, 90_000);
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onFocus);
    };
  }, [user]);

  // Pump the queue: show one toast at a time, ~4.5s each.
  useEffect(() => {
    if (current) return;
    const next = queue[0];
    if (!next) return;
    setCurrent(next);
    setQueue((q) => q.slice(1));
    if (user) {
      void markAchievementsSeen(user.id, [next.slug]);
    }
    const t = setTimeout(() => setCurrent(null), 4500);
    return () => clearTimeout(t);
  }, [current, queue, user]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.slug + current.awarded_at}
          initial={{ y: -50, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="parchment pointer-events-none fixed left-1/2 top-4 z-[60] flex max-w-[min(92vw,22rem)] -translate-x-1/2 items-center gap-3 rounded-[14px] border-[1.5px] border-[#5c3b1e] px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
          style={{
            boxShadow:
              "0 1px 0 rgba(255,240,210,0.6) inset, 0 -1px 0 rgba(101,67,33,0.18) inset, 0 18px 40px rgba(0,0,0,0.55)",
          }}
        >
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, #ffe9a8 0%, #d8a93b 55%, #a07a22 100%)",
              border: "1.5px solid #5c3b1e",
              fontSize: "1.6rem",
            }}
            aria-hidden
          >
            {current.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-[0.55rem] font-bold uppercase text-[#5c3b1e]/75"
              style={{
                fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
                letterSpacing: "0.32em",
              }}
            >
              New Badge Earned
            </div>
            <div
              className="mt-0.5 truncate text-[1rem] font-bold text-[#2a1a0a]"
              style={{ fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)" }}
            >
              {current.name}
            </div>
            <div
              className="mt-0.5 text-[0.72rem] italic text-[#5c3b1e]/85"
              style={{ fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)" }}
            >
              {current.description}
            </div>
            {current.reward_eyebucks > 0 && (
              <div
                className="mt-1 text-[0.68rem] font-bold text-[#7a5a18]"
                style={{
                  fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
                  letterSpacing: "0.06em",
                }}
              >
                +{current.reward_eyebucks} eyeBucks
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
