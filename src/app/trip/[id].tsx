import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Row } from '@/components/wayfare/booking-ui';
import { Button, ConfirmDialog, StatusBadge } from '@/components/wayfare/controls';
import { BackButton, EmptyState, ErrorState, Icon } from '@/components/wayfare/primitives';
import { RemoteImage } from '@/components/wayfare/remote-image';
import { DetailSkeleton } from '@/components/wayfare/skeleton';
import { Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';
import { addTripToCalendar, contactSupport, openDirections } from '@/features/booking/trip-actions';
import { travelersLabel } from '@/features/booking/travelers';
import { isUpcoming, useBooking, useCancelBooking } from '@/hooks/use-bookings';
import { useExperience } from '@/hooks/use-experience';
import { daysBetweenInclusive, formatRange } from '@/lib/dates';
import { readableError } from '@/lib/errors';
import { useToast } from '@/providers/toast-provider';

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const booking = useBooking(id);
  const exp = useExperience(booking.data?.experience?.slug ?? '');
  const cancel = useCancelBooking();
  const [confirming, setConfirming] = useState(false);

  if (booking.isPending) return <DetailSkeleton heroHeight={260} />;
  if (booking.isError || !booking.data) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={{ paddingHorizontal: Space.screenX - 4 }}>
          <BackButton />
        </View>
        {booking.isError ? (
          <ErrorState height={400} onRetry={() => booking.refetch()} />
        ) : (
          <EmptyState height={400} icon="luggage" title="Trip not found" message="It may belong to a different account." />
        )}
      </View>
    );
  }

  const b = booking.data;
  const title = b.experience?.title ?? 'Experience';
  const days = daysBetweenInclusive(b.start_date, b.end_date);
  const upcoming = isUpcoming(b);
  const place = b.experience?.destination ? `${b.experience.destination.name}, ${b.experience.destination.country}` : undefined;
  const total = new Intl.NumberFormat('en-US', { style: 'currency', currency: b.experience?.currency ?? 'USD' }).format(b.total_price);

  const doCancel = async () => {
    try {
      await cancel.mutateAsync(b.id);
      setConfirming(false);
      toast('Booking cancelled', 'info');
    } catch (e) {
      setConfirming(false);
      toast(await readableError(e));
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + Space.xxxl }}>
        <View style={styles.hero}>
          <RemoteImage uri={b.experience?.cover_image_url} label={title} style={StyleSheet.absoluteFill} />
          <View style={[styles.heroBar, { top: insets.top + Space.sm }]}>
            <BackButton />
          </View>
        </View>
        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <Text style={[Type.title, { color: W.text, flex: 1 }]}>{title}</Text>
            <StatusBadge status={b.status} />
          </View>
          {b.experience?.destination ? (
            <Text style={[Type.caption, { color: W.textSecondary }]}>
              {b.experience.destination.name}, {b.experience.destination.country}
            </Text>
          ) : null}

          <Card>
            <Line icon="calendar" text={`${formatRange(b.start_date, b.end_date)} · ${days} ${days === 1 ? 'day' : 'days'}`} />
            <Line icon="people" text={travelersLabel(b.adults, b.children, b.infants)} />
            <Row label="Booking ID" value={b.booking_code} strong />
            <Row label="Total paid" value={total} />
          </Card>

          {exp.data && exp.data.itinerary_days.length > 0 ? (
            <Card title="Itinerary">
              {exp.data.itinerary_days.map((d) => (
                <View key={d.id} style={styles.day}>
                  <View style={styles.dayPill}>
                    <Text style={[Type.micro, { color: W.accentStrong }]}>Day {d.day_number}</Text>
                  </View>
                  <Text style={[Type.body, { color: W.text, flex: 1 }]} numberOfLines={1}>{d.title}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {b.status !== 'cancelled' ? (
            <Button label="Show QR ticket" variant="dark" onPress={() => router.push({ pathname: '/trip/ticket/[id]', params: { id: b.id } })} fill />
          ) : null}

          {/* what travellers reach for before and during the trip */}
          <View style={styles.actions}>
            {upcoming && place ? (
              <ActionRow icon="directions" label="Get directions" detail={place} onPress={() => openDirections(place).catch(() => toast('Could not open Maps'))} />
            ) : null}
            {upcoming ? (
              <ActionRow
                icon="calendarAdd"
                label="Add to calendar"
                detail={formatRange(b.start_date, b.end_date)}
                onPress={() =>
                  addTripToCalendar({ title, place, start: b.start_date, end: b.end_date, code: b.booking_code }).catch(() =>
                    toast('Could not open your calendar'),
                  )
                }
              />
            ) : null}
            <ActionRow
              icon="help"
              label="Contact support"
              detail={`About booking ${b.booking_code}`}
              onPress={() => contactSupport(b.booking_code).catch(() => toast('No email app found'))}
              last
            />
          </View>

          {/* cancelling is available but deliberately quiet */}
          {upcoming ? (
            <Pressable onPress={() => setConfirming(true)} accessibilityRole="button" hitSlop={8} style={styles.cancelLink}>
              <Text style={[Type.bodyMedium, { color: W.error }]}>Cancel booking</Text>
              <Text style={[Type.caption, { color: W.textSecondary }]}>Free until your trip starts · full refund</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirming}
        title="Cancel this trip?"
        message={`${title}, ${formatRange(b.start_date, b.end_date)}.\nYou'll get a full refund of ${total} to your original payment method. This can't be undone.`}
        confirmLabel="Cancel and refund"
        destructive
        loading={cancel.isPending}
        onConfirm={doCancel}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

function ActionRow({ icon, label, detail, onPress, last }: {
  icon: 'directions' | 'calendarAdd' | 'help';
  label: string;
  detail: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.actionRow, !last && styles.actionDivider, pressed && { opacity: 0.6 }]}>
      <View style={styles.actionIcon}>
        <Icon name={icon} size={20} color={W.accentStrong} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[Type.bodyMedium, { color: W.text }]}>{label}</Text>
        <Text style={[Type.caption, { color: W.textSecondary }]} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Icon name="chevronRight" color={W.textSecondary} />
    </Pressable>
  );
}

function Line({ icon, text }: { icon: 'calendar' | 'people'; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Space.md }}>
      <Icon name={icon} color={W.textSecondary} />
      <Text style={[Type.body, { color: W.text, flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: W.background },
  hero: { height: 260, backgroundColor: W.dark },
  heroBar: { position: 'absolute', left: Space.screenX - 4 },
  sheet: {
    marginTop: -Space.xxl,
    backgroundColor: W.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Space.screenX,
    paddingTop: Space.xl,
    gap: Space.lg,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  day: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  actions: { borderRadius: Radius.card, borderWidth: 1, borderColor: W.border, paddingHorizontal: Space.lg },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingVertical: Space.md, minHeight: 64 },
  actionDivider: { borderBottomWidth: 1, borderBottomColor: W.border },
  actionIcon: { width: 40, height: 40, borderRadius: Radius.pill, backgroundColor: W.accentSoft, alignItems: 'center', justifyContent: 'center' },
  cancelLink: { alignItems: 'center', gap: 2, paddingVertical: Space.md },
  dayPill: { paddingVertical: 4, paddingHorizontal: Space.sm, borderRadius: Radius.pill, backgroundColor: W.accentSoft },
}));
