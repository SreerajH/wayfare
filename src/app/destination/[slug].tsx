import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExperienceCard } from '@/components/wayfare/cards';
import { HeartButton } from '@/components/wayfare/heart-button';
import { BackButton, EmptyState, ErrorState, Icon, RatingBadge, SectionHeader } from '@/components/wayfare/primitives';
import { RemoteImage } from '@/components/wayfare/remote-image';
import { DetailSkeleton } from '@/components/wayfare/skeleton';
import { Radius, Space, Type, W } from '@/constants/wayfare';
import { formatReviews } from '@/features/catalog/format';
import { useDestination } from '@/hooks/use-destination';

export default function DestinationScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const q = useDestination(slug);

  if (q.isPending) {
    return (
      <View style={styles.screen}>
        <DetailSkeleton />
        <View style={[styles.heroBar, { top: insets.top + Space.sm }]}>
          <BackButton />
        </View>
      </View>
    );
  }
  if (q.isError || !q.data) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.padded}>
          <BackButton />
        </View>
        {q.isError ? (
          <ErrorState height={400} onRetry={() => q.refetch()} />
        ) : (
          <EmptyState height={400} icon="location" title="Destination not found" message="It may have been removed." />
        )}
      </View>
    );
  }

  const d = q.data;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: insets.bottom + Space.xxxl }}>
      <View style={styles.hero}>
        <RemoteImage uri={d.hero_image_url} label={d.name} style={StyleSheet.absoluteFill} />
        <View style={[styles.heroBar, styles.heroBarRow, { top: insets.top + Space.sm }]}>
          <BackButton />
          <HeartButton
            target={{ kind: 'destination', id: d.id }}
            label={d.name}
            preview={{
              id: `optimistic-${d.id}`, created_at: new Date().toISOString(), destination_id: d.id, experience_id: null, experience: null,
              destination: { id: d.id, slug: d.slug, name: d.name, country: d.country, hero_image_url: d.hero_image_url, rating: d.rating },
            }}
          />
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.titleRow}>
          <Text style={[Type.title, styles.flex, { color: W.text }]}>{d.name}</Text>
          <RatingBadge rating={d.rating} />
        </View>
        <View style={styles.metaRow}>
          <Icon name="location" size={16} color={W.textSecondary} />
          <Text style={[Type.caption, { color: W.textSecondary }]}>
            {d.country} · {formatReviews(d.review_count)}
          </Text>
        </View>
        {d.description ? <Text style={[Type.bodyMedium, styles.description]}>{d.description}</Text> : null}

        <View style={styles.section}>
          <SectionHeader title="Popular experiences" />
          {d.experiences.length === 0 ? (
            <EmptyState height={160} title="No experiences yet" message="New experiences are on the way." />
          ) : (
            d.experiences.map((e) => (
              <ExperienceCard
                key={e.id}
                id={e.id}
                slug={e.slug}
                title={e.title}
                durationDays={e.duration_days}
                durationNights={e.duration_nights}
                pricePerPerson={e.price_per_person}
                currency={e.currency}
                coverImageUrl={e.cover_image_url}
                rating={e.rating}
                reviewCount={e.review_count}
              />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: W.background },
  padded: { paddingHorizontal: Space.screenX },
  flex: { flex: 1 },
  hero: { height: 380, backgroundColor: W.dark },
  heroBar: { position: 'absolute', left: Space.screenX - 4 },
  heroBarRow: { right: Space.screenX - 4, flexDirection: 'row', justifyContent: 'space-between' },
  sheet: {
    marginTop: -Space.xxl,
    backgroundColor: W.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Space.screenX,
    paddingTop: Space.md,
    gap: Space.sm,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.pill, backgroundColor: W.border, marginBottom: Space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  description: { color: W.textSecondary, marginTop: Space.sm },
  section: { marginTop: Space.xxl, gap: Space.lg },
});
