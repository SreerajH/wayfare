import type { Session, User } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { hasSeenOnboarding } from '@/lib/onboarding';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Tables<'profiles'> | null;
  /** true until the stored session has been read */
  isLoading: boolean;
  onboardingSeen: boolean;
  setOnboardingSeen: (seen: boolean) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Query keys that hold one user's private data — dropped on sign-out. */
export const USER_SCOPED_KEYS = ['profile', 'saved', 'bookings', 'booking', 'avatar-url'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingSeen, setOnboardingSeen] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([supabase.auth.getSession(), hasSeenOnboarding()])
      .then(([{ data, error }, seen]) => {
        if (!active) return;
        // a broken stored session (e.g. revoked refresh token) → start signed out instead of stuck
        setSession(error ? null : data.session);
        setOnboardingSeen(seen);
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setIsLoading(false); // never leave the app on the splash screen
      });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_OUT') {
        USER_SCOPED_KEYS.forEach((key) => queryClient.removeQueries({ queryKey: [key] }));
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user.id;
  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile: profileQuery.data ?? null,
      isLoading,
      onboardingSeen,
      setOnboardingSeen,
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [session, profileQuery.data, isLoading, onboardingSeen],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
