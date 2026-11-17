import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import { RequireAuth } from '@/components/require-auth';
import { BookingScaffold, Card, ExperienceSummary, Row } from '@/components/wayfare/booking-ui';
import { Button, TextField } from '@/components/wayfare/controls';
import { ErrorState, Icon, LoadingState } from '@/components/wayfare/primitives';
import { Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';
import { getBookingContact, isValidPhone, setBookingContact } from '@/features/booking/contact';
import { MockPaymentProvider } from '@/features/booking/payment';
import { travelersLabel } from '@/features/booking/travelers';
import { formatPrice } from '@/features/catalog/format';
import { useCreateBooking, useQuote } from '@/hooks/use-bookings';
import { useExperience } from '@/hooks/use-experience';
import { addDays, formatRange } from '@/lib/dates';
import { readableError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type Phase = 'idle' | 'paying' | 'booking';

export default function ReviewRoute() {
  return (
    <RequireAuth>
      <ReviewAndPayScreen />
    </RequireAuth>
  );
}

/** Step 2 of 2: check the trip, add contact details and pay, all on one screen. */
function ReviewAndPayScreen() {
  const p = useLocalSearchParams<{ slug: string; start: string; adults: string; children: string; infants?: string }>();
  const adults = Number(p.adults) || 1;
  const children = Number(p.children) || 0;
  const infants = Number(p.infants) || 0;
  const router = useRouter();
  const { profile, user } = useAuth();
  const exp = useExperience(p.slug);
  const quote = useQuote(exp.data?.id, adults, children);
  const createBooking = useCreateBooking();
  // prefill from what they typed earlier in this session, else from their profile
  const [phone, setPhone] = useState(() => getBookingContact()?.phone ?? profile?.phone ?? '');
  const [requests, setRequests] = useState(() => getBookingContact()?.requests ?? '');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);

  if (exp.isPending || quote.isPending) return <LoadingState height={500} />;
  if (exp.isError || quote.isError || !exp.data) {
    return <ErrorState height={500} onRetry={() => (exp.isError ? exp.refetch() : quote.refetch())} />;
  }

  const e = exp.data;
  const q = quote.data;
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: q.currency }).format(n);
  const money = (n: number) => (Number.isInteger(n) ? formatPrice(n, q.currency) : fmt(n));
  const end = addDays(p.start, e.duration_days - 1);
  const phoneOk = isValidPhone(phone);

  // back to step 1 with the current picks
  const change = () => {
    if (router.canGoBack()) router.back();
    else
      router.replace({
        pathname: '/book/[slug]',
        params: { slug: p.slug, start: p.start, adults: String(adults), children: String(children), infants: String(infants) },
      });
  };

  const pay = async () => {
    if (phase !== 'idle') return; // no double taps → no double bookings
    if (!phoneOk) {
      setPhoneTouched(true);
      setError('Add a mobile number so your guide can reach you.');
      return;
    }
    setError(null);
    const contact = { phone: phone.trim(), requests: requests.trim() };
    setBookingContact(contact);
    try {
      setPhase('paying');
      const payment = await MockPaymentProvider.pay({ amount: q.total, currency: q.currency, description: e.title });
      setPhase('booking');
      const booking = await createBooking.mutateAsync({
        experience_id: e.id,
        start_date: p.start,
        adults,
        children,
        infants,
        payment,
        contact_phone: contact.phone,
        special_requests: contact.requests || undefined,
      });
      // remember the number for next time (best effort; the booking already carries it)
      if (user && !profile?.phone) supabase.from('profiles').update({ phone: contact.phone }).eq('id', user.id).then(() => {});
      router.dismissAll();
      router.replace({
        pathname: '/book/confirmed',
        params: {
          id: booking.id,
          code: booking.booking_code,
          title: e.title,
          place: e.destination ? `${e.destination.name}, ${e.destination.country}` : '',
          start: booking.start_date,
          end: booking.end_date,
          adults: String(adults),
          children: String(children),
          infants: String(infants),
        },
      });
    } catch (err) {
      setError(await readableError(err));
      setPhase('idle');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BookingScaffold
        title="Review & pay"
        step="Step 2 of 2"
        footer={
          <View style={{ flex: 1, gap: Space.sm }}>
            {error ? (
              <Text style={[Type.caption, { color: W.error }]} accessibilityLiveRegion="assertive">
                {error}
              </Text>
            ) : null}
            <Button
              label={phase === 'paying' ? 'Processing payment…' : phase === 'booking' ? 'Confirming booking…' : `Pay ${fmt(q.total)}`}
              onPress={pay}
              loading={phase !== 'idle'}
              fill
            />
          </View>
        }>
        <ExperienceSummary title={e.title} image={e.cover_image_url} days={e.duration_days} nights={e.duration_nights} />

        <Card>
          <View style={styles.cardHead}>
            <Text style={[Type.subheading, { color: W.text }]}>Trip details</Text>
            <Pressable onPress={change} accessibilityRole="button" accessibilityLabel="Change dates or travelers" hitSlop={10}>
              <Text style={[Type.bodyMedium, { color: W.accentStrong }]}>Change</Text>
            </Pressable>
          </View>
          <Row label="Dates" value={formatRange(p.start, end)} />
          <Row label="Travelers" value={travelersLabel(adults, children, infants)} />
          <Row label="Lead traveler" value={profile?.full_name || user?.email || ''} />
        </Card>

        <Card title="Contact details">
          <TextField
            label="Mobile number"
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              if (error) setError(null);
            }}
            onBlur={() => setPhoneTouched(true)}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={20}
            error={phoneTouched && !phoneOk ? 'Enter a mobile number so your guide can reach you.' : null}
            helper="Only used for trip updates from your guide."
          />
          <TextField
            label="Special requests (optional)"
            value={requests}
            onChangeText={setRequests}
            placeholder="Dietary needs, accessibility, celebrations…"
            multiline
            maxLength={500}
            style={{ minHeight: 88, paddingTop: Space.md, textAlignVertical: 'top' }}
          />
        </Card>

        <Card title="Price details">
          <Row label={`Adults · ${adults} × ${money(q.price_per_person)}`} value={fmt(q.adults_total)} />
          {children ? <Row label={`Children · ${children} × ${money(q.price_per_person / 2)}`} value={fmt(q.children_total)} /> : null}
          {infants ? <Row label={`Infants · ${infants}`} value="Free" /> : null}
          <Row label="Taxes & fees (5%)" value={fmt(q.taxes)} />
          <View style={{ height: 1, backgroundColor: W.border }} />
          <Row label="Total" value={fmt(q.total)} strong />
        </Card>

        <View style={{ gap: Space.sm }}>
          <Text style={[Type.subheading, { color: W.text }]}>Pay with</Text>
          <View style={[styles.option, styles.selected]}>
            <View style={styles.iconCircle}>
              <Icon name="card" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Type.subheading, { color: W.text }]}>{MockPaymentProvider.label}</Text>
              <Text style={[Type.caption, { color: W.textSecondary }]}>Test payment, no real charge</Text>
            </View>
            <View style={styles.radioOn}>
              <View style={styles.radioDot} />
            </View>
          </View>
          <View style={[styles.option, { opacity: 0.5 }]} accessibilityState={{ disabled: true }}>
            <View style={styles.iconCircle}>
              <Icon name="qr" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Type.subheading, { color: W.text }]}>UPI / Razorpay</Text>
              <Text style={[Type.caption, { color: W.textSecondary }]}>Coming soon</Text>
            </View>
          </View>
        </View>

        <View style={styles.trust}>
          <Icon name="lock" color={W.accentStrong} />
          <Text style={[Type.caption, { color: W.textSecondary, flex: 1 }]}>
            Secure checkout · Price locked · Free cancellation until your trip starts.
          </Text>
        </View>
      </BookingScaffold>
    </KeyboardAvoidingView>
  );
}

const styles = themedStyles(() => ({
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    padding: Space.lg,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: W.border,
  },
  selected: { borderColor: W.accentStrong, borderWidth: 1.5, backgroundColor: W.accentSoft },
  iconCircle: { width: 44, height: 44, borderRadius: Radius.pill, backgroundColor: W.background, alignItems: 'center', justifyContent: 'center' },
  radioOn: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: W.accentStrong, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: W.accentStrong },
  trust: { flexDirection: 'row', gap: Space.sm, alignItems: 'center' },
}));
