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
import { addDays, formatRange, parseISODate, today } from '@/lib/dates';

const MAX_PARTY = 10;
const MAX_INFANTS = 4;

/** A sensible first suggestion: the first Saturday at least a week away (plenty of time to plan). */
function suggestedStart() {
  const inAWeek = addDays(today(), 7);
  const dow = parseISODate(inAWeek).getDay();
  return addDays(inAWeek, (6 - dow + 7) % 7);
}

export default function SelectDatesScreen() {
  const p = useLocalSearchParams<{ slug: string; start?: string; adults?: string; children?: string; infants?: string }>();
  const slug = p.slug;
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const exp = useExperience(slug);
  // "Change" on Review comes back here with the current picks
  const [start, setStart] = useState<string>(() => p.start ?? suggestedStart());
  const [picked, setPicked] = useState(!!p.start);
  const [adults, setAdults] = useState(Number(p.adults) || 2);
  const [children, setChildren] = useState(Number(p.children) || 0);
  const [infants, setInfants] = useState(Number(p.infants) || 0);
  const quote = useQuote(exp.data?.id, adults, children);

  if (exp.isPending) return <DetailSkeleton heroHeight={120} />;
  if (exp.isError) return <ErrorState height={500} onRetry={() => exp.refetch()} />;
  if (!exp.data) return <EmptyState height={500} title="Experience not found" message="It may have been removed." />;

  const e = exp.data;
  const minDate = addDays(today(), 1); // earliest start: tomorrow
  const end = addDays(start, e.duration_days - 1);
  const party = adults + children;

  return (
    <BookingScaffold
      title="Dates & travelers"
      step="Step 1 of 2"
      footer={
        <>
          <View style={{ flexShrink: 1 }}>
            <Text style={[Type.caption, { color: W.textSecondary }]}>
              Total · {party} {party === 1 ? 'traveler' : 'travelers'} · incl. taxes
            </Text>
            <Text style={[Type.subheading, { color: W.text }]}>
              {quote.data ? formatPrice(quote.data.total, quote.data.currency) : quote.isError ? '—' : '…'}
            </Text>
          </View>
          <Button
            label="Continue"
            disabled={!quote.data}
            onPress={() => {
              const params = { slug, start, adults: String(adults), children: String(children), infants: String(infants) };
              // guests sign in here, then land straight on Review with their picks
              if (requireAuth(`/book/review?${new URLSearchParams(params).toString()}`)) router.push({ pathname: '/book/review', params });
            }}
          />
        </>
      }>
      <ExperienceSummary title={e.title} image={e.cover_image_url} days={e.duration_days} nights={e.duration_nights} />
      <Calendar
        minDate={minDate}
        maxDate={addDays(today(), 365)}
        start={start}
        durationDays={e.duration_days}
        onSelectStart={(d) => {
          setStart(d);
          setPicked(true);
        }}
      />
      <Text style={[Type.bodyMedium, { color: W.accentStrong }]}>
        {formatRange(start, end)} · {e.duration_days} {e.duration_days === 1 ? 'day' : 'days'}
      </Text>
      {!picked ? (
        <Text style={[Type.caption, { color: W.textSecondary, marginTop: -8 }]}>
          We picked the next weekend for you. Tap any date to change it. The end date follows the trip length.
        </Text>
      ) : null}
      <Card title="Travelers">
        <Stepper
          label="Adults"
          detail={`Age 13+ · ${formatPrice(e.price_per_person, e.currency)}`}
          value={adults}
          min={1}
          max={MAX_PARTY - children}
          onChange={setAdults}
        />
        <Stepper label="Children" detail="Age 2–12 · 50% off" value={children} min={0} max={MAX_PARTY - adults} onChange={setChildren} />
        <Stepper label="Infants" detail="Under 2 · Free, on a lap" value={infants} min={0} max={MAX_INFANTS} onChange={setInfants} />
        <Text style={[Type.caption, { color: W.textSecondary }]}>Up to {MAX_PARTY} paying travelers per booking.</Text>
      </Card>
    </BookingScaffold>
  );
}
