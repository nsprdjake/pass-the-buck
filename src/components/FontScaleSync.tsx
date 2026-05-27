"use client";

import { useEffect } from "react";
import { applyTextScale, loadTextScale } from "@/lib/textScale";

/**
 * Mounts once at the app root. Reads the user's saved Text Size
 * preference from localStorage and sets data-text-scale on <html>,
 * which the rules in globals.css use to swap the base font-size.
 *
 * Runs after hydration; before that the SSR'd 18px default applies.
 */
export default function FontScaleSync() {
  useEffect(() => {
    applyTextScale(loadTextScale());
  }, []);
  return null;
}
