import { Stack } from 'expo-router';

import { RequireAuth } from '@/components/require-auth';

export default function TripLayout() {
  return (
    <RequireAuth>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ticket/[id]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      </Stack>
    </RequireAuth>
  );
}
