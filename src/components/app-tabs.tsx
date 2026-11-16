import { Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/wayfare/floating-tab-bar';

/** One custom floating tab bar for Android, iOS and web (replaces the native Material tab bar). */
export default function AppTabs() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="more" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
