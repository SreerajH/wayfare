import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';

import { currentColorScheme } from '@/constants/wayfare';

/**
 * Status bar ink for one screen while it is focused (e.g. light over a hero photo).
 * Restores the theme's default ink when the screen loses focus.
 */
/** The theme's normal status bar ink: dark on the light theme, light on the dark theme. */
export const defaultStatusBarStyle = () => (currentColorScheme() === 'dark' ? 'light' : 'dark');

export function useScreenStatusBar(style: 'light' | 'dark') {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(style, true);
      // back to the theme's default ink when leaving the screen
      return () => setStatusBarStyle(defaultStatusBarStyle(), true);
    }, [style]),
  );
}
