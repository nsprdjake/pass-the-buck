"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { registerServiceWorker } from "@/lib/notifications";
import { resetPushSync, syncPushSubscriptionFor } from "@/lib/push";
import { getSupabase } from "@/lib/supabase";

/**
 * A row in `ptb_profiles`. Auto-created for every auth user by trigger.
 * `display_name` and `color` are nullable — users get a chance to set them
 * the first time they sign in.
 */
export type Profile = {
  id: string;
  display_name: string | null;
  color: string | null;
  /** Wallet balance in eyeBucks. Starter balance is 100. Earned by winning
   *  multi-device games; future-spendable on entry costs and power-ups. */
  balance: number;
  /** Slug of the currently-active theme — drives data-theme on <html>. */
  active_theme_slug: string;
  created_at: string;
  updated_at: string;
};

export type DailyBonusClaim = {
  type: "login";
  amount: number;
  awardedAt: number;
};

type AuthValue = {
  /** True while the initial session check is in flight. */
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  /** Sign in with email + password. Returns the session on success. */
  signIn: (email: string, password: string) => Promise<Session | null>;
  /** Create a new account with email + password and an optional display name. */
  signUp: (opts: {
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<Session | null>;
  /** Update the signed-in user's profile row. */
  updateProfile: (
    patch: Partial<Pick<Profile, "display_name" | "color">>
  ) => Promise<void>;
  /** Refetch the profile row (e.g. after a wallet credit on game end). */
  refreshProfile: () => Promise<void>;
  /** Sign the current user out and clear the local session. */
  signOut: () => Promise<void>;
  /** Most recent daily-login bonus awarded in THIS browser session (or null
   *  if today's bonus was already collected before now). Consumers can show
   *  a toast when this changes. */
  lastDailyBonus: DailyBonusClaim | null;
};

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastDailyBonus, setLastDailyBonus] = useState<DailyBonusClaim | null>(null);
  const profileFetched = useRef<string | null>(null);
  const dailyClaimedFor = useRef<string | null>(null);

  // Hydrate session on mount + subscribe to auth changes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Register the service worker eagerly so it's ready by the time a
    // user grants notification permission. Idempotent.
    void registerServiceWorker();
    const sb = getSupabase();
    let cancelled = false;

    sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Whenever the user id changes, fetch their profile. Skip refetching if the
  // user id is the same as the one we already have.
  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (!userId) {
      profileFetched.current = null;
      setProfile(null);
      return;
    }
    if (profileFetched.current === userId) return;
    profileFetched.current = userId;

    const sb = getSupabase();
    let cancelled = false;
    (async () => {
      const { data } = await sb
        .from("ptb_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle<Profile>();
      if (cancelled) return;
      setProfile(data ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const sb = getSupabase();
      const cleanedEmail = email.trim().toLowerCase();
      if (!cleanedEmail) throw new Error("Enter an email");
      if (!password) throw new Error("Enter a password");
      const { data, error } = await sb.auth.signInWithPassword({
        email: cleanedEmail,
        password,
      });
      if (error) throw new Error(prettifyAuthError(error.message));
      setSession(data.session ?? null);
      return data.session ?? null;
    },
    []
  );

  const signUp = useCallback(
    async (opts: {
      email: string;
      password: string;
      displayName?: string;
    }) => {
      const sb = getSupabase();
      const cleanedEmail = opts.email.trim().toLowerCase();
      const password = opts.password;
      if (!cleanedEmail) throw new Error("Enter an email");
      if (!password || password.length < 6) {
        throw new Error("Password needs at least 6 characters");
      }
      const { data, error } = await sb.auth.signUp({
        email: cleanedEmail,
        password,
      });
      if (error) throw new Error(prettifyAuthError(error.message));

      const session = data.session ?? null;
      const userId = data.user?.id ?? null;

      // Best-effort: stamp the new profile with the display name immediately.
      // This UPDATE only succeeds once the session is established (RLS gates
      // ptb_profiles writes on auth.uid() = id), so it gracefully no-ops when
      // email confirmation is required and no session was returned.
      if (session && userId && opts.displayName?.trim()) {
        await sb
          .from("ptb_profiles")
          .update({
            display_name: opts.displayName.trim().slice(0, 20),
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }

      setSession(session);
      return session;
    },
    []
  );

  const refreshProfile = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    const sb = getSupabase();
    const { data } = await sb
      .from("ptb_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle<Profile>();
    setProfile(data ?? null);
  }, [session?.user?.id]);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<Profile, "display_name" | "color">>) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error("Not signed in");
      const sb = getSupabase();
      const next = {
        ...patch,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await sb
        .from("ptb_profiles")
        .update(next)
        .eq("id", userId)
        .select()
        .single<Profile>();
      if (error) throw new Error(error.message);
      setProfile(data);
    },
    [session?.user?.id]
  );

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    await sb.auth.signOut();
    setSession(null);
    setProfile(null);
    setLastDailyBonus(null);
    profileFetched.current = null;
    dailyClaimedFor.current = null;
    resetPushSync();
  }, []);

  // Once per signed-in user per page lifetime, try to claim today's login
  // bonus. The RPC is idempotent server-side (unique key on user + date),
  // so if today's bonus was already collected we just get 0 back.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    if (dailyClaimedFor.current === userId) return;
    dailyClaimedFor.current = userId;
    const sb = getSupabase();
    (async () => {
      const { data, error } = await sb.rpc("ptb_claim_daily_login");
      if (error) return;
      const amount = typeof data === "number" ? data : 0;
      if (amount > 0) {
        setLastDailyBonus({ type: "login", amount, awardedAt: Date.now() });
        // Refresh the profile so the new balance is visible immediately.
        await refreshProfile();
      }
    })();
  }, [session?.user?.id, refreshProfile]);

  // When a user is signed in AND has already granted notification permission,
  // make sure their device's push subscription is registered server-side.
  // This is the "save my subscription so the server can push to me" step —
  // separate from the in-tab Notifications API.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    void syncPushSubscriptionFor(userId);
  }, [session?.user?.id]);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      user: session?.user ?? null,
      session,
      profile,
      signIn,
      signUp,
      updateProfile,
      refreshProfile,
      signOut,
      lastDailyBonus,
    }),
    [
      loading,
      session,
      profile,
      signIn,
      signUp,
      updateProfile,
      refreshProfile,
      signOut,
      lastDailyBonus,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

/**
 * The user's preferred-to-display name. Order of preference:
 *   1. The profile.display_name they explicitly chose
 *   2. The part of their email before "@" (e.g. "jake" from jake@nsprd.com)
 *   3. null — signed out
 */
export function usePreferredName(): string | null {
  const { user, profile } = useAuth();
  const explicit = profile?.display_name?.trim();
  if (explicit) return explicit;
  const fromEmail = user?.email?.split("@")[0];
  return fromEmail?.trim() || null;
}

// Map a few common Supabase auth error messages into friendlier copy.
function prettifyAuthError(msg: string): string {
  const lc = msg.toLowerCase();
  if (lc.includes("invalid login")) return "Wrong email or password.";
  if (lc.includes("user already registered"))
    return "Already got an account with that email. Try signing in.";
  if (lc.includes("email rate limit"))
    return "Too many tries. Hold up a minute, then try again.";
  if (lc.includes("password should be"))
    return "Password needs at least 6 characters.";
  return msg;
}
