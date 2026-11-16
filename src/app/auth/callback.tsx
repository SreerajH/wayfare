import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import { LoadingState } from '@/components/wayfare/primitives';
import { takeAuthReturnTo } from '@/lib/onboarding';
import { supabase } from '@/lib/supabase';

// Lands here from:
//  • the email sign-in link (wayfare://auth/callback?code=…) — Supabase's default email has a link, no code
//  • Google OAuth on Android, when the redirect arrives as a deep link instead of returning to the browser call
// Finishes the PKCE code exchange, then goes back to where the user started (or home).
export default function AuthCallback() {
  const { code, error_description } = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [target, setTarget] = useState<Href | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      let ok = false;
      if (code && !error_description) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          ok = !error;
        } catch {
          ok = false;
        }
      }
      const returnTo = await takeAuthReturnTo();
      if (!active) return;
      setTarget(ok ? ((returnTo ?? '/') as Href) : { pathname: '/sign-in', params: { error: 'link' } });
    })();
    return () => {
      active = false;
    };
  }, [code, error_description]);

  return target ? <Redirect href={target} /> : <LoadingState height={400} />;
}
