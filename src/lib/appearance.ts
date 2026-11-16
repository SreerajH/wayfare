import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppearancePreference = 'system' | 'light' | 'dark';

const KEY = 'wayfare.appearance';

export async function loadAppearance(): Promise<AppearancePreference> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

export async function saveAppearance(v: AppearancePreference) {
  try {
    await AsyncStorage.setItem(KEY, v);
  } catch {
    // non-critical: the choice just won't survive a restart
  }
}
