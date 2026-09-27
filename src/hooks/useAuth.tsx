import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/auth-utils";

export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_image: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  website: string | null;
  linkedin_url: string | null;
  headline: string | null;
  current_job_title: string | null;
  current_company: string | null;
  years_of_experience: number | null;
  skills: string[];
  github_url: string | null;
  portfolio_url: string | null;
  open_to_work: boolean;
}

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Exclude<AppRole, "admin">;
  location?: string;
  companyName?: string;
  companyLocation?: string;
  jobTitle?: string;
}

interface AuthContextValue {
  session: Session | null;
  currentUser: User | null;
  profile: Profile | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ role: AppRole | null }>;
  signUp: (input: SignUpInput) => Promise<{ role: AppRole | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadRole(userId: string): Promise<AppRole | null> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("employer")) return "employer";
  if (roles.includes("job_seeker")) return "job_seeker";
  return null;
}

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, email, first_name, last_name, profile_image, phone, location, bio, website, linkedin_url, headline, current_job_title, current_company, years_of_experience, skills, github_url, portfolio_url, open_to_work",
    )
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      setRole(null);
      return;
    }
    const [nextProfile, nextRole] = await Promise.all([loadProfile(userId), loadRole(userId)]);
    setProfile(nextProfile);
    setRole(nextRole);
  }, []);

  useEffect(() => {
    let active = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession?.user) {
        setProfile(null);
        setRole(null);
        return;
      }
      // Defer supabase calls out of the callback to avoid deadlocks.
      setTimeout(() => {
        void hydrate(nextSession.user.id);
      }, 0);
    });

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      await hydrate(data.session?.user.id);
      setLoading(false);
    })();

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [hydrate]);

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const userId = data.user?.id;
      const nextRole = userId ? await loadRole(userId) : null;
      if (userId) await hydrate(userId);
      return { role: nextRole };
    },
    [hydrate],
  );

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async (input) => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            first_name: input.firstName,
            last_name: input.lastName,
            role: input.role,
            location: input.location ?? input.companyLocation ?? null,
            company_name: input.companyName ?? null,
            company_location: input.companyLocation ?? null,
            job_title: input.jobTitle ?? null,
          },
        },
      });
      if (error) throw error;
      const userId = data.user?.id;
      if (data.session && userId) {
        await hydrate(userId);
        return { role: await loadRole(userId) };
      }
      return { role: null };
    },
    [hydrate],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setRole(null);
  }, []);

  const refresh = useCallback(async () => {
    await hydrate(session?.user.id);
  }, [hydrate, session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      currentUser: session?.user ?? null,
      profile,
      role,
      isAuthenticated: Boolean(session?.user),
      loading,
      signIn,
      signUp,
      signOut,
      refresh,
    }),
    [session, profile, role, loading, signIn, signUp, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
