import { Redirect, usePathname } from 'expo-router';
import type { ReactNode } from 'react';

import { LoadingState } from '@/components/wayfare/primitives';
import { useAuth } from '@/providers/auth-provider';

/** Wrap a route layout: signed-out users go to Sign in and come back here afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();
  const pathname = usePathname();
  if (isLoading) return <LoadingState height={400} />;
  if (!session) return <Redirect href={{ pathname: '/sign-in', params: { returnTo: pathname } }} />;
  return <>{children}</>;
}
