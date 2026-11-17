import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { RequireAuth } from '@/components/require-auth';
import { BookingScaffold, Card, ExperienceSummary, Row } from '@/components/wayfare/booking-ui';
import { Button, TextField } from '@/components/wayfare/controls';
import { ErrorState, Icon, LoadingState } from '@/components/wayfare/primitives';
import { Space, Type, W } from '@/constants/wayfare';
import { getBookingContact, isValidPhone, setBookingContact } from '@/features/booking/contact';
import { formatPrice } from '@/features/catalog/format';
import { useQuote } from '@/hooks/use-bookings';
import { useExperience } from '@/hooks/use-experience';
import { addDays, formatRange } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function ReviewRoute() {
  return (
    <RequireAuth>
      <ReviewScreen />
    </RequireAuth>
  );
}

function ReviewScreen() {
  const p = useLocalSearchParams<{ slug: string; start: string; adults: string; children: string }>();
  const adults = Number(p.adults) || 1;
  const children = Number(p.children) || 0;
  const router = useRouter();
  const { profile, user } = useAuth();
  const exp = useExperience(p.slug);
  const quote = useQuote(exp.data?.id, adults, children);
  // prefill from what they typed last time in this session, else from their profile
  const [phone, setPhone] = useState(() => getBookingContact()?.phone ?? profile?.phone ?? '');
  const [requests, setRequests] = useState(() => getBookingContact()?.requests ?? '');
  const [phoneTouched, setPhoneTouched] = useState(false);

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

  const next = () => {
    if (!phoneOk) {
      setPhoneTouched(true);
      return;
    }
    setBookingContact({ phone: phone.trim(), requests: requests.trim() });
    // remember the number for next time (best effort; the booking itself carries it either way)
    if (user && !profile?.phone) supabase.from('profiles').update({ phone: phone.trim() }).eq('id', user.id).then(() => {});
    router.push({ pathname: '/book/payment', params: { slug: p.slug, start: p.start, adults: p.adults, children: p.children } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BookingScaffold
        title="Review booking"
        step="Step 2 of 3"
        footer={
          <>
            <View>
              <Text style={[Type.caption, { color: W.textSecondary }]}>Total · incl. taxes</Text>
              <Text style={[Type.subheading, { color: W.text }]}>{fmt(q.total)}</Text>
            </View>
            <Button label="Continue to payment" onPress={next} />
          </>
        }>
        <ExperienceSummary title={e.title} image={e.cover_image_url} days={e.duration_days} nights={e.duration_nights} />
        <Card title="Trip details">
          <Row label="Dates" value={formatRange(p.start, end)} />
          <Row
            label="Travelers"
            value={[`${adults} ${adults === 1 ? 'adult' : 'adults'}`, children ? `${children} ${children === 1 ? 'child' : 'children'}` : '']
              .filter(Boolean)
              .join(', ')}
          />
          <Row label="Lead traveler" value={profile?.full_name || user?.email || ''} />
        </Card>
        <Card title="Contact details">
          <TextField
            label="Mobile number"
            value={phone}
            onChangeText={setPhone}
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
          <Row label="Taxes & fees (5%)" value={fmt(q.taxes)} />
          <View style={{ height: 1, backgroundColor: W.border }} />
          <Row label="Total" value={fmt(q.total)} strong />
        </Card>
        <View style={{ flexDirection: 'row', gap: Space.sm, alignItems: 'center' }}>
          <Icon name="check" color={W.accentStrong} />
          <Text style={[Type.caption, { color: W.textSecondary, flex: 1 }]}>
            Your price is locked in. Free cancellation until your trip starts.
          </Text>
        </View>
      </BookingScaffold>
    </KeyboardAvoidingView>
  );
}
