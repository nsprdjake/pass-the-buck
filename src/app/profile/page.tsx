"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Buck from "@/components/Buck";
import { useAuth } from "@/context/AuthContext";
import { PLAYER_COLORS } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";
import {
  fetchAchievementsAndEarned,
  type Achievement,
  type UserAchievement,
} from "@/lib/achievements";
import {
  buyPowerup,
  equipPowerup,
  listOwnedPowerups,
  listPowerups,
  type OwnedPowerup,
  type PowerupRow,
} from "@/lib/powerups";
import {
  listOwnedThemes,
  listThemes,
  purchaseTheme,
  setActiveTheme,
  THEME_PREVIEW,
  type OwnedTheme,
  type ThemeRow,
} from "@/lib/themes";
import {
  bucksPerDollar,
  formatPrice,
  listBundles,
  testPurchaseBundle,
  type EyebuckBundle,
} from "@/lib/wallet";

const RYE: React.CSSProperties = {
  fontFamily: "var(--font-rye), Georgia, serif",
};
const FELL: React.CSSProperties = {
  fontFamily: "var(--font-fell), Georgia, serif",
};

type StatsRow = {
  games_played: number;
  games_won: number;
  games_lost_with_tab: number;
  biggest_pot: number;
  current_streak: number;
  longest_streak: number;
  total_earned_eyebucks: number;
};

