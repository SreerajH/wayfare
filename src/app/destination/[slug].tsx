import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExperienceCard } from '@/components/wayfare/cards';
import { ExpandableText, expandLayout } from '@/components/wayfare/expandable-text';
import { ReviewsSection } from '@/components/wayfare/reviews';
import { HeartButton } from '@/components/wayfare/heart-button';
import { BackButton, EmptyState, ErrorState, Icon, RatingBadge, SectionHeader } from '@/components/wayfare/primitives';
import { RemoteImage } from '@/components/wayfare/remote-image';
import { DetailSkeleton } from '@/components/wayfare/skeleton';
import { Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';
import { formatPrice, formatReviews } from '@/features/catalog/format';
import { useDestination } from '@/hooks/use-destination';
import { defaultStatusBarStyle, useScreenStatusBar } from '@/hooks/use-screen-status-bar';

const HERO_HEIGHT = 380;

export default function DestinationScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const q = useDestination(slug);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [sheetY, setSheetY] = useState(0);
  const [reviewsY, setReviewsY] = useState(0);
  // where the trips list sits in the sheet, and whether any of it is on screen right now
  const [tripsBox, setTripsBox] = useState<{ y: number; h: number } | null>(null);
  const [tripsVisible, setTripsVisible] = useState(true);
  const { height: windowH } = useWindowDimensions();
  // light ink while the hero photo is behind the status bar, dark once the white sheet reaches it
  const [pastHero, setPastHero] = useState(false);
  useScreenStatusBar(pastHero || !q.data ? defaultStatusBarStyle() : 'light');

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
  const from = d.experiences.length ? Math.min(...d.experiences.map((e) => e.price_per_person)) : null;
  const scrollToTrips = () => {
    if (tripsBox) scroller.current?.scrollTo({ y: Math.max(0, sheetY + tripsBox.y - insets.top - Space.lg), animated: true });
  };
  return (
    <View style={styles.screen}>
    <ScrollView
      ref={scroller}
      style={styles.screen}
      scrollEventThrottle={32}
      onScroll={(ev) => {
        const y = ev.nativeEvent.contentOffset.y;
        const past = y > HERO_HEIGHT - Space.xxl - insets.top;
        if (past !== pastHero) setPastHero(past);
        if (tripsBox) {
          const top = sheetY + tripsBox.y;
          // "visible" = at least the first card's worth of the list is inside the viewport
          const visible = top + 160 < y + windowH && top + tripsBox.h > y + insets.top;
          if (visible !== tripsVisible) setTripsVisible(visible);
        }
      }}
      contentContainerStyle={{ paddingBottom: insets.bottom + Space.xxxl + 72 }}>
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

      <View style={styles.sheet} onLayout={(e) => setSheetY(e.nativeEvent.layout.y)}>
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
            onPress={() => scroller.current?.scrollTo({ y: Math.max(0, sheetY + reviewsY - insets.top - Space.lg), animated: true })}
            accessibilityRole="button"
            accessibilityLabel={`${formatReviews(d.review_count)}, jump to reviews`}
            hitSlop={8}>
            <Text style={[Type.bodyMedium, styles.reviews]}>{formatReviews(d.review_count)}</Text>
          </Pressable>
        </View>
        {d.description ? (
          <View style={styles.description}>
            <ExpandableText text={d.description} lines={3} style={{ ...Type.body, color: W.textSecondary }} />
          </View>
        ) : null}

        <Animated.View
          layout={expandLayout}
          style={styles.section}
          onLayout={(e) => setTripsBox({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}>
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

        <Animated.View layout={expandLayout} style={styles.reviewsBlock} onLayout={(e) => setReviewsY(e.nativeEvent.layout.y)}>
          <ReviewsSection target={{ kind: 'destination', id: d.id }} slug={d.slug} rating={d.rating} count={d.review_count} />
        </Animated.View>
      </View>
    </ScrollView>

      {/* a way back to booking from anywhere on the page (hidden while the trips list is on screen) */}
      {!tripsVisible && from != null ? (
        <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOutDown.duration(150)} style={[styles.cta, { bottom: insets.bottom + Space.lg }]}>
          <Pressable onPress={scrollToTrips} accessibilityRole="button" style={({ pressed }) => [styles.ctaInner, pressed && { opacity: 0.85 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[Type.bodyMedium, { color: W.textInverse }]}>
                {d.experiences.length} {d.experiences.length === 1 ? 'trip' : 'trips'} in {d.name}
              </Text>
              <Text style={[Type.caption, { color: W.textInverse, opacity: 0.8 }]}>From {formatPrice(from)} / person</Text>
            </View>
            <View style={styles.ctaPill}>
              <Text style={[Type.bodyMedium, { color: W.text }]}>View trips</Text>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
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
  // the review cards scroll edge to edge, so undo the sheet's side padding
  cta: { position: 'absolute', left: Space.screenX, right: Space.screenX },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingLeft: Space.xl,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 60,
    borderRadius: Radius.pill,
    backgroundColor: W.accentFill,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  ctaPill: { paddingHorizontal: Space.lg, paddingVertical: Space.md, borderRadius: Radius.pill, backgroundColor: W.background },
  reviewsBlock: { marginTop: Space.xxxl, marginHorizontal: -Space.screenX },
}));
