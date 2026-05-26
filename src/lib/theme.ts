/**
 * Theme system — defines the visual identity used across the app.
 *
 * Right now we ship a single "western" theme. The shape below is the contract
 * future themes should match so we can add a theme picker (unlocked by wins
 * or a point system) without touching every component.
 *
 * To add a new theme: copy `WESTERN_THEME` below, change the tokens, register
 * it in `THEMES`, and add a UI affordance to switch.
 */

export type ThemeId = "western";

export type ThemeColors = {
  // Table felt
  feltDark: string;
  feltMid: string;
  feltLight: string;
  feltSpotlight: string;

  // Wood / rails
  woodDark: string;
  woodMid: string;
  woodLight: string;

  // Brass / accents
  brass: string;
  brassLight: string;

  // Paper / posters
  parchment: string;
  parchmentDark: string;
  ink: string;

  // Currency / bone
  bone: string;
  boneDark: string;

  // Outcome accents (kept reasonably theme-neutral so outcome reads stay clear)
  blue: string;
  red: string;
  gold: string;
};

export type ThemeFonts = {
  /** CSS font-family for big display text (titles, player names, ROLL!). */
  display: string;
  /** CSS font-family for vintage decorative captions. */
  vintage: string;
  /** CSS font-family for the default UI body. */
  body: string;
};

export type ThemeCopy = {
  /** Label for the central money cluster. */
  potLabel: string;
  /** Label for the winner screen. */
  winnerLabel: string;
  /** Primary CTA on a player's turn. */
  rollLabel: string;
  /** Text shown when a player is skipped for having 0 bucks. */
  skippedLabel: string;
};

export type Theme = {
  id: ThemeId;
  /** Human-readable name shown in any future theme picker. */
  name: string;
  /** Short description shown in any future theme picker. */
  tagline: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  copy: ThemeCopy;
};

// === Western / Saloon ===
export const WESTERN_THEME: Theme = {
  id: "western",
  name: "Saloon",
  tagline: "Frontier scrip, bone dice, deep-felt poker table",
  colors: {
    feltDark: "#052b1c",
    feltMid: "#0a4d33",
    feltLight: "#126b48",
    feltSpotlight: "#1a8f60",
    woodDark: "#2a1a0a",
    woodMid: "#5c3b1e",
    woodLight: "#8b5a2b",
    brass: "#c99a33",
    brassLight: "#ffd17a",
    parchment: "#f4e4b7",
    parchmentDark: "#d9c295",
    ink: "#2a1a0a",
    bone: "#f4e4c1",
    boneDark: "#c9b698",
    blue: "#1e3a8a",
    red: "#8b2222",
    gold: "#c99a33",
  },
  fonts: {
    display: "var(--font-rye), Georgia, serif",
    vintage: "var(--font-fell), Georgia, serif",
    body: "var(--font-inter), system-ui, sans-serif",
  },
  copy: {
    potLabel: "The Pot",
    winnerLabel: "Champion",
    rollLabel: "ROLL 'EM",
    skippedLabel: "Plumb broke!",
  },
};

export const THEMES: Record<ThemeId, Theme> = {
  western: WESTERN_THEME,
};

/**
 * Active theme. Eventually swap to a context provider + persisted user choice.
 * For now we always return the western theme.
 */
export function getActiveTheme(): Theme {
  return WESTERN_THEME;
}

/** Convenience export for components that want a single import. */
export const theme = WESTERN_THEME;
