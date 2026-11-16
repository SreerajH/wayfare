import * as SystemUI from 'expo-system-ui';
import { createContext, Fragment, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { setColorScheme, W, type ColorScheme } from '@/constants/wayfare';
import { loadAppearance, saveAppearance, type AppearancePreference } from '@/lib/appearance';

type ThemeContextValue = {
  /** what the user picked in More → Appearance */
  appearance: AppearancePreference;
  setAppearance: (v: AppearancePreference) => void;
  /** what is actually shown */
  scheme: ColorScheme;
};

const ThemeContext = createContext<ThemeContextValue>({ appearance: 'system', setAppearance: () => {}, scheme: 'light' });

/**
 * Light / dark theme. Applies the palette before anything renders and remounts the UI below it
 * when the scheme changes (navigation state lives above, in the router, so the current screen stays).
 * Waits for the saved preference so the app never flashes the wrong theme on launch.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [appearance, setAppearanceState] = useState<AppearancePreference | null>(null);

  useEffect(() => {
    loadAppearance().then(setAppearanceState);
  }, []);

  const scheme: ColorScheme = appearance === 'light' || appearance === 'dark' ? appearance : system === 'dark' ? 'dark' : 'light';
  // swap the live palette before this render's children read W
  setColorScheme(scheme);

  useEffect(() => {
    // the window behind screens (shows during transitions / keyboard) and the Android nav bar area
    if (Platform.OS !== 'web') SystemUI.setBackgroundColorAsync(W.background).catch(() => {});
  }, [scheme]);

  if (appearance === null) return null; // a few ms; the native splash is still up

  const setAppearance = (v: AppearancePreference) => {
    setAppearanceState(v);
    saveAppearance(v);
  };

  return (
    <ThemeContext.Provider value={{ appearance, setAppearance, scheme }}>
      <Fragment key={scheme}>{children}</Fragment>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
