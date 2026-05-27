"use client";

export type TextScale = "sm" | "md" | "lg" | "xl";

const STORAGE_KEY = "ptb:text-scale";
const DEFAULT: TextScale = "md";

export const TEXT_SCALES: { id: TextScale; label: string; px: number }[] = [
  { id: "sm", label: "Small", px: 16 },
  { id: "md", label: "Medium", px: 18 },
  { id: "lg", label: "Large", px: 20 },
  { id: "xl", label: "Extra Large", px: 22 },
];

export function loadTextScale(): TextScale {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) as TextScale | null;
    if (raw && ["sm", "md", "lg", "xl"].includes(raw)) return raw;
  } catch {
    // ignore
  }
  return DEFAULT;
}

export function applyTextScale(scale: TextScale) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-text-scale", scale);
}

export function saveTextScale(scale: TextScale) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, scale);
  } catch {
    // ignore
  }
  applyTextScale(scale);
}
