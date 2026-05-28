"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * Reflects the signed-in user's active theme as a `data-theme` attribute
 * on the root <html> element. CSS variables under [data-theme="X"] in
 * globals.css cascade through, so accent colors flip automatically for
 * any component reading var(--accent-…).
 *
 * Defaults to "saloon" when no profile is loaded (i.e. signed-out users
 * see the canonical look).
 */
export default function ThemeSync() {
  const { profile } = useAuth();
  useEffect(() => {
    if (typeof document === "undefined") return;
    const slug = profile?.active_theme_slug || "saloon";
    document.documentElement.setAttribute("data-theme", slug);
  }, [profile?.active_theme_slug]);
  return null;
}
