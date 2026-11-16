import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/wayfare/controls';
import { Chip, EmptyState, ErrorState } from '@/components/wayfare/primitives';
import { RemoteImage } from '@/components/wayfare/remote-image';
import { SignInPrompt } from '@/components/wayfare/sign-in-prompt';
import { ListSkeleton } from '@/components/wayfare/skeleton';
import { BottomTabInset } from '@/constants/theme';
import { Radius, Space, Type, W } from '@/constants/wayfare';
import { isUpcoming, useBookings, type Booking } from '@/hooks/use-bookings';
import { daysBetweenInclusive, formatRange } from '@/lib/dates';
import { useAuth } from '@/providers/auth-provider';

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const bookings = useBookings();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const { upcoming, past } = useMemo(() => {
    const all = bookings.data ?? [];
    return {
      upcoming: all.filter(isUpcoming),
      past: all.filter((b) => !isUpcoming(b)).sort((a, b) => b.start_date.localeCompare(a.start_date)),
    };
  }, [bookings.data]);

  if (!session) {
    return (
      <SignInPrompt
        title="Your trips"
        icon="luggage"
        heading="All your trips in one place"
        message="Sign in to see your bookings and tickets."
        returnTo="/trips"
      />
    );
  }

  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Space.sm }]}>
      <View style={styles.header}>
        <Text style={[Type.display, { color: W.text }]}>Your trips</Text>
        <View style={styles.tabs}>
          <Chip label={`Upcoming${bookings.data ? ` · ${upcoming.length}` : ''}`} active={tab === 'upcoming'} onPress={() => setTab('upcoming')} />
          <Chip label="Past" active={tab === 'past'} onPress={() => setTab('past')} />
        </View>
      </View>

      {bookings.isPending ? (
        <View style={{ paddingHorizontal: Space.screenX, paddingTop: Space.md }}>
          <ListSkeleton rows={3} />
        </View>
      ) : bookings.isError ? (
        <ErrorState height={400} onRetry={() => bookings.refetch()} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(b) => b.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + BottomTabInset + Space.xxl }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={W.accentStrong}
              onRefresh={async () => {
                setRefreshing(true);
                await bookings.refetch();
                setRefreshing(false);
              }}
            />
          }
          ListEmptyComponent={
            tab === 'upcoming' ? (
              <EmptyState
                height={420}
                icon="luggage"
                title="No trips yet"
                message="Plan your first adventure — explore destinations and book an experience."
                actionLabel="Explore destinations"
                onAction={() => router.push('/search')}
              />
            ) : (
              <EmptyState height={420} icon="calendar" title="No past trips" message="Trips you've taken or cancelled will show up here." />
            )
          }
          renderItem={({ item }) => <TripCard b={item} />}
        />
      )}
    </View>
  );
}

function TripCard({ b }: { b: Booking }) {
  const router = useRouter();
  const title = b.experience?.title ?? 'Experience';
  const days = daysBetweenInclusive(b.start_date, b.end_date);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/trip/[id]', params: { id: b.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatRange(b.start_date, b.end_date)}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
      <RemoteImage uri={b.experience?.cover_image_url} label={title} style={styles.thumb} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[Type.subheading, { color: W.text }]} numberOfLines={1}>{title}</Text>
        <Text style={[Type.caption, { color: W.textSecondary }]}>
          {formatRange(b.start_date, b.end_date)} · {days} {days === 1 ? 'day' : 'days'}
        </Text>
        <StatusBadge status={b.status} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: W.background },
  header: { paddingHorizontal: Space.screenX, gap: Space.md, paddingBottom: Space.sm },
  tabs: { flexDirection: 'row', gap: Space.sm },
  list: { paddingHorizontal: Space.screenX, paddingTop: Space.md, gap: Space.md, flexGrow: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: Space.md, padding: Space.md, borderRadius: Radius.card, borderWidth: 1, borderColor: W.border },
  thumb: { width: 96, height: 80, borderRadius: Radius.sm },
});
