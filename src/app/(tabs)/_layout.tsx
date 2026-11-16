import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { useAuth } from '@/providers/auth-provider';

export default function TabsLayout() {
  const { session, isLoading, onboardingSeen } = useAuth();
  if (isLoading) return null; // splash overlay is still up
  // first launch while signed out → onboarding → sign in (browsing stays open afterwards)
  if (!session && !onboardingSeen) return <Redirect href="/onboarding" />;
  return <AppTabs />;
}
