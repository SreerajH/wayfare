import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession(); // web: closes the popup after the redirect

/**
 * wayfare://auth/callback in dev/production builds, exp://…/--/auth/callback in Expo Go.
 * Every value this returns must be listed under Supabase → Auth → URL Configuration → Redirect URLs.
 */
export const authRedirectUri = makeRedirectUri({ scheme: 'wayfare', path: 'auth/callback' });

/** Google sign-in through Supabase OAuth (PKCE). Resolves true when a session was created. */
export async function signInWithGoogle(): Promise<boolean> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authRedirectUri, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUri);
  if (result.type !== 'success') return false; // user closed the browser

  const url = new URL(result.url);
  const oauthError = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (oauthError) throw new Error(oauthError);
  const code = url.searchParams.get('code');
  if (!code) throw new Error('Google sign-in did not return a code.');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  return true;
}
