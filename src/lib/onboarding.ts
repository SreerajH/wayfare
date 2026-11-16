import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wayfare.onboarding-seen';

export async function hasSeenOnboarding() {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return true; // storage unavailable (e.g. server render) → don't block the app
  }
}

const RETURN_KEY = 'wayfare.auth-return-to';

/** Remember where to go after an email sign-in link reopens the app. */
export async function setAuthReturnTo(path: string) {
  try {
    await AsyncStorage.setItem(RETURN_KEY, path);
  } catch {
    // non-critical
  }
}

export async function takeAuthReturnTo(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(RETURN_KEY);
    await AsyncStorage.removeItem(RETURN_KEY);
    return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
  } catch {
    return null;
  }
}

export async function markOnboardingSeen() {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // non-critical
  }
}
