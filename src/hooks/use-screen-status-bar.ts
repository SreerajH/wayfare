import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';

/**
 * Status bar ink for one screen while it is focused (e.g. light over a hero photo).
 * Restores the app default (dark ink on white) when the screen loses focus.
 */
export function useScreenStatusBar(style: 'light' | 'dark') {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(style, true);
      return () => setStatusBarStyle('dark', true);
    }, [style]),
  );
}
