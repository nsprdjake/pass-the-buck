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
  created_at: string;
  updated_at: string;
};

type AuthValue = {
  /** True while the initial session check is in flight. */
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  /** Send a 6-digit OTP code to the supplied email. */
  sendOtp: (email: string) => Promise<void>;
  /** Verify a 6-digit OTP code received by email. Returns the session on success. */
  verifyOtp: (email: string, token: string) => Promise<Session | null>;
  /** Update the signed-in user's profile row. */
  updateProfile: (patch: Partial<Pick<Profile, "display_name" | "color">>) => Promise<void>;
  /** Sign the current user out and clear the local session. */
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileFetched = useRef<string | null>(null);

  // Hydrate session on mount + subscribe to auth changes.
  useEffect(() => {
    if (typeof window === "undefined") return;
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

  const sendOtp = useCallback(async (email: string) => {
    const sb = getSupabase();
    const cleaned = email.trim().toLowerCase();
    if (!cleaned) throw new Error("Enter an email");
    const { error } = await sb.auth.signInWithOtp({
      email: cleaned,
      options: {
        // Allow new user creation via OTP — first-time visitors get an
        // account auto-provisioned on verification.
        shouldCreateUser: true,
      },
    });
    if (error) throw new Error(error.message);
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const sb = getSupabase();
    const cleanedEmail = email.trim().toLowerCase();
    const cleanedToken = token.trim();
    if (cleanedToken.length < 6) throw new Error("Code is six digits");
    const { data, error } = await sb.auth.verifyOtp({
      email: cleanedEmail,
      token: cleanedToken,
      type: "email",
    });
    if (error) throw new Error(error.message);
    setSession(data.session ?? null);
    return data.session ?? null;
  }, []);

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
    profileFetched.current = null;
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      user: session?.user ?? null,
      session,
      profile,
      sendOtp,
      verifyOtp,
      updateProfile,
      signOut,
    }),
    [loading, session, profile, sendOtp, verifyOtp, updateProfile, signOut]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
