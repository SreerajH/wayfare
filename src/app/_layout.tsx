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
import { ThemeProvider, useTheme } from '@/providers/theme-provider';
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
        <ThemeProvider>
          <ToastProvider>
            <CoachMarksProvider>
              <ThemedStatusBar />
              <AppStack />
            </CoachMarksProvider>
          </ToastProvider>
        </ThemeProvider>
        {/* outside the theme remount so switching themes doesn't replay the launch animation */}
        <AnimatedSplashOverlay />
      </AuthProvider>
    </QueryClientProvider>
  );
}

/** Dark ink on the light theme, light ink on the dark theme (screens over photos override this while focused). */
function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

/** Rendered inside the ThemeProvider so the screen background follows the theme. */
function AppStack() {
  return (
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
  );
}
