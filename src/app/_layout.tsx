import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { CoachMarksProvider } from '@/components/wayfare/coach-marks';
import { FontFiles, W } from '@/constants/wayfare';
import { useOtaUpdates } from '@/hooks/use-ota-updates';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/providers/auth-provider';
import { ToastProvider } from '@/providers/toast-provider';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FontFiles);
  useOtaUpdates();
  // keep the native splash up until Instrument Sans is ready (falls back to system font on error)
  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <CoachMarksProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: W.background } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
              <Stack.Screen name="sign-in" />
              <Stack.Screen name="search" options={{ animation: 'fade' }} />
              <Stack.Screen name="destination/[slug]" />
              <Stack.Screen name="experience/[slug]" />
              <Stack.Screen name="book" />
              <Stack.Screen name="trip" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="auth/callback" />
            </Stack>
          </CoachMarksProvider>
          <AnimatedSplashOverlay />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
