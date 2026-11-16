import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Row } from '@/components/wayfare/booking-ui';
import { Button } from '@/components/wayfare/controls';
import { Icon } from '@/components/wayfare/primitives';
import { Radius, Space, Type, W } from '@/constants/wayfare';
import { formatRange } from '@/lib/dates';

export default function ConfirmedScreen() {
  const p = useLocalSearchParams<{ id: string; code: string; title: string; start: string; end: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Space.xxxl, paddingBottom: insets.bottom + Space.xxl }]}>
      <View style={styles.center}>
        <View style={styles.tick}>
          <Icon name="check" size={88} color={W.accentStrong} />
        </View>
        <Text style={[Type.display, styles.text]}>You&apos;re all set!</Text>
        <Text style={[Type.body, styles.text, { color: W.textSecondary }]}>
          {p.title} is booked. Your ticket is in Trips whenever you need it.
        </Text>
        <View style={styles.card}>
          <Row label="Booking ID" value={p.code} strong />
          {p.start && p.end ? <Row label="Dates" value={formatRange(p.start, p.end)} /> : null}
        </View>
      </View>
      <View style={{ gap: Space.sm }}>
        <Button label="View trip" onPress={() => router.replace({ pathname: '/trip/[id]', params: { id: p.id } })} fill />
        <Button label="Back to home" variant="ghost" onPress={() => router.replace('/')} fill />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: W.background, paddingHorizontal: Space.screenX, justifyContent: 'space-between' },
  center: { alignItems: 'center', gap: Space.lg },
  tick: { width: 160, height: 160, borderRadius: Radius.pill, backgroundColor: W.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: Space.sm },
  text: { color: W.text, textAlign: 'center' },
  card: { alignSelf: 'stretch', borderRadius: Radius.card, borderWidth: 1, borderColor: W.border, padding: Space.lg, gap: Space.md, marginTop: Space.sm },
});
