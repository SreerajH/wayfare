import { usePathname, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useAuth } from '@/providers/auth-provider';

/**
 * Returns `requireAuth(returnTo?)`: true when signed in; otherwise opens Sign in
 * (which sends the user back to `returnTo`, default the current screen) and returns false.
 */
export function useRequireAuth() {
  const { session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (returnTo: string = pathname) => {
      if (session) return true;
      router.push({ pathname: '/sign-in', params: { returnTo } });
      return false;
    },
    [session, router, pathname],
  );
}
