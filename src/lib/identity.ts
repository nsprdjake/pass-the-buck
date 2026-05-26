"use client";

const DEVICE_ID_KEY = "ptb:device-id";
const GAMES_KEY = "ptb:games";

export type GameMembership = {
  /** The player row's id (server-assigned) */
  playerId: string;
  /** Secret returned at join time; required to mutate this player's row */
  claimToken: string;
  /** Set when this device created the game */
  hostToken?: string;
};

function uuidish() {
  // Lightweight UUID-ish identifier, good enough for an anonymous device id.
  return (
    Math.random().toString(36).slice(2, 10) +
    "-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10)
  );
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = uuidish();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function readMap(): Record<string, GameMembership> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(GAMES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, GameMembership>) : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, GameMembership>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GAMES_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
}

export function getMembership(code: string): GameMembership | null {
  const map = readMap();
  return map[code.toUpperCase()] ?? null;
}

export function saveMembership(code: string, m: GameMembership) {
  const map = readMap();
  map[code.toUpperCase()] = m;
  writeMap(map);
}

export function clearMembership(code: string) {
  const map = readMap();
  delete map[code.toUpperCase()];
  writeMap(map);
}

export function makeToken(): string {
  return uuidish() + uuidish();
}
