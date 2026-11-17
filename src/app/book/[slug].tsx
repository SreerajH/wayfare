import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { BookingScaffold, Card, ExperienceSummary } from '@/components/wayfare/booking-ui';
import { Calendar } from '@/components/wayfare/calendar';
import { Button, Stepper } from '@/components/wayfare/controls';
import { EmptyState, ErrorState } from '@/components/wayfare/primitives';
import { DetailSkeleton } from '@/components/wayfare/skeleton';
import { Type, W } from '@/constants/wayfare';
import { formatPrice } from '@/features/catalog/format';
import { useQuote } from '@/hooks/use-bookings';
import { useExperience } from '@/hooks/use-experience';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { addDays, formatRange, today } from '@/lib/dates';

const MAX_PARTY = 10;

export default function SelectDatesScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const exp = useExperience(slug);
  const [start, setStart] = useState<string | null>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const quote = useQuote(exp.data?.id, adults, children);

  if (exp.isPending) return <DetailSkeleton heroHeight={120} />;
  if (exp.isError) return <ErrorState height={500} onRetry={() => exp.refetch()} />;
  if (!exp.data) return <EmptyState height={500} title="Experience not found" message="It may have been removed." />;

  const e = exp.data;
  const minDate = addDays(today(), 1); // earliest start: tomorrow
  const end = start ? addDays(start, e.duration_days - 1) : null;

  return (
    <BookingScaffold
      title="Select dates"
      step="Step 1 of 3"
      footer={
        <>
          <View style={{ flexShrink: 1 }}>
            <Text style={[Type.caption, { color: W.textSecondary }]}>
              Total · {adults + children} {adults + children === 1 ? 'traveler' : 'travelers'} · incl. taxes
            </Text>
            <Text style={[Type.subheading, { color: W.text }]}>
              {quote.data ? formatPrice(quote.data.total, quote.data.currency) : quote.isError ? '—' : '…'}
            </Text>
          </View>
          <Button
            label="Continue"
            disabled={!start || !quote.data}
            onPress={() => {
              const params = { slug, start: start!, adults: String(adults), children: String(children) };
              // guests sign in here, then land straight on Review with their picks
              if (requireAuth(`/book/review?${new URLSearchParams(params).toString()}`)) router.push({ pathname: '/book/review', params });
            }}
          />
        </>
      }>
      <ExperienceSummary title={e.title} image={e.cover_image_url} days={e.duration_days} nights={e.duration_nights} />
      <Calendar minDate={minDate} maxDate={addDays(today(), 365)} start={start} durationDays={e.duration_days} onSelectStart={setStart} />
      <Text style={[Type.bodyMedium, { color: start ? W.accentStrong : W.textSecondary }]}>
        {start && end ? `${formatRange(start, end)} · ${e.duration_days} ${e.duration_days === 1 ? 'day' : 'days'}` : 'Pick a start date — the end date follows the trip length.'}
      </Text>
      <Card title="Travelers">
        <Stepper label="Adults" detail={`Age 13+ · ${formatPrice(e.price_per_person, e.currency)}`} value={adults} min={1} max={MAX_PARTY - children} onChange={setAdults} />
        <Stepper label="Children" detail="Age 2–12 · 50% off" value={children} min={0} max={MAX_PARTY - adults} onChange={setChildren} />
        <Text style={[Type.caption, { color: W.textSecondary }]}>Up to {MAX_PARTY} travelers per booking.</Text>
      </Card>
    </BookingScaffold>
  );
}
