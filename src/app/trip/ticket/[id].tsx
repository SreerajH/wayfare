import * as Brightness from 'expo-brightness';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Row } from '@/components/wayfare/booking-ui';
import { EmptyState, ErrorState, Icon, LoadingState } from '@/components/wayfare/primitives';
import { Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';
import { useBooking } from '@/hooks/use-bookings';
import { formatRange } from '@/lib/dates';
import { useAuth } from '@/providers/auth-provider';

/** Turn the screen up to full brightness while the ticket is open, then put it back. */
function useMaxBrightness() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let previous: number | null = null;
    let cancelled = false;
    (async () => {
      try {
        previous = await Brightness.getBrightnessAsync();
        if (!cancelled) await Brightness.setBrightnessAsync(1);
      } catch {
        // brightness is a nicety — never block the ticket
      }
    })();
    return () => {
      cancelled = true;
      (async () => {
        try {
          if (Platform.OS === 'android') await Brightness.restoreSystemBrightnessAsync();
          else if (previous !== null) await Brightness.setBrightnessAsync(previous);
        } catch {
          // ignore
        }
      })();
    };
  }, []);
}

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();
  const booking = useBooking(id);
  useMaxBrightness();

  const close = () => (router.canGoBack() ? router.back() : router.replace('/trips'));
  const b = booking.data;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Space.sm, paddingBottom: insets.bottom + Space.xxl }]}>
      <View style={styles.header}>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close ticket" style={styles.close}>
          <Icon name="close" />
        </Pressable>
        <Text style={[Type.heading, { color: W.textInverse }]}>Your ticket</Text>
        <View style={{ width: 44 }} />
      </View>

      {booking.isPending ? (
        <LoadingState height={500} />
      ) : booking.isError ? (
        <ErrorState height={500} onRetry={() => booking.refetch()} />
      ) : !b ? (
        <EmptyState height={500} title="Ticket not found" message="It may belong to a different account." />
      ) : (
        <>
          <View style={styles.ticket}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={[Type.title, { color: W.text, textAlign: 'center' }]}>{b.experience?.title}</Text>
              <Text style={[Type.caption, { color: W.textSecondary }]}>{formatRange(b.start_date, b.end_date)}</Text>
            </View>
            {b.status === 'cancelled' ? (
              <View style={styles.void}>
                <Text style={[Type.heading, { color: W.error }]}>Cancelled</Text>
                <Text style={[Type.caption, { color: W.textSecondary, textAlign: 'center' }]}>This ticket is no longer valid.</Text>
              </View>
            ) : (
              <View accessible accessibilityLabel={`QR code for booking ${b.booking_code}`}>
                <QRCode value={b.booking_code} size={232} color={W.text} backgroundColor={W.background} quietZone={8} />
              </View>
            )}
            <View style={styles.perforation} />
            <View style={{ alignSelf: 'stretch', gap: Space.md }}>
              <Row label="Traveler" value={profile?.full_name || user?.email || ''} />
              <Row label="Booking ID" value={b.booking_code} strong />
              <Row label="Group" value={[`${b.adults} ${b.adults === 1 ? 'adult' : 'adults'}`, b.children ? `${b.children} ${b.children === 1 ? 'child' : 'children'}` : ''].filter(Boolean).join(', ')} />
            </View>
          </View>
          {Platform.OS !== 'web' ? (
            <Text style={[Type.caption, styles.note]}>Brightness is turned up so the code scans easily.</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: W.dark, paddingHorizontal: Space.screenX, gap: Space.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 44, height: 44, borderRadius: Radius.pill, backgroundColor: W.background, alignItems: 'center', justifyContent: 'center' },
  ticket: { backgroundColor: W.background, borderRadius: Radius.sheet, padding: Space.xxl, alignItems: 'center', gap: Space.xl },
  void: { height: 232, alignItems: 'center', justifyContent: 'center', gap: Space.sm },
  perforation: { alignSelf: 'stretch', borderTopWidth: 1, borderStyle: 'dashed', borderColor: W.border },
  note: { color: W.textInverse, textAlign: 'center', opacity: 0.85 },
}));
