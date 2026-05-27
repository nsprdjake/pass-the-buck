"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Buck from "@/components/Buck";
import DetailModal from "@/components/DetailModal";
import {
  loadTextScale,
  saveTextScale,
  TEXT_SCALES,
  type TextScale,
} from "@/lib/textScale";
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
import {
  AVATAR_COST,
  clearActiveAvatar,
  generateAvatar,
  listAvatarStyles,
  listMyAvatars,
  setActiveAvatar,
  type AvatarRow,
  type AvatarStyle,
} from "@/lib/avatars";

const RYE: React.CSSProperties = {
  fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
};
const FELL: React.CSSProperties = {
  fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
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
  const [openBadgeSlug, setOpenBadgeSlug] = useState<string | null>(null);
  const [openPowerupSlug, setOpenPowerupSlug] = useState<string | null>(null);
  const [openThemeSlug, setOpenThemeSlug] = useState<string | null>(null);
  const [openHandPlayerId, setOpenHandPlayerId] = useState<string | null>(null);
  const [textScale, setTextScale] = useState<TextScale>("md");
  const [avatarStyles, setAvatarStyles] = useState<AvatarStyle[] | null>(null);
  const [pickedStyle, setPickedStyle] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [myAvatars, setMyAvatars] = useState<AvatarRow[] | null>(null);

  // Hydrate the persisted Text Size preference once.
  useEffect(() => {
    setTextScale(loadTextScale());
  }, []);

  function changeTextScale(next: TextScale) {
    setTextScale(next);
    saveTextScale(next);
  }

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

  // Load avatar styles + my gallery once auth resolves.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const styles = await listAvatarStyles();
        if (!cancelled) {
          setAvatarStyles(styles);
          if (!pickedStyle && styles.length > 0) setPickedStyle(styles[0].slug);
        }
      } catch {
        if (!cancelled) setAvatarStyles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) {
      setMyAvatars(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await listMyAvatars(user.id);
        if (!cancelled) setMyAvatars(rows);
      } catch {
        if (!cancelled) setMyAvatars([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profile?.avatar_url]);

  // Revoke object URLs when the picked photo changes.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setAvatarError(null);
  }

  async function handleGenerateAvatar() {
    if (!photoFile || !pickedStyle || avatarBusy) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      await generateAvatar({ photo: photoFile, styleSlug: pickedStyle });
      await refreshProfile();
      // Reset the photo so the user can pick a new one for the next round.
      setPhotoFile(null);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Couldn't generate");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleEquipAvatar(row: AvatarRow) {
    if (avatarBusy) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      await setActiveAvatar({ imageUrl: row.image_url, styleSlug: row.style_slug });
      await refreshProfile();
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Couldn't equip");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleClearAvatar() {
    if (avatarBusy) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      await clearActiveAvatar();
      await refreshProfile();
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Couldn't clear");
    } finally {
      setAvatarBusy(false);
    }
  }

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

  // DetailModal owns the Escape-to-close handler now.

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

        {/* Text Size — accessibility / readability picker */}
        <Panel className="mb-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2
              className="text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/65"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              Text Size
            </h2>
            <span
              className="text-[0.62rem] italic text-[var(--parchment-light)]/45"
              style={FELL}
            >
              Saved on this device
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {TEXT_SCALES.map((opt) => {
              const active = textScale === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => changeTextScale(opt.id)}
                  aria-pressed={active}
                  className="flex flex-col items-center justify-center rounded-[10px] border-[1.5px] py-3 transition-transform active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-[var(--accent-light)]/70"
                  style={{
                    background: active
                      ? "linear-gradient(180deg, rgba(201,154,51,0.22) 0%, rgba(122,90,24,0.18) 100%)"
                      : "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
                    borderColor: active
                      ? "rgba(255,209,122,0.7)"
                      : "rgba(201,154,51,0.3)",
                  }}
                >
                  <span
                    className="leading-none text-[var(--accent-text)]"
                    style={{
                      ...RYE,
                      fontSize: `${Math.round(opt.px * 0.9)}px`,
                    }}
                  >
                    Aa
                  </span>
                  <span
                    className="mt-1 text-[0.55rem] font-bold uppercase text-[var(--parchment-light)]/75"
                    style={{ ...FELL, letterSpacing: "0.22em" }}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p
            className="mt-3 text-[0.72rem] italic leading-snug text-[var(--parchment-light)]/55"
            style={FELL}
          >
            Bumps the base font size for the whole app. Default is Medium —
            try Large if anything feels small.
          </p>
        </Panel>

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

        {/* Top-up — buy more eyeBucks. TEST MODE until Stripe is wired. */}
        <Panel className="mb-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2
              className="text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/65"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              Top Up
            </h2>
            <span
              className="rounded-full border border-[#c43838]/55 bg-[#c43838]/15 px-2 py-0.5 text-[0.55rem] font-bold uppercase text-[#ffd2c2]"
              style={{ ...FELL, letterSpacing: "0.24em" }}
              title="No real charges. Stripe integration coming next."
            >
              Test Mode
            </span>
          </div>

          {bundles === null ? (
            <div
              className="py-5 text-center text-[0.85rem] italic text-[var(--parchment-light)]/50"
              style={FELL}
            >
              Counting the cash drawer…
            </div>
          ) : bundles.length === 0 ? (
            <div
              className="rounded-[10px] border border-dashed border-[var(--accent-mid)]/30 py-7 text-center text-[0.85rem] italic text-[var(--parchment-light)]/55"
              style={FELL}
            >
              No bundles available right now.
            </div>
          ) : (
            (() => {
              const bestRate = Math.max(...bundles.map(bucksPerDollar));
              return (
                <ul className="grid grid-cols-2 gap-2">
                  {bundles.map((b) => {
                    const rate = bucksPerDollar(b);
                    const isHighlight = rate === bestRate;
                    const busy = bundleBusy === b.id;
                    return (
                      <li
                        key={b.id}
                        className="relative rounded-[12px] border-[1.5px] p-3"
                        style={{
                          background: isHighlight
                            ? "linear-gradient(180deg, rgba(201,154,51,0.22) 0%, rgba(122,90,24,0.18) 100%)"
                            : "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
                          borderColor: isHighlight
                            ? "rgba(255,209,122,0.65)"
                            : "rgba(201,154,51,0.3)",
                        }}
                      >
                        {isHighlight && (
                          <span
                            className="absolute -top-2 left-2 rounded-full border border-[var(--accent-light)]/65 bg-[var(--accent-light)]/20 px-1.5 py-0.5 text-[0.5rem] font-bold uppercase text-[var(--accent-text)]"
                            style={{ ...FELL, letterSpacing: "0.24em" }}
                          >
                            Best Value
                          </span>
                        )}
                        <div
                          className="truncate text-[0.85rem] font-bold text-[var(--parchment-light)]"
                          style={RYE}
                          title={b.label}
                        >
                          {b.label}
                        </div>
                        {b.tagline && (
                          <div
                            className="mt-0.5 line-clamp-1 text-[0.65rem] italic text-[var(--parchment-light)]/55"
                            style={FELL}
                            title={b.tagline}
                          >
                            {b.tagline}
                          </div>
                        )}
                        <div className="mt-2 flex items-baseline gap-1.5">
                          <span
                            className="text-[1.35rem] leading-none text-[var(--accent-text)]"
                            style={RYE}
                          >
                            {b.amount_eyebucks.toLocaleString()}
                          </span>
                          <span
                            className="text-[0.6rem] uppercase text-[var(--parchment-light)]/65"
                            style={{ ...FELL, letterSpacing: "0.2em" }}
                          >
                            eyeBucks
                          </span>
                        </div>
                        <div
                          className="mt-0.5 text-[0.65rem] italic text-[var(--parchment-light)]/45"
                          style={FELL}
                        >
                          {rate} eB per $1
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBuyBundle(b.id)}
                          disabled={busy}
                          className="mt-3 block w-full rounded-[10px] border-[1.5px] py-2 text-[0.72rem] font-bold uppercase disabled:cursor-not-allowed disabled:opacity-50"
                          style={{
                            ...FELL,
                            letterSpacing: "0.2em",
                            color: "#2a1a0a",
                            background:
                              "linear-gradient(180deg, #ffd989 0%, #d8a93b 48%, #a07a22 100%)",
                            borderColor: "#7a5a18",
                            boxShadow:
                              "0 1px 0 rgba(255,240,200,0.75) inset, 0 -2px 0 rgba(60,40,8,0.35) inset, 0 3px 8px rgba(0,0,0,0.4)",
                          }}
                        >
                          {busy
                            ? "Crediting…"
                            : `${formatPrice(b.price_cents)} (Test)`}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              );
            })()
          )}

          {purchaseFlash && (
            <div
              key={purchaseFlash.at}
              className="mt-3 rounded-[10px] border-[1.5px] border-[var(--accent-light)]/60 bg-[var(--accent-light)]/12 px-3 py-2 text-center text-[0.82rem] font-bold uppercase text-[var(--accent-text)]"
              style={{ ...FELL, letterSpacing: "0.22em" }}
            >
              ✓ Credited +{purchaseFlash.amount.toLocaleString()} eyeBucks
            </div>
          )}

          {bundleError && (
            <div
              className="mt-3 rounded-[10px] border-[1.5px] border-[#8b2222]/55 bg-[#8b2222]/25 px-3 py-2 text-[0.82rem] font-bold text-[#ffd2c2]"
              style={FELL}
            >
              {bundleError}
            </div>
          )}

          <p
            className="mt-3 text-[0.7rem] italic leading-snug text-[var(--parchment-light)]/50"
            style={FELL}
          >
            <strong className="text-[#ffd2c2]/85">Test mode:</strong>{" "}
            buttons credit eyeBucks instantly without taking real money so we
            can shape the economy. Stripe Checkout slots in next.
          </p>
        </Panel>

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

        {/* Avatar Studio — AI-stylized portraits, paid in eyeBucks */}
        <Panel className="mb-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2
              className="text-[0.66rem] font-bold uppercase text-[var(--parchment-light)]/65"
              style={{ ...FELL, letterSpacing: "0.36em" }}
            >
              Avatar Studio
            </h2>
            <span
              className="text-[0.62rem] italic text-[var(--parchment-light)]/45"
              style={FELL}
            >
              {AVATAR_COST} eB per portrait
            </span>
          </div>

          {/* Current avatar tile */}
          <div className="mb-3 flex items-center gap-3">
            <div
              className="grid h-16 w-16 flex-shrink-0 place-items-center overflow-hidden rounded-full border-[1.5px] border-[var(--accent-mid)]/55"
              style={{
                background: profile?.color ?? "var(--wood-mid)",
                boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
              }}
            >
              {profile?.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.avatar_url}
                  alt="Your avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span
                  className="text-[1.6rem] font-bold text-[var(--parchment-light)]"
                  style={RYE}
                >
                  {displayName.charAt(0).toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="text-[0.55rem] font-bold uppercase text-[var(--parchment-light)]/55"
                style={{ ...FELL, letterSpacing: "0.36em" }}
              >
                Current
              </div>
              <div
                className="text-[0.92rem] font-bold text-[var(--parchment-light)]"
                style={RYE}
              >
                {profile?.avatar_url
                  ? avatarStyles?.find((s) => s.slug === profile.avatar_style)?.name ?? "Custom"
                  : "Initial mark"}
              </div>
            </div>
            {profile?.avatar_url && (
              <button
                type="button"
                onClick={handleClearAvatar}
                disabled={avatarBusy}
                className="text-[0.62rem] font-bold uppercase text-[var(--parchment-light)]/55 underline-offset-4 transition-colors hover:text-[var(--accent-light)] hover:underline disabled:opacity-50"
                style={{ ...FELL, letterSpacing: "0.22em" }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Photo + style picker */}
          <div
            className="mb-3 rounded-[12px] border-[1.5px] border-dashed border-[var(--accent-mid)]/45 p-3"
          >
            <label
              className="block cursor-pointer"
            >
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={onPickPhoto}
                className="hidden"
                disabled={avatarBusy}
              />
              <div className="flex items-center gap-3">
                <div
                  className="grid h-14 w-14 flex-shrink-0 place-items-center overflow-hidden rounded-[10px] border-[1.5px] border-[var(--accent-mid)]/55"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(10,40,28,0.6) 0%, rgba(5,28,20,0.85) 100%)",
                  }}
                >
                  {photoPreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={photoPreview}
                      alt="Selected"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[1.5rem]" aria-hidden>📸</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-[0.85rem] font-bold text-[var(--parchment-light)]"
                    style={RYE}
                  >
                    {photoFile ? "Photo ready" : "Tap to pick a photo"}
                  </div>
                  <div
                    className="text-[0.7rem] italic text-[var(--parchment-light)]/55"
                    style={FELL}
                  >
                    {photoFile
                      ? photoFile.name.slice(0, 32)
                      : "Camera or gallery. Stays on this device until you generate."}
                  </div>
                </div>
              </div>
            </label>
          </div>

          {/* Style chips */}
          {avatarStyles && avatarStyles.length > 0 && (
            <div className="mb-3">
              <div
                className="mb-2 text-[0.55rem] font-bold uppercase text-[var(--parchment-light)]/55"
                style={{ ...FELL, letterSpacing: "0.36em" }}
              >
                Style
              </div>
              <div className="flex flex-wrap gap-1.5">
                {avatarStyles.map((s) => {
                  const active = pickedStyle === s.slug;
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => setPickedStyle(s.slug)}
                      aria-pressed={active}
                      disabled={avatarBusy}
                      className="rounded-full border-[1.5px] px-3 py-1.5 text-[0.7rem] font-bold uppercase transition-colors disabled:opacity-50"
                      style={{
                        ...FELL,
                        letterSpacing: "0.18em",
                        background: active
                          ? "linear-gradient(180deg, #ffd989 0%, #d8a93b 48%, #a07a22 100%)"
                          : "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
                        borderColor: active
                          ? "var(--accent-dark)"
                          : "rgba(201,154,51,0.35)",
                        color: active
                          ? "var(--wood-dark)"
                          : "rgba(244,228,183,0.85)",
                      }}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Generate CTA */}
          <button
            type="button"
            onClick={handleGenerateAvatar}
            disabled={!photoFile || !pickedStyle || avatarBusy}
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
              {avatarBusy
                ? "Painting…"
                : `Generate · ${AVATAR_COST} eB`}
            </span>
          </button>

          {avatarError && (
            <div
              className="mt-3 rounded-[10px] border-[1.5px] border-[#8b2222]/55 bg-[#8b2222]/25 px-3 py-2 text-[0.82rem] font-bold text-[#ffd2c2]"
              style={FELL}
            >
              {avatarError}
            </div>
          )}

          {/* Gallery — re-equip past generations free */}
          {myAvatars && myAvatars.length > 0 && (
            <div className="mt-4">
              <div
                className="mb-2 text-[0.55rem] font-bold uppercase text-[var(--parchment-light)]/55"
                style={{ ...FELL, letterSpacing: "0.36em" }}
              >
                Gallery
              </div>
              <div className="grid grid-cols-4 gap-2">
                {myAvatars.map((a) => {
                  const isActive = profile?.avatar_url === a.image_url;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => handleEquipAvatar(a)}
                      disabled={avatarBusy || isActive}
                      title={
                        avatarStyles?.find((s) => s.slug === a.style_slug)?.name ?? a.style_slug
                      }
                      className="relative aspect-square overflow-hidden rounded-[10px] border-[1.5px] transition-transform active:scale-[0.96] disabled:cursor-default focus:outline-none focus:ring-2 focus:ring-[var(--accent-light)]/70"
                      style={{
                        borderColor: isActive
                          ? "rgba(255,209,122,0.85)"
                          : "rgba(201,154,51,0.35)",
                        boxShadow: isActive
                          ? "0 0 12px rgba(255,209,122,0.45)"
                          : "0 2px 6px rgba(0,0,0,0.4)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.image_url}
                        alt={a.style_slug}
                        className="h-full w-full object-cover"
                      />
                      {isActive && (
                        <div
                          className="absolute inset-x-0 bottom-0 bg-[var(--accent-light)]/85 py-0.5 text-center text-[0.5rem] font-bold uppercase text-[var(--wood-dark)]"
                          style={{ ...FELL, letterSpacing: "0.2em" }}
                        >
                          Equipped
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p
            className="mt-3 text-[0.7rem] italic leading-snug text-[var(--parchment-light)]/45"
            style={FELL}
          >
            Photos never leave your device until you tap Generate. The
            portrait shows up on your profile and the leaderboard.
          </p>
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
                    <button
                      type="button"
                      onClick={() => setOpenThemeSlug(t.slug)}
                      aria-label={`${t.name} — tap for details`}
                      className="absolute inset-0 z-0 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-light)]/70"
                    />
                    {/* Preview swatch */}
                    <div
                      aria-hidden
                      className="pointer-events-none relative z-10 h-12 w-12 flex-shrink-0 overflow-hidden rounded-[8px] border-[1.5px] border-[var(--wood-mid)]"
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

                    <div className="pointer-events-none relative z-10 min-w-0 flex-1">
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

                    <div className="relative z-10 flex-shrink-0">
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
                    <button
                      type="button"
                      onClick={() => setOpenPowerupSlug(p.slug)}
                      aria-label={`${p.name} — tap for details`}
                      className="absolute inset-0 z-0 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-light)]/70"
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-[var(--wood-mid)]"
                      style={{
                        background:
                          "radial-gradient(circle at 30% 30%, var(--accent-light), var(--accent-mid) 55%, var(--accent-dark))",
                        fontSize: "1.5rem",
                      }}
                    >
                      {p.icon}
                    </div>
                    <div className="pointer-events-none relative z-10 min-w-0 flex-1">
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
                    <div className="relative z-10 flex flex-shrink-0 flex-col items-end gap-1">
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
                const mystery = a.hidden && !earned;
                return (
                  <button
                    type="button"
                    key={a.slug}
                    onClick={() => setOpenBadgeSlug(a.slug)}
                    aria-label={
                      mystery ? "Mystery badge — tap for details" : `${a.name} — tap for details`
                    }
                    className="relative flex aspect-square flex-col items-center justify-center rounded-[10px] border-[1.5px] p-1 text-center transition-transform active:scale-[0.94] focus:outline-none focus:ring-2 focus:ring-[var(--accent-light)]/70"
                    style={{
                      background: earned
                        ? "linear-gradient(180deg, rgba(201,154,51,0.25) 0%, rgba(122,90,24,0.18) 100%)"
                        : "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
                      borderColor: earned
                        ? "rgba(255,209,122,0.6)"
                        : "rgba(201,154,51,0.18)",
                      opacity: earned ? 1 : 0.5,
                    }}
                  >
                    <div
                      className="text-[1.3rem] leading-none"
                      style={{
                        filter: earned ? "none" : "grayscale(1)",
                      }}
                    >
                      {mystery ? "❓" : a.icon}
                    </div>
                    <div
                      className="mt-1 line-clamp-1 text-[0.55rem] font-bold uppercase leading-tight text-[var(--parchment-light)]"
                      style={{ ...FELL, letterSpacing: "0.12em" }}
                    >
                      {mystery ? "???" : a.name}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Detail modals — shared component, tap-friendly on mobile */}
        {(() => {
          const badge = openBadgeSlug
            ? achievementCatalog?.find((x) => x.slug === openBadgeSlug)
            : null;
          if (!badge) {
            return (
              <DetailModal
                open={false}
                onClose={() => setOpenBadgeSlug(null)}
                label="Badge"
              >
                {null}
              </DetailModal>
            );
          }
          const earnedRow = earnedAchievements.get(badge.slug);
          const earned = !!earnedRow;
          const mystery = badge.hidden && !earned;
          const awardedDate = earnedRow
            ? new Date(earnedRow.awarded_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : null;
          return (
            <DetailModal
              open
              onClose={() => setOpenBadgeSlug(null)}
              label={mystery ? "Mystery badge" : badge.name}
              accentColor={earned ? "rgba(255,209,122,0.7)" : undefined}
            >
              <div className="text-center">
                <div
                  className="mb-2 text-[0.55rem] font-bold uppercase text-[var(--parchment-light)]/55"
                  style={{ ...FELL, letterSpacing: "0.36em" }}
                >
                  {earned ? "Earned" : mystery ? "Locked" : "Unearned"}
                </div>
                <div
                  className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full border-[1.5px]"
                  style={{
                    borderColor: earned
                      ? "rgba(255,209,122,0.7)"
                      : "rgba(201,154,51,0.3)",
                    background: earned
                      ? "linear-gradient(180deg, rgba(201,154,51,0.35) 0%, rgba(122,90,24,0.25) 100%)"
                      : "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
                    boxShadow: earned ? "0 0 20px rgba(255,209,122,0.4)" : "none",
                  }}
                >
                  <span
                    className="text-[2.6rem] leading-none"
                    style={{ filter: earned ? "none" : "grayscale(1)" }}
                  >
                    {mystery ? "❓" : badge.icon}
                  </span>
                </div>
                <h3
                  className="text-[1.3rem] leading-tight text-[var(--accent-text)]"
                  style={{
                    ...RYE,
                    textShadow: "0 2px 0 #5c3b1e, 0 3px 0 rgba(0,0,0,0.5)",
                  }}
                >
                  {mystery ? "Mystery Badge" : badge.name}
                </h3>
                <p
                  className="mt-2 text-[0.85rem] leading-snug text-[var(--parchment-light)]/80"
                  style={FELL}
                >
                  {mystery
                    ? "Keep playing to reveal what this one wants. We're not spoiling it."
                    : badge.description}
                </p>
                {badge.reward_eyebucks > 0 && (
                  <div
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-light)]/55 bg-[var(--accent-light)]/12 px-3 py-1 text-[0.72rem] font-bold uppercase text-[var(--accent-text)]"
                    style={{ ...FELL, letterSpacing: "0.2em" }}
                  >
                    <span aria-hidden>💰</span>
                    <span>
                      {earned ? "+" : ""}
                      {badge.reward_eyebucks} eyeBucks
                      {earned ? " awarded" : " on earn"}
                    </span>
                  </div>
                )}
                {awardedDate && (
                  <div
                    className="mt-3 text-[0.7rem] italic text-[var(--parchment-light)]/55"
                    style={FELL}
                  >
                    Earned {awardedDate}
                  </div>
                )}
              </div>
            </DetailModal>
          );
        })()}

        {/* Power-up detail modal */}
        {(() => {
          const p = openPowerupSlug
            ? powerups?.find((x) => x.slug === openPowerupSlug)
            : null;
          if (!p) {
            return (
              <DetailModal
                open={false}
                onClose={() => setOpenPowerupSlug(null)}
                label="Power-up"
              >
                {null}
              </DetailModal>
            );
          }
          const owned = ownedPowerups.get(p.slug) ?? 0;
          const isEquipped = profile?.active_powerup_slug === p.slug;
          return (
            <DetailModal
              open
              onClose={() => setOpenPowerupSlug(null)}
              label={p.name}
              accentColor={isEquipped ? "rgba(255,209,122,0.7)" : undefined}
            >
              <div className="text-center">
                <div
                  className="mb-2 text-[0.55rem] font-bold uppercase text-[var(--parchment-light)]/55"
                  style={{ ...FELL, letterSpacing: "0.36em" }}
                >
                  {isEquipped ? "Equipped" : owned > 0 ? `Owned ×${owned}` : "Not owned"}
                </div>
                <div
                  aria-hidden
                  className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-[14px] border-[1.5px] border-[var(--wood-mid)]"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, var(--accent-light), var(--accent-mid) 55%, var(--accent-dark))",
                    fontSize: "2.4rem",
                  }}
                >
                  {p.icon}
                </div>
                <h3
                  className="text-[1.3rem] leading-tight text-[var(--accent-text)]"
                  style={{
                    ...RYE,
                    textShadow: "0 2px 0 #5c3b1e, 0 3px 0 rgba(0,0,0,0.5)",
                  }}
                >
                  {p.name}
                </h3>
                <p
                  className="mt-2 text-[0.85rem] leading-snug text-[var(--parchment-light)]/85"
                  style={FELL}
                >
                  {p.description}
                </p>
                <div
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-light)]/55 bg-[var(--accent-light)]/12 px-3 py-1 text-[0.72rem] font-bold uppercase text-[var(--accent-text)]"
                  style={{ ...FELL, letterSpacing: "0.2em" }}
                >
                  <span aria-hidden>💰</span>
                  <span>{p.price_eyebucks.toLocaleString()} eyeBucks</span>
                </div>
                <p
                  className="mt-4 text-[0.72rem] italic leading-snug text-[var(--parchment-light)]/55"
                  style={FELL}
                >
                  Power-ups are consumed when the equipped game ends. Buy more
                  to stack inventory.
                </p>
              </div>
            </DetailModal>
          );
        })()}

        {/* Theme detail modal */}
        {(() => {
          const t = openThemeSlug
            ? themes?.find((x) => x.slug === openThemeSlug)
            : null;
          if (!t) {
            return (
              <DetailModal
                open={false}
                onClose={() => setOpenThemeSlug(null)}
                label="Theme"
              >
                {null}
              </DetailModal>
            );
          }
          const isActive = profile?.active_theme_slug === t.slug;
          const isOwned = owned.has(t.slug);
          const preview = THEME_PREVIEW[t.slug];
          return (
            <DetailModal
              open
              onClose={() => setOpenThemeSlug(null)}
              label={t.name}
              accentColor={isActive ? "rgba(255,209,122,0.7)" : undefined}
            >
              <div className="text-center">
                <div
                  className="mb-2 text-[0.55rem] font-bold uppercase text-[var(--parchment-light)]/55"
                  style={{ ...FELL, letterSpacing: "0.36em" }}
                >
                  {isActive ? "Active" : isOwned ? "Owned" : "Locked"}
                </div>
                <div
                  aria-hidden
                  className="mx-auto mb-3 h-24 w-24 overflow-hidden rounded-[12px] border-[1.5px] border-[var(--wood-mid)]"
                  style={{
                    background: preview?.bg ?? "var(--felt-mid)",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.55)",
                  }}
                >
                  <div className="grid h-full grid-cols-2 gap-1 p-2">
                    {(preview?.swatches ?? []).slice(0, 4).map((c, i) => (
                      <div
                        key={i}
                        className="rounded-[4px]"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <h3
                  className="text-[1.3rem] leading-tight text-[var(--accent-text)]"
                  style={{
                    ...RYE,
                    textShadow: "0 2px 0 #5c3b1e, 0 3px 0 rgba(0,0,0,0.5)",
                  }}
                >
                  {t.name}
                </h3>
                <p
                  className="mt-2 text-[0.85rem] leading-snug text-[var(--parchment-light)]/85"
                  style={FELL}
                >
                  {t.tagline}
                </p>
                {!isOwned && (
                  <div
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-light)]/55 bg-[var(--accent-light)]/12 px-3 py-1 text-[0.72rem] font-bold uppercase text-[var(--accent-text)]"
                    style={{ ...FELL, letterSpacing: "0.2em" }}
                  >
                    <span aria-hidden>💰</span>
                    <span>{t.price_eyebucks.toLocaleString()} eyeBucks</span>
                  </div>
                )}
                {isOwned && !isActive && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectTheme(t.slug);
                      setOpenThemeSlug(null);
                    }}
                    className="brass-cta mt-4 block w-full overflow-hidden rounded-[12px] border-[1.5px] border-[var(--accent-dark)] py-2.5 text-center"
                  >
                    <span
                      className="text-[0.85rem] font-bold uppercase text-[var(--wood-dark)]"
                      style={{ ...RYE, letterSpacing: "0.22em" }}
                    >
                      Equip
                    </span>
                  </button>
                )}
              </div>
            </DetailModal>
          );
        })()}

        {/* Recent hand detail modal */}
        {(() => {
          const h = openHandPlayerId
            ? finishedHistory.find((x) => x.player_id === openHandPlayerId)
            : null;
          if (!h) {
            return (
              <DetailModal
                open={false}
                onClose={() => setOpenHandPlayerId(null)}
                label="Hand"
              >
                {null}
              </DetailModal>
            );
          }
          const iWon = h.winner_player_id === h.player_id;
          const stuck = h.mode === "loser" && iWon;
          const result =
            h.mode === "loser"
              ? stuck
                ? "Stuck with the Tab"
                : "Walked Free"
              : iWon
              ? "Champion"
              : "Knocked Out";
          const resultColor =
            h.mode === "loser"
              ? stuck
                ? "#c43838"
                : "var(--accent-light)"
              : iWon
              ? "var(--accent-light)"
              : "var(--parchment-light)";
          return (
            <DetailModal
              open
              onClose={() => setOpenHandPlayerId(null)}
              label={result}
              accentColor={iWon && !stuck ? "rgba(255,209,122,0.7)" : undefined}
            >
              <div className="text-center">
                <div
                  className="mb-1 text-[0.55rem] font-bold uppercase text-[var(--parchment-light)]/55"
                  style={{ ...FELL, letterSpacing: "0.36em" }}
                >
                  {h.mode === "loser" ? "Loser Mode" : "Winner Mode"}
                </div>
                <h3
                  className="text-[1.4rem] leading-tight"
                  style={{
                    ...RYE,
                    color: resultColor,
                    textShadow: "0 2px 0 #5c3b1e, 0 3px 0 rgba(0,0,0,0.5)",
                  }}
                >
                  {result}
                </h3>
                <div
                  className="mt-2 text-[0.78rem] italic text-[var(--parchment-light)]/65"
                  style={FELL}
                >
                  {fmtDate(h.created_at)} · code {h.code}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div
                    className="rounded-[10px] border border-[var(--accent-mid)]/35 px-3 py-2"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
                    }}
                  >
                    <div
                      className="text-[0.55rem] font-bold uppercase text-[var(--parchment-light)]/55"
                      style={{ ...FELL, letterSpacing: "0.32em" }}
                    >
                      Pot
                    </div>
                    <div
                      className="mt-1 text-[1.15rem] leading-none text-[var(--accent-text)]"
                      style={RYE}
                    >
                      {h.pot.toLocaleString()}
                    </div>
                  </div>
                  <div
                    className="rounded-[10px] border border-[var(--accent-mid)]/35 px-3 py-2"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(10,40,28,0.55) 0%, rgba(5,28,20,0.7) 100%)",
                    }}
                  >
                    <div
                      className="text-[0.55rem] font-bold uppercase text-[var(--parchment-light)]/55"
                      style={{ ...FELL, letterSpacing: "0.32em" }}
                    >
                      Your Bucks
                    </div>
                    <div
                      className="mt-1 text-[1.15rem] leading-none text-[var(--accent-text)]"
                      style={RYE}
                    >
                      {h.player_bucks.toLocaleString()}
                    </div>
                  </div>
                </div>
                {h.wager && (
                  <div
                    className="mt-3 rounded-[10px] border border-[var(--accent-light)]/40 bg-[var(--accent-light)]/10 px-3 py-2 text-[0.78rem] font-bold uppercase text-[var(--accent-text)]"
                    style={{ ...FELL, letterSpacing: "0.22em" }}
                  >
                    Wager: {h.wager}
                  </div>
                )}
                <Link
                  href={`/multi/${h.code}`}
                  className="mt-4 inline-block text-[0.72rem] font-bold uppercase text-[var(--accent-text)] underline-offset-4 hover:underline"
                  style={{ ...FELL, letterSpacing: "0.22em" }}
                  onClick={() => setOpenHandPlayerId(null)}
                >
                  Re-open game →
                </Link>
              </div>
            </DetailModal>
          );
        })()}

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
                  <li key={h.player_id}>
                    <button
                      type="button"
                      onClick={() => setOpenHandPlayerId(h.player_id)}
                      aria-label={`${result} — tap for details`}
                      className="flex w-full items-center justify-between rounded-[10px] border-[1.5px] border-[var(--accent-mid)]/30 px-3 py-2 text-left transition-colors hover:border-[var(--accent-light)]/55 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[var(--accent-light)]/70"
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
                    </button>
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
          fontFamily: "var(--theme-font-display, var(--font-rye), Georgia, serif)",
          textShadow: "0 1px 0 rgba(0,0,0,0.55)",
        }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div
        className="mt-1 text-[0.55rem] font-bold uppercase leading-tight text-[var(--parchment-light)]/55"
        style={{
          fontFamily: "var(--theme-font-vintage, var(--font-fell), Georgia, serif)",
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
