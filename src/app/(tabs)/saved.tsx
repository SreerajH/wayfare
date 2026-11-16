import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeartButton } from '@/components/wayfare/heart-button';
import { Chip, EmptyState, ErrorState } from '@/components/wayfare/primitives';
import { RemoteImage } from '@/components/wayfare/remote-image';
import { SignInPrompt } from '@/components/wayfare/sign-in-prompt';
import { GridSkeleton } from '@/components/wayfare/skeleton';
import { BottomTabInset } from '@/constants/theme';
import { Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';
import { formatDuration, formatPrice } from '@/features/catalog/format';
import { useSavedItems, type SavedItem } from '@/hooks/use-saved';
import { useAuth } from '@/providers/auth-provider';

type Filter = 'all' | 'destinations' | 'experiences';

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const saved = useSavedItems();
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  if (!session) {
    return (
      <SignInPrompt
        title="Saved places"
        icon="heart"
        heading="Keep the places you love"
        message="Sign in, then tap the heart on any destination or experience to keep it here."
        returnTo="/saved"
      />
    );
  }

  const items = (saved.data ?? []).filter((i) =>
    filter === 'all' ? true : filter === 'destinations' ? !!i.destination_id : !!i.experience_id,
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Space.sm }]}>
      <View style={styles.header}>
        <Text style={[Type.display, { color: W.text }]}>Saved places</Text>
        {saved.data ? <Text style={[Type.bodyMedium, { color: W.textSecondary }]}>{saved.data.length} saved</Text> : null}
        <View style={styles.chips}>
          <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Destinations" active={filter === 'destinations'} onPress={() => setFilter('destinations')} />
          <Chip label="Experiences" active={filter === 'experiences'} onPress={() => setFilter('experiences')} />
        </View>
      </View>

      {saved.isPending ? (
        <View style={styles.pad}>
          <GridSkeleton />
        </View>
      ) : saved.isError ? (
        <ErrorState height={400} onRetry={() => saved.refetch()} />
      ) : (
        <FlatList
          data={items}
          numColumns={2}
          keyExtractor={(i) => i.id}
          columnWrapperStyle={{ gap: Space.lg }}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + BottomTabInset + Space.xxl }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={W.accentStrong}
              onRefresh={async () => {
                setRefreshing(true);
                await saved.refetch();
                setRefreshing(false);
              }}
            />
          }
          ListEmptyComponent={
            <EmptyState
              height={420}
              icon="heart"
              title={filter === 'all' ? 'No saved places yet' : `No saved ${filter} yet`}
              message="Tap the heart on any destination or experience to keep it here."
              actionLabel="Explore destinations"
              onAction={() => router.push('/search')}
            />
          }
          renderItem={({ item }) => <SavedCard item={item} />}
        />
      )}
    </View>
  );
}

function SavedCard({ item }: { item: SavedItem }) {
  const router = useRouter();
  const d = item.destination;
  const e = item.experience;
  const title = d?.name ?? e?.title ?? 'Saved item';
  const meta = d ? d.country : e ? `${formatDuration(e.duration_days, e.duration_nights)} · ${formatPrice(e.price_per_person, e.currency)}` : '';
  const image = d?.hero_image_url ?? e?.cover_image_url ?? null;
  const target = item.destination_id
    ? ({ kind: 'destination', id: item.destination_id } as const)
    : ({ kind: 'experience', id: item.experience_id! } as const);

  return (
    <View style={styles.card}>
      <Pressable
        style={{ gap: Space.sm }}
        disabled={!d && !e}
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={() =>
          d
            ? router.push({ pathname: '/destination/[slug]', params: { slug: d.slug } })
            : e && router.push({ pathname: '/experience/[slug]', params: { slug: e.slug } })
        }>
        <RemoteImage uri={image} label={title} style={styles.image} />
        <Text style={[Type.subheading, { color: W.text }]} numberOfLines={1}>{title}</Text>
        <Text style={[Type.caption, { color: W.textSecondary }]} numberOfLines={1}>{meta}</Text>
      </Pressable>
      <View style={styles.heart}>
        <HeartButton target={target} label={title} />
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: W.background },
  header: { paddingHorizontal: Space.screenX, gap: 4, paddingBottom: Space.sm },
  chips: { flexDirection: 'row', gap: Space.sm, marginTop: Space.md },
  pad: { paddingHorizontal: Space.screenX, paddingTop: Space.md },
  grid: { paddingHorizontal: Space.screenX, paddingTop: Space.md, gap: Space.xl, flexGrow: 1 },
  card: { flex: 1, maxWidth: '50%' },
  image: { height: 168, borderRadius: Radius.card },
  heart: { position: 'absolute', top: 4, right: 4 },
}));
