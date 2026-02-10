import { useState, useEffect, useRef, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type AppRole = Enums<"app_role">;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchProfileAndRole = async (userId: string) => {
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      ]);
      if (!isMounted.current) return;
      setProfile(profileRes.data);
      setRole(roleRes.data?.role ?? null);

      // Link user to team_members by email for team_id sync
      if (profileRes.data?.email) {
        const { data: rosterMatch } = await supabase
          .from("team_members")
          .select("id, team_id")
          .eq("email", profileRes.data.email)
          .maybeSingle();
        if (rosterMatch && rosterMatch.team_id && profileRes.data.team_id !== rosterMatch.team_id) {
          await supabase.from("profiles").update({ team_id: rosterMatch.team_id }).eq("id", userId);
          if (isMounted.current) {
            setProfile((prev) => prev ? { ...prev, team_id: rosterMatch.team_id } : prev);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch profile/role:", err);
      if (isMounted.current) {
        setProfile(null);
        setRole(null);
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;

    // Safety timeout: if loading persists > 5s, force clear and redirect
    const timeout = setTimeout(() => {
      if (isMounted.current && loading) {
        console.warn("Auth loading timed out, forcing sign out");
        supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    }, 5000);

    // Listener for ongoing auth changes (fire-and-forget role fetch)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted.current) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          // Don't await — avoid blocking the listener
          fetchProfileAndRole(currentUser.id);
        } else {
          setProfile(null);
          setRole(null);
        }
      }
    );

    // Initial load — controls loading state
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted.current) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchProfileAndRole(currentUser.id);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted.current = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