type HistoryRow = {
  game_id: string;
  code: string;
  status: string;
  mode: "winner" | "loser";
  wager: string | null;
  pot: number;
  created_at: string;
  winner_player_id: string | null;
  /** My player row inside that game (so we know if we won/lost). */
  player_id: string;
  player_bucks: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, updateProfile, refreshProfile, signOut } =
    useAuth();
  const [displayName, setDisplayName] = useState("");
  const [color, setColor] = useState<string>(PLAYER_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [themes, setThemes] = useState<ThemeRow[] | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set(["saloon"]));
  const [themeBusy, setThemeBusy] = useState<string | null>(null);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [powerups, setPowerups] = useState<PowerupRow[] | null>(null);
  const [ownedPowerups, setOwnedPowerups] = useState<Map<string, number>>(new Map());
  const [powerupBusy, setPowerupBusy] = useState<string | null>(null);
  const [powerupError, setPowerupError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsRow | null>(null);
  const [achievementCatalog, setAchievementCatalog] = useState<Achievement[] | null>(null);
  const [earnedAchievements, setEarnedAchievements] = useState<Map<string, UserAchievement>>(new Map());
  const [bundles, setBundles] = useState<EyebuckBundle[] | null>(null);
  const [bundleBusy, setBundleBusy] = useState<string | null>(null);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [purchaseFlash, setPurchaseFlash] = useState<{
    amount: number;
    at: number;
  } | null>(null);

  // Bounce signed-out visitors to the auth screen.
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?next=/profile");
    }
  }, [user, loading, router]);

  // Hydrate the form from the profile row once it arrives.
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setColor(profile.color ?? PLAYER_COLORS[0]);
    }
  }, [profile]);

  // Pull this user's last few multi-device games.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const sb = getSupabase();
    (async () => {
      const { data } = await sb
        .from("ptb_players")
        .select(
          "id, bucks, ptb_games!inner(id, code, status, mode, wager, pot, created_at, winner_player_id)"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled) return;
      const rows: HistoryRow[] = ((data as unknown as Array<{
        id: string;
        bucks: number;
        ptb_games: {
          id: string;
          code: string;
          status: string;
          mode: "winner" | "loser";
          wager: string | null;
          pot: number;
          created_at: string;
          winner_player_id: string | null;
        };
      }>) ?? []).map((r) => ({
        game_id: r.ptb_games.id,
        code: r.ptb_games.code,
        status: r.ptb_games.status,
        mode: r.ptb_games.mode,
        wager: r.ptb_games.wager,
        pot: r.ptb_games.pot,
        created_at: r.ptb_games.created_at,
        winner_player_id: r.ptb_games.winner_player_id,
        player_id: r.id,
        player_bucks: r.bucks,
      }));
      setHistory(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Load this user's stats whenever auth resolves (and after profile refreshes).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const sb = getSupabase();
    (async () => {
      const { data } = await sb
        .from("ptb_stats")
        .select(
          "games_played, games_won, games_lost_with_tab, biggest_pot, current_streak, longest_streak, total_earned_eyebucks"
        )
        .eq("user_id", user.id)
        .maybeSingle<StatsRow>();
      if (!cancelled) setStats(data ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profile?.balance]);

  // Load the achievement catalog + earned set.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { catalog, earned } = await fetchAchievementsAndEarned(
          user?.id ?? null
        );
        if (cancelled) return;
        setAchievementCatalog(catalog);
        setEarnedAchievements(earned);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profile?.balance]);

  // Load the theme catalog + this user's owned themes whenever auth resolves.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catalog, ownedList]: [ThemeRow[], OwnedTheme[]] = await Promise.all([
          listThemes(),
          user ? listOwnedThemes(user.id) : Promise.resolve([] as OwnedTheme[]),
        ]);
        if (cancelled) return;
        setThemes(catalog);
        // The Saloon (default, free) is always implicitly owned.
        const set = new Set<string>(["saloon", ...ownedList.map((o) => o.theme_slug)]);
        setOwned(set);
      } catch {
        // ignore — picker just shows catalog with no ownership
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Load the bundle catalog once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listBundles();
        if (!cancelled) setBundles(rows);
      } catch {
        if (!cancelled) setBundles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-dismiss the "+X eyeBucks" flash after a few seconds.
  useEffect(() => {
    if (!purchaseFlash) return;
    const t = setTimeout(() => setPurchaseFlash(null), 4000);
    return () => clearTimeout(t);
  }, [purchaseFlash]);

  async function handleBuyBundle(bundleId: string) {
    if (!user || bundleBusy) return;
    setBundleBusy(bundleId);
    setBundleError(null);
    try {
      const res = await testPurchaseBundle(bundleId);
      await refreshProfile();
      setPurchaseFlash({ amount: res.amountEyebucks, at: Date.now() });
    } catch (e) {
      setBundleError(e instanceof Error ? e.message : "Couldn't credit bundle");
    } finally {
      setBundleBusy(null);
    }
  }

  // Load power-up catalog + this user's inventory.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catalog, owned]: [PowerupRow[], OwnedPowerup[]] = await Promise.all([
          listPowerups(),
          user ? listOwnedPowerups(user.id) : Promise.resolve([] as OwnedPowerup[]),
        ]);
        if (cancelled) return;
        setPowerups(catalog);
        const m = new Map<string, number>();
        for (const o of owned) m.set(o.slug, o.quantity);
        setOwnedPowerups(m);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profile?.balance, profile?.active_powerup_slug]);

  async function handleBuyPowerup(slug: string) {
    if (!user || powerupBusy) return;
    setPowerupBusy(slug);
    setPowerupError(null);
    try {
      await buyPowerup(slug);
      await refreshProfile();
    } catch (e) {
      setPowerupError(e instanceof Error ? e.message : "Couldn't buy");
    } finally {
      setPowerupBusy(null);
    }
  }

  async function handleEquipPowerup(slug: string | null) {
    if (!user || powerupBusy) return;
    setPowerupBusy(slug ?? "__unequip");
    setPowerupError(null);
    try {
      await equipPowerup(slug);
      await refreshProfile();
    } catch (e) {
      setPowerupError(e instanceof Error ? e.message : "Couldn't equip");
    } finally {
      setPowerupBusy(null);
    }
  }

  async function handleBuyTheme(slug: string) {
    if (!user || themeBusy) return;
    setThemeBusy(slug);
    setThemeError(null);
    try {
      await purchaseTheme(slug);
      setOwned((prev) => new Set(prev).add(slug));
      await refreshProfile();
      // Auto-activate the freshly-bought theme — feels good.
      await setActiveTheme(slug);
      await refreshProfile();
    } catch (e) {
      setThemeError(e instanceof Error ? e.message : "Couldn't unlock that");
    } finally {
      setThemeBusy(null);
    }
  }

  async function handleSelectTheme(slug: string) {
    if (!user || themeBusy) return;
    if (profile?.active_theme_slug === slug) return;
    setThemeBusy(slug);
    setThemeError(null);
    try {
      await setActiveTheme(slug);
      await refreshProfile();
    } catch (e) {
      setThemeError(e instanceof Error ? e.message : "Couldn't switch");
    } finally {
      setThemeBusy(null);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        display_name: displayName.trim() || null,
        color,
      });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  const finishedHistory = useMemo(
    () => (history ?? []).filter((h) => h.status === "finished"),
    [history]
  );

  if (loading || !user) {
    return (
      <main className="felt-saloon flex min-h-[100dvh] items-center justify-center">
        <div className="text-[var(--parchment-light)]/65" style={FELL}>Loading…</div>
      </main>
    );
  }

  return (
    <main className="felt-saloon relative min-h-[100dvh] overflow-hidden">
      <div
        aria-hidden
        className="wood-grain pointer-events-none absolute inset-x-0 top-0 h-3 shadow-[0_4px_14px_rgba(0,0,0,0.55)]"
      />
      <div
        aria-hidden
        className="wood-grain pointer-events-none absolute inset-x-0 bottom-0 h-3 shadow-[0_-4px_14px_rgba(0,0,0,0.55)]"
      />

      <div className="relative mx-auto max-w-md px-5 pt-7 pb-8">
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center">
          <Link
            href="/"
            className="justify-self-start text-[0.78rem] font-bold text-[var(--parchment-light)]/75 transition-colors hover:text-[var(--accent-light)]"
            style={FELL}
          >
            ← Back
          </Link>
          <h1
            className="justify-self-center"
            style={{
              ...RYE,
              fontSize: "clamp(1.6rem, 6.5vw, 2.1rem)",
              color: "var(--parchment-light)",
              textShadow:
                "0 2px 0 var(--wood-mid), 0 3px 0 rgba(0,0,0,0.45), 0 6px 16px rgba(0,0,0,0.55)",
              letterSpacing: "0.02em",
            }}
          >
            My Saloon
          </h1>
          <button
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
            className="justify-self-end text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/55 transition-colors hover:text-[var(--accent-light)]"
            style={{ ...FELL, letterSpacing: "0.36em" }}
          >
            Sign Out
          </button>
        </div>

        {/* Wallet — a tiny ledger card showing eyeBuck balance */}
        <section
          className="mb-4 relative overflow-hidden rounded-[16px] border-[1.5px] border-[var(--accent-mid)]/50 p-4"
          style={{
            background:
              "linear-gradient(180deg, rgba(45,30,8,0.85) 0%, rgba(20,12,4,0.92) 100%)",
            boxShadow:
              "0 1px 0 rgba(255,240,200,0.12) inset, 0 14px 30px rgba(0,0,0,0.5)",
          }}
        >
          {/* subtle brass top edge */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-0.5"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--accent-light), transparent)",
            }}
          />
          <div className="flex items-center justify-between">
            <div>
              <div
                className="text-[0.6rem] uppercase text-[var(--parchment-light)]/55"
                style={{ ...FELL, letterSpacing: "0.4em" }}
              >
                Wallet
              </div>
              <div
                className="mt-1 flex items-baseline gap-1.5"
                style={RYE}
              >
                <span
                  className="text-[2.4rem] leading-none text-[var(--accent-text)]"
                  style={{
                    textShadow:
                      "0 2px 0 var(--wood-mid), 0 3px 0 rgba(0,0,0,0.55)",
                  }}
                >
                  {(profile?.balance ?? 0).toLocaleString()}
                </span>
                <span
                  className="text-[0.78rem] uppercase text-[var(--parchment-light)]/65"
                  style={{ ...FELL, letterSpacing: "0.24em" }}
                >
                  eyeBucks
                </span>
              </div>
            </div>
            <div className="flex-shrink-0" aria-hidden>
              <Buck height={56} />
            </div>
          </div>
          <p
            className="mt-3 text-[0.78rem] italic leading-snug text-[var(--parchment-light)]/55"
            style={FELL}
          >
            Earn eyeBucks by winning cross-device hands. Save &apos;em for
            stakes, power-ups, and shinier saloon doors — coming soon.
          </p>
        </section>

        {/* Stats card — your record at a glance */}
        {stats && (
          <Panel className="mb-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h2
                className="text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/65"
                style={{ ...FELL, letterSpacing: "0.36em" }}
              >
                The Record
              </h2>
              <span
                className="text-[0.62rem] italic text-[var(--parchment-light)]/45"
                style={FELL}
              >
                Across all hands
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatTile label="Hands" value={stats.games_played} />
              <StatTile label="Wins" value={stats.games_won} />
              <StatTile
                label="Win Rate"
                value={
                  stats.games_played > 0
                    ? `${Math.round(
                        (stats.games_won / stats.games_played) * 100
                      )}%`
                    : "—"
                }
              />
              <StatTile label="Biggest Pot" value={stats.biggest_pot} />
              <StatTile label="Best Streak" value={stats.longest_streak} />
              <StatTile label="Tabs Picked Up" value={stats.games_lost_with_tab} />
            </div>
            {stats.current_streak >= 2 && (
              <div
                className="mt-3 rounded-[10px] border-[1.5px] border-[var(--accent-light)]/45 bg-[var(--accent-light)]/10 px-3 py-2 text-center text-[0.78rem] font-bold uppercase text-[var(--accent-light)]"
                style={{ ...FELL, letterSpacing: "0.22em" }}
              >
                🔥 On a {stats.current_streak}-win heater
              </div>
            )}
          </Panel>
        )}

        {/* Profile editor */}
        <Panel className="mb-4">
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label
                htmlFor="profile-name"
                className="mb-2 block text-[0.62rem] font-bold uppercase text-[var(--parchment-light)]/65"
                style={{ ...FELL, letterSpacing: "0.36em" }}
              >
                Display Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="What should we call you?"
                maxLength={20}
                className="parchment-input w-full rounded-[10px] px-4 py-3 text-[0.95rem] font-semibold text-[var(--wood-dark)] placeholder-[var(--wood-mid)]/55 focus:outline-none"
                style={FELL}
              />
              <p
                className="mt-2 text-[0.72rem] italic text-[var(--parchment-light)]/55"
                style={FELL}
              >
                {user.email ?? user.phone ?? "signed in"}
              </p>
            </div>

            <div>
              <label
                className="mb-2 block text-[0.62rem] font-bold uppercase text-[var(--parchment-light)]/65"
                style={{ ...FELL, letterSpacing: "0.36em" }}
              >
                Color
              </label>
              <div className="grid grid-cols-6 gap-2">
                {PLAYER_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={`Pick ${c}`}
                    className="relative aspect-square rounded-full transition-transform active:scale-95"
                    style={{
                      backgroundColor: c,
                      boxShadow:
                        c === color
                          ? "0 0 0 2px var(--accent-light), 0 0 0 4px var(--wood-mid), 0 4px 10px rgba(0,0,0,0.45)"
                          : "0 0 0 1.5px rgba(92,59,30,0.6), 0 2px 6px rgba(0,0,0,0.35)",
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="brass-cta block w-full overflow-hidden rounded-[14px] border-[1.5px] border-[var(--accent-dark)] py-3.5 text-center transition-transform active:scale-[0.985] disabled:cursor-not-allowed"
            >
              <span
                className="relative block text-[0.95rem] font-bold uppercase text-[var(--wood-dark)]"
                style={{
                  ...RYE,
                  letterSpacing: "0.22em",
                  textShadow: "0 1px 0 rgba(255,240,200,0.55)",
                }}
              >
                {saving ? "Stampin'…" : savedAt ? "Saved ✓" : "Save"}
              </span>
            </button>
            {error && (
              <div
                className="rounded-[10px] border-[1.5px] border-[#8b2222]/55 bg-[#8b2222]/25 px-3 py-2 text-[0.82rem] font-bold text-[#ffd2c2]"
                style={FELL}
              >
                {error}
              </div>
            )}
          </form>
        </Panel>

        {/* Themes — saloon dressing, paid in eyeBucks */}
        <Panel className="mb-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2
              className="text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/65"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              Themes
            </h2>
            <span
              className="text-[0.62rem] italic text-[var(--parchment-light)]/45"
              style={FELL}
            >
              Buy with eyeBucks
            </span>
          </div>
          {themes === null ? (
            <div
              className="py-5 text-center text-[0.85rem] italic text-[var(--parchment-light)]/50"
              style={FELL}
            >
              Loading the catalog…
            </div>
          ) : (
            <ul className="space-y-2">
              {themes.map((t) => {
                const isActive = profile?.active_theme_slug === t.slug;
                const isOwned = owned.has(t.slug);
                const canAfford = (profile?.balance ?? 0) >= t.price_eyebucks;
                const preview = THEME_PREVIEW[t.slug];
                const busy = themeBusy === t.slug;
                return (
                  <li
                    key={t.slug}
                    className="relative flex items-center gap-3 rounded-[12px] border-[1.5px] px-3 py-2.5"
                    style={{
                      background: isActive
                        ? "linear-gradient(180deg, rgba(201,154,51,0.18) 0%, rgba(122,90,24,0.18) 100%)"
                        : "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
                      borderColor: isActive
                        ? "rgba(255,209,122,0.65)"
                        : "rgba(201,154,51,0.3)",
                    }}
                  >
                    {/* Preview swatch */}
                    <div
                      aria-hidden
                      className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-[8px] border-[1.5px] border-[var(--wood-mid)]"
                      style={{
                        background: preview?.bg ?? "var(--felt-mid)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
                      }}
                    >
                      <div className="absolute inset-1 grid grid-cols-2 gap-1">
                        {(preview?.swatches ?? []).slice(0, 4).map((c, i) => (
                          <div
                            key={i}
                            className="rounded-[3px]"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="truncate text-[0.95rem] font-bold text-[var(--parchment-light)]"
                          style={RYE}
                        >
                          {t.name}
                        </span>
                        {isActive && (
                          <span
                            className="rounded-full border border-[var(--accent-light)]/65 bg-[var(--accent-light)]/15 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase text-[var(--accent-light)]"
                            style={{ ...FELL, letterSpacing: "0.24em" }}
                          >
                            Active
                          </span>
                        )}
                      </div>
                      <div
                        className="mt-0.5 truncate text-[0.72rem] italic text-[var(--parchment-light)]/55"
                        style={FELL}
                      >
                        {t.tagline}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {isActive ? null : isOwned ? (
                        <button
                          type="button"
                          onClick={() => handleSelectTheme(t.slug)}
                          disabled={busy}
                          className="rounded-[8px] border-[1.5px] border-[var(--accent-mid)]/55 bg-[rgba(5,28,20,0.65)] px-3 py-1.5 text-[0.65rem] font-bold uppercase text-[var(--parchment-light)]/85 transition-colors hover:border-[var(--accent-light)]/80 hover:text-[var(--accent-light)] disabled:opacity-50"
                          style={{ ...FELL, letterSpacing: "0.22em" }}
                        >
                          {busy ? "…" : "Equip"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBuyTheme(t.slug)}
                          disabled={!canAfford || busy}
                          className="rounded-[8px] border-[1.5px] px-3 py-1.5 text-[0.65rem] font-bold uppercase disabled:cursor-not-allowed disabled:opacity-50"
                          style={{
                            ...FELL,
                            letterSpacing: "0.18em",
                            color: canAfford ? "var(--wood-dark)" : "var(--parchment-light)",
                            background: canAfford
                              ? "linear-gradient(180deg, #ffd989 0%, #d8a93b 48%, #a07a22 100%)"
                              : "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
                            borderColor: canAfford
                              ? "var(--accent-dark)"
                              : "rgba(201,154,51,0.3)",
                            boxShadow: canAfford
                              ? "0 1px 0 rgba(255,240,200,0.75) inset, 0 -2px 0 rgba(60,40,8,0.35) inset, 0 3px 8px rgba(0,0,0,0.4)"
                              : "0 2px 6px rgba(0,0,0,0.35)",
                          }}
                        >
                          {busy
                            ? "…"
                            : `${t.price_eyebucks.toLocaleString()} ◈`}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {themeError && (
            <div
              className="mt-3 rounded-[10px] border-[1.5px] border-[#8b2222]/55 bg-[#8b2222]/25 px-3 py-2 text-[0.82rem] font-bold text-[#ffd2c2]"
              style={FELL}
            >
              {themeError}
            </div>
          )}
          <p
            className="mt-3 text-[0.7rem] italic leading-snug text-[var(--parchment-light)]/45"
            style={FELL}
          >
            More themes will get fully wired into the rest of the app over the
            next few updates. For now, your active theme is shown here and on
            the leaderboard.
          </p>
        </Panel>

        {/* Power-ups — equipable single-game bonuses */}
        <Panel className="mb-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2
              className="text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/65"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              Power-Ups
            </h2>
            <span
              className="text-[0.62rem] italic text-[var(--parchment-light)]/45"
              style={FELL}
            >
              One equipped at a time
            </span>
          </div>
          {powerups === null ? (
            <div
              className="py-5 text-center text-[0.85rem] italic text-[var(--parchment-light)]/50"
              style={FELL}
            >
              Stocking the shelves…
            </div>
          ) : (
            <ul className="space-y-2">
              {powerups.map((p) => {
                const owned = ownedPowerups.get(p.slug) ?? 0;
                const isEquipped = profile?.active_powerup_slug === p.slug;
                const canAfford = (profile?.balance ?? 0) >= p.price_eyebucks;
                const busy = powerupBusy === p.slug;
                return (
                  <li
                    key={p.slug}
                    className="relative flex items-center gap-3 rounded-[12px] border-[1.5px] px-3 py-2.5"
                    style={{
                      background: isEquipped
                        ? "linear-gradient(180deg, rgba(201,154,51,0.22) 0%, rgba(122,90,24,0.18) 100%)"
                        : "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
                      borderColor: isEquipped
                        ? "rgba(255,209,122,0.65)"
                        : "rgba(201,154,51,0.3)",
                    }}
                  >
                    <div
                      aria-hidden
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-[var(--wood-mid)]"
                      style={{
                        background:
                          "radial-gradient(circle at 30% 30%, var(--accent-light), var(--accent-mid) 55%, var(--accent-dark))",
                        fontSize: "1.5rem",
                      }}
                    >
                      {p.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="truncate text-[0.95rem] font-bold text-[var(--parchment-light)]"
                          style={RYE}
                        >
                          {p.name}
                        </span>
                        {isEquipped && (
                          <span
                            className="rounded-full border border-[var(--accent-light)]/65 bg-[var(--accent-light)]/15 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase text-[var(--accent-light)]"
                            style={{ ...FELL, letterSpacing: "0.24em" }}
                          >
                            Equipped
                          </span>
                        )}
                        {owned > 0 && !isEquipped && (
                          <span
                            className="rounded-full border border-[var(--parchment-light)]/30 bg-[var(--parchment-light)]/10 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase text-[var(--parchment-light)]/85"
                            style={{ ...FELL, letterSpacing: "0.24em" }}
                          >
                            ×{owned}
                          </span>
                        )}
                      </div>
                      <div
                        className="mt-0.5 truncate text-[0.72rem] italic text-[var(--parchment-light)]/65"
                        style={FELL}
                      >
                        {p.description}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      {owned > 0 ? (
                        isEquipped ? (
                          <button
                            type="button"
                            onClick={() => handleEquipPowerup(null)}
                            disabled={busy}
                            className="rounded-[8px] border-[1.5px] border-[var(--accent-mid)]/40 px-3 py-1.5 text-[0.65rem] font-bold uppercase text-[var(--parchment-light)]/85 transition-colors hover:border-[var(--accent-light)]/70 disabled:opacity-50"
                            style={{ ...FELL, letterSpacing: "0.22em" }}
                          >
                            {busy ? "…" : "Unequip"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEquipPowerup(p.slug)}
                            disabled={busy}
                            className="rounded-[8px] border-[1.5px] border-[var(--accent-mid)]/55 bg-[rgba(5,28,20,0.65)] px-3 py-1.5 text-[0.65rem] font-bold uppercase text-[var(--parchment-light)]/85 transition-colors hover:border-[var(--accent-light)]/80 hover:text-[var(--accent-light)] disabled:opacity-50"
                            style={{ ...FELL, letterSpacing: "0.22em" }}
                          >
                            {busy ? "…" : "Equip"}
                          </button>
                        )
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleBuyPowerup(p.slug)}
                        disabled={!canAfford || busy}
                        className="rounded-[8px] border-[1.5px] px-3 py-1.5 text-[0.65rem] font-bold uppercase disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                          ...FELL,
                          letterSpacing: "0.18em",
                          color: canAfford ? "var(--wood-dark)" : "var(--parchment-light)",
                          background: canAfford
                            ? "linear-gradient(180deg, var(--accent-light) 0%, var(--accent-mid) 48%, var(--accent-dark) 100%)"
                            : "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
                          borderColor: canAfford
                            ? "var(--accent-dark)"
                            : "rgba(201,154,51,0.3)",
                        }}
                      >
                        {busy ? "…" : `${p.price_eyebucks.toLocaleString()} ◈`}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {powerupError && (
            <div
              className="mt-3 rounded-[10px] border-[1.5px] border-[#8b2222]/55 bg-[#8b2222]/25 px-3 py-2 text-[0.82rem] font-bold text-[#ffd2c2]"
              style={FELL}
            >
              {powerupError}
            </div>
          )}
          <p
            className="mt-3 text-[0.7rem] italic leading-snug text-[var(--parchment-light)]/45"
            style={FELL}
          >
            Equipped power-ups apply to your next cross-device hand and are
            consumed on settle. Stack inventory by buying multiple.
          </p>
        </Panel>

        {/* Achievements — earned badges + unlock catalog */}
        <Panel className="mb-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2
              className="text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/65"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              Badges
            </h2>
            <span
              className="text-[0.62rem] italic text-[var(--parchment-light)]/45"
              style={FELL}
            >
              {earnedAchievements.size}/{achievementCatalog?.length ?? 0}
            </span>
          </div>
          {!achievementCatalog ? (
            <div
              className="py-5 text-center text-[0.85rem] italic text-[var(--parchment-light)]/50"
              style={FELL}
            >
              Looking up your bounty list…
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {achievementCatalog.map((a) => {
                const earned = earnedAchievements.has(a.slug);
                return (
                  <div
                    key={a.slug}
                    title={
                      earned
                        ? `${a.name} — ${a.description}`
                        : a.hidden
                        ? "???"
                        : `${a.name} — ${a.description}`
                    }
                    className="relative flex aspect-square flex-col items-center justify-center rounded-[10px] border-[1.5px] p-1 text-center"
                    style={{
                      background: earned
                        ? "linear-gradient(180deg, rgba(201,154,51,0.25) 0%, rgba(122,90,24,0.18) 100%)"
                        : "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
                      borderColor: earned
                        ? "rgba(255,209,122,0.6)"
                        : "rgba(201,154,51,0.18)",
                      opacity: earned ? 1 : 0.4,
                    }}
                  >
                    <div
                      className="text-[1.3rem] leading-none"
                      style={{
                        filter: earned ? "none" : "grayscale(1)",
                      }}
                    >
                      {a.hidden && !earned ? "❓" : a.icon}
                    </div>
                    <div
                      className="mt-1 line-clamp-1 text-[0.55rem] font-bold uppercase leading-tight text-[var(--parchment-light)]"
                      style={{ ...FELL, letterSpacing: "0.12em" }}
                    >
                      {a.hidden && !earned ? "???" : a.name}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Game history */}
        <Panel>
          <div className="mb-3">
            <h2
              className="text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/65"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              Recent Hands
            </h2>
          </div>
          {history === null ? (
            <div
              className="py-5 text-center text-[0.85rem] italic text-[var(--parchment-light)]/50"
              style={FELL}
            >
              Riding into the records…
            </div>
          ) : finishedHistory.length === 0 ? (
            <div
              className="rounded-[10px] border border-dashed border-[var(--accent-mid)]/30 py-7 text-center text-[0.85rem] italic text-[var(--parchment-light)]/55"
              style={FELL}
            >
              No finished hands yet. Cross-device games you join while signed in
              will show up here.
            </div>
          ) : (
            <ul className="space-y-2">
              {finishedHistory.map((h) => {
                const iWon = h.winner_player_id === h.player_id;
                const stuck = h.mode === "loser" && iWon;
                const result = h.mode === "loser"
                  ? (stuck ? "Stuck with the Tab" : "Walked Free")
                  : (iWon ? "Champion" : "Knocked Out");
                const resultColor = h.mode === "loser"
                  ? (stuck ? "#c43838" : "var(--accent-light)")
                  : (iWon ? "var(--accent-light)" : "var(--parchment-light)");
                return (
                  <li
                    key={h.player_id}
                    className="flex items-center justify-between rounded-[10px] border-[1.5px] border-[var(--accent-mid)]/30 px-3 py-2"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[0.92rem] font-bold"
                        style={{ ...RYE, color: resultColor }}
                      >
                        {result}
                      </div>
                      <div
                        className="text-[0.7rem] italic text-[var(--parchment-light)]/55"
                        style={FELL}
                      >
                        {fmtDate(h.created_at)} · code {h.code}
                        {h.wager ? ` · ${h.wager}` : ""}
                      </div>
                    </div>
                    <div
                      className="ml-2 text-[0.7rem] uppercase text-[var(--parchment-light)]/45"
                      style={{ ...FELL, letterSpacing: "0.24em" }}
                    >
                      {h.mode === "loser" ? "Tab" : "Pot"}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <style jsx>{`
        :global(.parchment-input) {
          background: linear-gradient(
            180deg,
            var(--parchment-light) 0%,
            var(--parchment-mid) 60%,
            var(--parchment-dark) 100%
          );
          border: 1.5px solid var(--wood-mid);
          box-shadow: 0 1px 0 rgba(255, 240, 210, 0.55) inset,
            0 -1px 0 rgba(101, 67, 33, 0.18) inset,
            0 3px 10px rgba(0, 0, 0, 0.35);
        }
        :global(.parchment-input:focus) {
          box-shadow: 0 0 0 2px var(--accent-light),
            0 1px 0 rgba(255, 240, 210, 0.55) inset,
            0 3px 10px rgba(0, 0, 0, 0.4);
        }
        :global(.brass-cta) {
          background: linear-gradient(
            180deg,
            #ffd989 0%,
            #d8a93b 48%,
            #a07a22 100%
          );
          box-shadow: 0 1px 0 rgba(255, 240, 200, 0.85) inset,
            0 -2px 0 rgba(60, 40, 8, 0.35) inset,
            0 10px 26px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </main>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative rounded-[16px] border-[1.5px] border-[var(--accent-mid)]/35 p-4 ${className}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(10,40,28,0.65) 0%, rgba(5,28,20,0.78) 100%)",
        boxShadow:
          "0 1px 0 rgba(244,228,183,0.06) inset, 0 14px 30px rgba(0,0,0,0.45)",
      }}
    >
      {children}
    </section>
  );
}

function StatTile({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div
      className="rounded-[10px] border-[1.5px] border-[var(--accent-mid)]/25 p-2 text-center"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
      }}
    >
      <div
        className="text-[1.05rem] leading-none text-[var(--accent-light)]"
        style={{
          fontFamily: "var(--font-rye), Georgia, serif",
          textShadow: "0 1px 0 rgba(0,0,0,0.55)",
        }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div
        className="mt-1 text-[0.55rem] font-bold uppercase leading-tight text-[var(--parchment-light)]/55"
        style={{
          fontFamily: "var(--font-fell), Georgia, serif",
          letterSpacing: "0.18em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      d.getFullYear() === new Date().getFullYear() ? undefined : "2-digit",
  });
}
