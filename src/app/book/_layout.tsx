import { Stack } from 'expo-router';

import { RequireAuth } from '@/components/require-auth';

export default function BookingLayout() {
  return (
    <RequireAuth>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="confirmed" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
    </RequireAuth>
  );
}
