import { Stack } from 'expo-router';

/**
 * Step 1 (dates + travelers) is open to guests so they can see the real total first.
 * Sign-in is asked for when they continue to Review; review, payment and confirmed guard themselves.
 */
export default function BookingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="confirmed" options={{ gestureEnabled: false, animation: 'fade' }} />
    </Stack>
  );
}
