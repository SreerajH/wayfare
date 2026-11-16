import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * EAS Update: the app checks for an update on launch (app.json → updates.checkAutomatically)
 * and downloads it in the background. Once one is ready, apply it the next time the user comes
 * back to the app, instead of waiting for a cold start. No-op in Expo Go / dev (updates disabled).
 */
export function useOtaUpdates() {
  const { isUpdatePending } = Updates.useUpdates();

  // also re-check when returning to the app after a while, so long-lived sessions get new designs
  useEffect(() => {
    if (!Updates.isEnabled || __DEV__) return;
    let last = Date.now();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || Date.now() - last < 10 * 60 * 1000) return;
      last = Date.now();
      Updates.checkForUpdateAsync()
        .then((r) => (r.isAvailable ? Updates.fetchUpdateAsync() : null))
        .catch(() => {});
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!Updates.isEnabled || __DEV__ || !isUpdatePending) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') Updates.reloadAsync().catch(() => {});
    });
    return () => sub.remove();
  }, [isUpdatePending]);
}
