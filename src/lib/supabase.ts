import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
  );
}

// Static web rendering runs without `window`; AsyncStorage needs it, so only use it in a real runtime.
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

// Publishable key only — every table is protected by Row Level Security.
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: isServer ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: !isServer,
    detectSessionInUrl: false,
    flowType: 'pkce', // Google OAuth returns a ?code= that we exchange in the app
  },
});

// Refresh the session only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
