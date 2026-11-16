import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExperienceCard } from '@/components/wayfare/cards';
import { ExpandableText, expandLayout } from '@/components/wayfare/expandable-text';
import { HeartButton } from '@/components/wayfare/heart-button';
import { BackButton, EmptyState, ErrorState, Icon, RatingBadge, SectionHeader } from '@/components/wayfare/primitives';
import { RemoteImage } from '@/components/wayfare/remote-image';
import { DetailSkeleton } from '@/components/wayfare/skeleton';
import { Radius, Space, Type, W } from '@/constants/wayfare';
import { formatReviews } from '@/features/catalog/format';
import { useDestination } from '@/hooks/use-destination';
import { useScreenStatusBar } from '@/hooks/use-screen-status-bar';
import { useToast } from '@/providers/toast-provider';

const HERO_HEIGHT = 380;

export default function DestinationScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const q = useDestination(slug);
  const toast = useToast();
  // light ink while the hero photo is behind the status bar, dark once the white sheet reaches it
  const [pastHero, setPastHero] = useState(false);
  useScreenStatusBar(pastHero || !q.data ? 'dark' : 'light');

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
    <ScrollView
      style={styles.screen}
      scrollEventThrottle={32}
      onScroll={(ev) => {
        const past = ev.nativeEvent.contentOffset.y > HERO_HEIGHT - Space.xxl - insets.top;
        if (past !== pastHero) setPastHero(past);
      }}
      contentContainerStyle={{ paddingBottom: insets.bottom + Space.xxxl }}>
      <View style={styles.hero}>
        <RemoteImage uri={d.hero_image_url} label={d.name} style={StyleSheet.absoluteFill} />
        {/* status-bar scrim so the time and battery stay readable on bright photos */}
        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']} style={styles.scrim} />
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
          <Text style={[Type.display, styles.flex, { color: W.text }]}>{d.name}</Text>
          <RatingBadge rating={d.rating} />
        </View>
        <View style={styles.metaRow}>
          <View style={styles.location}>
            <Icon name="location" size={18} color={W.text} />
            <Text style={[Type.bodyMedium, { color: W.text }]}>{d.country}</Text>
          </View>
          <Pressable
            onPress={() => toast('Reviews coming soon', 'info')}
            accessibilityRole="button"
            accessibilityLabel={`${formatReviews(d.review_count)}, read reviews`}
            hitSlop={8}>
            <Text style={[Type.bodyMedium, styles.reviews]}>{formatReviews(d.review_count)}</Text>
          </Pressable>
        </View>
        {d.description ? (
          <View style={styles.description}>
            <ExpandableText text={d.description} lines={3} style={{ ...Type.body, color: W.textSecondary }} />
          </View>
        ) : null}

        <Animated.View layout={expandLayout} style={styles.section}>
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
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: W.background },
  padded: { paddingHorizontal: Space.screenX },
  flex: { flex: 1 },
  hero: { height: HERO_HEIGHT, backgroundColor: W.dark },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
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
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.md },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  reviews: { color: W.textSecondary, textDecorationLine: 'underline' },
  description: { marginTop: Space.sm },
  section: { marginTop: Space.xxl, gap: Space.lg },
});
