import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BookingScaffold, Card, Row } from '@/components/wayfare/booking-ui';
import { Button } from '@/components/wayfare/controls';
import { ErrorState, Icon, LoadingState } from '@/components/wayfare/primitives';
import { Radius, Space, Type, W } from '@/constants/wayfare';
import { MockPaymentProvider } from '@/features/booking/payment';
import { useCreateBooking, useQuote } from '@/hooks/use-bookings';
import { useExperience } from '@/hooks/use-experience';
import { readableError } from '@/lib/errors';

type Phase = 'idle' | 'paying' | 'booking';

export default function PaymentScreen() {
  const p = useLocalSearchParams<{ slug: string; start: string; adults: string; children: string }>();
  const adults = Number(p.adults) || 1;
  const children = Number(p.children) || 0;
  const router = useRouter();
  const exp = useExperience(p.slug);
  const quote = useQuote(exp.data?.id, adults, children);
  const createBooking = useCreateBooking();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);

  if (exp.isPending || quote.isPending) return <LoadingState height={500} />;
  if (exp.isError || quote.isError || !exp.data) {
    return <ErrorState height={500} onRetry={() => (exp.isError ? exp.refetch() : quote.refetch())} />;
  }

  const e = exp.data;
  const q = quote.data;
  const total = new Intl.NumberFormat('en-US', { style: 'currency', currency: q.currency }).format(q.total);

  const pay = async () => {
    if (phase !== 'idle') return; // no double taps → no double bookings
    setError(null);
    try {
      setPhase('paying');
      const payment = await MockPaymentProvider.pay({ amount: q.total, currency: q.currency, description: e.title });
      setPhase('booking');
      const booking = await createBooking.mutateAsync({ experience_id: e.id, start_date: p.start, adults, children, payment });
      router.dismissAll();
      router.replace({ pathname: '/book/confirmed', params: { id: booking.id, code: booking.booking_code, title: e.title, start: booking.start_date, end: booking.end_date } });
    } catch (err) {
      setError(await readableError(err));
      setPhase('idle');
    }
  };

  return (
    <BookingScaffold
      title="Payment"
      step="Step 3 of 3"
      footer={
        <View style={{ flex: 1, gap: Space.sm }}>
          {error ? <Text style={[Type.caption, { color: W.error }]} accessibilityLiveRegion="assertive">{error}</Text> : null}
          <Button
            label={phase === 'paying' ? 'Processing payment…' : phase === 'booking' ? 'Confirming booking…' : `Pay ${total}`}
            onPress={pay}
            loading={phase !== 'idle'}
            fill
          />
        </View>
      }>
      <Text style={[Type.heading, { color: W.text }]}>Pay with</Text>
      <View style={[styles.option, styles.selected]}>
        <View style={styles.iconCircle}>
          <Icon name="card" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[Type.subheading, { color: W.text }]}>{MockPaymentProvider.label}</Text>
          <Text style={[Type.caption, { color: W.textSecondary }]}>Test payment — no real charge</Text>
        </View>
        <View style={styles.radioOn}>
          <View style={styles.radioDot} />
        </View>
      </View>
      <Pressable disabled style={[styles.option, { opacity: 0.5 }]} accessibilityState={{ disabled: true }}>
        <View style={styles.iconCircle}>
          <Icon name="qr" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[Type.subheading, { color: W.text }]}>UPI / Razorpay</Text>
          <Text style={[Type.caption, { color: W.textSecondary }]}>Coming soon</Text>
        </View>
      </Pressable>
      <Card>
        <Row label={`${e.title} · ${adults + children} ${adults + children === 1 ? 'traveler' : 'travelers'}`} value={total} strong />
      </Card>
      <View style={{ flexDirection: 'row', gap: Space.sm, alignItems: 'center' }}>
        <Icon name="lock" color={W.textSecondary} />
        <Text style={[Type.caption, { color: W.textSecondary, flex: 1 }]}>The price is recalculated on our server before your booking is confirmed.</Text>
      </View>
    </BookingScaffold>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: Space.md, padding: Space.lg, borderRadius: Radius.card, borderWidth: 1, borderColor: W.border },
  selected: { borderColor: W.accentStrong, borderWidth: 1.5, backgroundColor: W.accentSoft },
  iconCircle: { width: 44, height: 44, borderRadius: Radius.pill, backgroundColor: W.background, alignItems: 'center', justifyContent: 'center' },
  radioOn: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: W.accentStrong, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: W.accentStrong },
});
