import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/wayfare/primitives';
import { Space, themedStyles, Type, W } from '@/constants/wayfare';
import { SUPPORT_EMAIL } from '@/features/booking/trip-actions';

/**
 * Plain-language Terms and Privacy pages, linked from Sign in.
 * DRAFT copy written for the app as it works today: have it reviewed before a public launch.
 */
const DOCS: Record<string, { title: string; sections: { heading: string; body: string }[] }> = {
  terms: {
    title: 'Terms of Service',
    sections: [
      { heading: 'Bookings', body: 'When you pay, your booking is confirmed for the dates and travelers shown on the Review & pay screen. Your QR ticket is kept in Trips.' },
      { heading: 'Prices', body: 'Prices are per person and include taxes and fees at checkout. Children aged 2–12 pay 50%. Infants under 2 travel free.' },
      { heading: 'Cancellations', body: 'You can cancel any upcoming trip free of charge until it starts, from Trips → your trip → Cancel booking. You get a full refund to your original payment method.' },
      { heading: 'On the trip', body: 'Your guide may contact you on the mobile number you add when booking. Please arrive at the meeting point on time. Itineraries can change because of weather or local conditions.' },
      { heading: 'Test payments', body: 'Payments in this version of Wayfare are test payments, and no real money is charged.' },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    sections: [
      { heading: 'What we collect', body: 'Your email address, and if you add them, your name, profile photo and mobile number. We also keep your bookings, saved places and any special requests you send.' },
      { heading: 'Why', body: 'To sign you in, confirm and manage your bookings, let your guide reach you about your trip, and show your saved places on every device.' },
      { heading: 'What we don’t do', body: 'We don’t sell your data or use it for third-party advertising. Your phone number is only shared with the guide for your trip.' },
      { heading: 'Your choices', body: `You can edit your profile at any time in Profile. To delete your account and data, email ${SUPPORT_EMAIL}.` },
    ],
  },
};

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const insets = useSafeAreaInsets();
  const page = DOCS[doc] ?? DOCS.terms;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Space.sm }]}>
      <View style={styles.bar}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Space.xxxl }]}>
        <Text style={[Type.display, { color: W.text }]}>{page.title}</Text>
        <Text style={[Type.caption, { color: W.textSecondary }]}>Summary · Last updated 17 November 2026</Text>
        {page.sections.map((s) => (
          <View key={s.heading} style={{ gap: Space.xs }}>
            <Text style={[Type.subheading, { color: W.text }]}>{s.heading}</Text>
            <Text style={[Type.body, { color: W.textSecondary }]}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: W.background },
  bar: { paddingHorizontal: Space.screenX - 4 },
  body: { paddingHorizontal: Space.screenX, paddingTop: Space.lg, gap: Space.xl },
}));
