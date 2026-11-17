import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeartButton } from '@/components/wayfare/heart-button';
import { ItineraryTimeline } from '@/components/wayfare/itinerary-timeline';
import { RatingSummary, ReviewCard } from '@/components/wayfare/reviews';
import { BackButton, Chip, EmptyState, ErrorState, Icon, ICONS, LoadingState } from '@/components/wayfare/primitives';
import { RemoteImage } from '@/components/wayfare/remote-image';
import { DetailSkeleton } from '@/components/wayfare/skeleton';
import { Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';
import { formatDuration, formatPrice } from '@/features/catalog/format';
import { useExperience } from '@/hooks/use-experience';
import { useQuote } from '@/hooks/use-bookings';
import { useReviews } from '@/hooks/use-reviews';
import { defaultStatusBarStyle, useScreenStatusBar } from '@/hooks/use-screen-status-bar';

const BAR_HEIGHT = 76;
/** photo height below the status bar */
const HERO_BODY = 228;

function inclusionIcon(icon: string): keyof typeof ICONS {
  return icon in ICONS ? (icon as keyof typeof ICONS) : 'check';
}

type SectionKey = 'itinerary' | 'included' | 'reviews';
const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'itinerary', label: 'Itinerary' },
  { key: 'included', label: "What's included" },
  { key: 'reviews', label: 'Reviews' },
];

function Fact({ icon, label, accent }: { icon: keyof typeof ICONS; label: string; accent?: boolean }) {
  return (
    <View style={[styles.fact, accent && styles.factAccent]}>
      <Icon name={icon} size={14} color={accent ? W.accentStrong : W.textSecondary} />
      <Text style={[Type.micro, { color: accent ? W.accentStrong : W.text }]}>{label}</Text>
    </View>
  );
}

export default function ExperienceScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const q = useExperience(slug);
  const scrollRef = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  // section positions inside the sheet, and the sheet's own offset (below the photo)
  const sheetY = useRef(0);
  const sectionY = useRef<Partial<Record<SectionKey, number>>>({});
  // what 2 adults pay in total (incl. taxes), so the real price is visible before the booking flow
  const sample = useQuote(q.data?.id, 2, 0);
  useScreenStatusBar(q.data ? 'light' : defaultStatusBarStyle());

  // the header is pinned outside the scroll view (always below insets.top) and turns solid once the photo scrolls away
  const scrollY = useSharedValue(0);
  const headerH = useSharedValue(0);
  const heroHeight = HERO_BODY + insets.top;
  const onScroll = useAnimatedScrollHandler((ev) => {
    scrollY.value = ev.contentOffset.y;
  });
  const headerBg = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [heroHeight - headerH.value - 48, heroHeight - headerH.value], [0, 1], Extrapolation.CLAMP),
  }));

  if (q.isPending) {
    return (
      <View style={styles.screen}>
        <DetailSkeleton heroHeight={228} />
        <View style={[styles.floatingBack, { top: insets.top + Space.sm }]}>
          <BackButton />
        </View>
      </View>
    );
  }
  if (q.isError || !q.data) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={{ paddingHorizontal: Space.screenX }}>
          <BackButton />
        </View>
        {q.isError ? (
          <ErrorState height={400} onRetry={() => q.refetch()} />
        ) : (
          <EmptyState height={400} icon="search" title="Experience not found" message="It may have been removed." />
        )}
      </View>
    );
  }

  const e = q.data;
  const hasItinerary = e.itinerary_days.length > 0;
  const hasInclusions = e.inclusions.length > 0;
  const sections = SECTIONS.filter((sec) => (sec.key === 'itinerary' ? hasItinerary : sec.key === 'included' ? hasInclusions : true));
  const jump = (key: SectionKey) => {
    const y = sectionY.current[key];
    // land the heading just below the pinned top bar (its measured height, or its usual size before layout)
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, sheetY.current + y - Math.max(headerH.get(), insets.top + 64) - Space.md), animated: true });
  };
  const price = formatPrice(e.price_per_person, e.currency);

  return (
    <View style={styles.screen}>
      <Animated.ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: BAR_HEIGHT + insets.bottom + Space.xxl }}>
        <View style={[styles.hero, { height: heroHeight }]}>
          <RemoteImage uri={e.cover_image_url} label={e.title} style={StyleSheet.absoluteFill} />
          <View style={styles.tint} />
          <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']} style={styles.scrim} />
        </View>

        <View
          style={styles.sheet}
          onLayout={(ev) => {
            sheetY.current = ev.nativeEvent.layout.y;
          }}>
          <View style={styles.grabber} />

          {/* why book this: title, proof, key facts, summary and highlights, before any detail */}
          <View style={{ gap: Space.sm }}>
            <Text style={[Type.title, { color: W.text }]}>{e.title}</Text>
            {e.destination ? (
              <View style={styles.inline}>
                <Icon name="location" size={16} color={W.textSecondary} />
                <Text style={[Type.caption, { color: W.textSecondary }]}>
                  {e.destination.name}, {e.destination.country}
                </Text>
              </View>
            ) : null}
            <Pressable
              onPress={() => jump('reviews')}
              accessibilityRole="button"
              accessibilityLabel={`Rated ${e.rating ?? 'new'}, ${e.review_count} reviews. Show reviews`}
              style={styles.inline}>
              <Icon name="star" size={16} color={W.warning} />
              <Text style={[Type.bodyMedium, { color: W.text }]}>{e.rating ?? 'New'}</Text>
              <Text style={[Type.caption, styles.link]}>{e.review_count} reviews</Text>
            </Pressable>
          </View>

          <View style={styles.facts}>
            <Fact icon="calendar" label={formatDuration(e.duration_days, e.duration_nights)} />
            {e.subtitle ? <Fact icon="sparkle" label={e.subtitle} /> : null}
            <Fact icon="check" label="Free cancellation" accent />
          </View>

          {e.summary ? <Text style={[Type.body, { color: W.textSecondary }]}>{e.summary}</Text> : null}

          {e.highlights.length > 0 ? (
            <View style={styles.highlights}>
              <Text style={[Type.subheading, { color: W.text }]}>Highlights</Text>
              {e.highlights.map((h) => (
                <View key={h} style={styles.highlightRow}>
                  <View style={styles.highlightDot}>
                    <Icon name="check" size={14} color={W.accentStrong} />
                  </View>
                  <Text style={[Type.body, { color: W.text, flex: 1 }]}>{h}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* shortcuts to the sections below (one page, so nothing is hidden behind a tab) */}
          {sections.length > 1 ? (
            <View style={styles.tabs}>
              {sections.map((sec) => (
                <Chip key={sec.key} label={sec.label} active={false} onPress={() => jump(sec.key)} />
              ))}
            </View>
          ) : null}

          {hasItinerary ? (
            <View
              style={styles.section}
              onLayout={(ev) => {
                sectionY.current.itinerary = ev.nativeEvent.layout.y;
              }}>
              <Text style={[Type.heading, { color: W.text }]}>
                {e.duration_days}-Day {e.destination?.name ?? ''} Journey
              </Text>
              <ItineraryTimeline days={e.itinerary_days} />
            </View>
          ) : null}

          {hasInclusions ? (
            <View
              style={styles.section}
              onLayout={(ev) => {
                sectionY.current.included = ev.nativeEvent.layout.y;
              }}>
              <Text style={[Type.heading, { color: W.text }]}>What&apos;s included</Text>
              <View>
                {e.inclusions.map((inc) => (
                  <View key={inc.id} style={styles.inclusion}>
                    {inc.image_url ? (
                      // photo with the icon as a small badge on its corner
                      <View style={styles.inclusionMedia}>
                        <RemoteImage uri={inc.image_url} label={inc.title} style={styles.inclusionPhoto} />
                        <View style={styles.inclusionBadge}>
                          {/* accentSoft is translucent: tint over an opaque white disc so the photo doesn't show through */}
                          <View style={styles.inclusionBadgeTint} />
                          <Icon name={inclusionIcon(inc.icon)} size={16} color={W.accentStrong} />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.inclusionIcon}>
                        <Icon name={inclusionIcon(inc.icon)} size={24} color={W.accentStrong} />
                      </View>
                    )}
                    <View style={styles.flex}>
                      <Text style={[Type.subheading, { color: W.text }]}>{inc.title}</Text>
                      {inc.detail ? <Text style={[Type.caption, { color: W.textSecondary }]}>{inc.detail}</Text> : null}
                    </View>
                  </View>
                ))}
                <Text style={[Type.caption, styles.notIncluded]}>Not included: Flights, travel insurance, personal expenses</Text>
              </View>
            </View>
          ) : null}

          <View
            style={styles.section}
            onLayout={(ev) => {
              sectionY.current.reviews = ev.nativeEvent.layout.y;
            }}>
            <Text style={[Type.heading, { color: W.text }]}>Reviews</Text>
            <ExperienceReviews id={e.id} rating={e.rating} count={e.review_count} />
          </View>
        </View>
      </Animated.ScrollView>

      <View
        style={[styles.header, { paddingTop: insets.top + Space.sm }]}
        onLayout={(ev) => {
          headerH.value = ev.nativeEvent.layout.height;
        }}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.headerSolid, headerBg]} />
            <BackButton />
            <View style={styles.headerText}>
              <Text style={[Type.subheading, styles.inverse, styles.center]} numberOfLines={2}>
                {e.title}
              </Text>
              <Text style={[Type.caption, styles.inverse, styles.center]} numberOfLines={1}>
                {[`${e.duration_days} ${e.duration_days === 1 ? 'day' : 'days'}`, e.subtitle].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <HeartButton
              target={{ kind: 'experience', id: e.id }}
              label={e.title}
              preview={{
                id: `optimistic-${e.id}`, created_at: new Date().toISOString(), destination_id: null, experience_id: e.id, destination: null,
                experience: {
                  id: e.id, slug: e.slug, title: e.title, cover_image_url: e.cover_image_url, duration_days: e.duration_days,
                  duration_nights: e.duration_nights, price_per_person: e.price_per_person, currency: e.currency, rating: e.rating,
                },
              }}
            />
      </View>

      <View style={[styles.bar, { paddingBottom: insets.bottom + Space.md }]}>
        <View style={{ flexShrink: 1 }}>
          <Text style={[Type.subheading, { color: W.text }]}>{price} / person</Text>
          <Text style={[Type.caption, { color: W.textSecondary }]} numberOfLines={1}>
            {sample.data ? `${formatPrice(Math.round(sample.data.total), sample.data.currency)} for 2 · incl. taxes` : 'Taxes shown before you pay'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          // guests can pick dates and see the total first; sign-in comes when they continue to Review
          onPress={() => router.push({ pathname: '/book/[slug]', params: { slug: e.slug } })}
          style={({ pressed }) => [styles.bookButton, pressed && { opacity: 0.85 }]}>
          <Text style={[Type.bodyMedium, styles.inverse]}>Book now</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ExperienceReviews({ id, rating, count }: { id: string; rating: number | null; count: number }) {
  const q = useReviews({ kind: 'experience', id });
  return (
    <View style={{ gap: Space.md }}>
      <RatingSummary rating={rating} count={count} />
      {q.isPending ? (
        <LoadingState height={160} />
      ) : q.isError ? (
        <ErrorState height={160} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState height={140} icon="star" title="No written reviews yet" message="Reviews from travellers will show up here." />
      ) : (
        q.data.map((r) => <ReviewCard key={r.id} review={r} />)
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: W.background },
  flex: { flex: 1, gap: 2 },
  inverse: { color: W.textInverse },
  floatingBack: { position: 'absolute', left: Space.screenX - 4 },
  hero: { backgroundColor: W.dark },
  tint: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 32, 35, 0.35)' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.screenX - 4,
    paddingBottom: Space.sm,
  },
  headerSolid: { backgroundColor: W.dark },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 28 },
  link: { color: W.textSecondary, textDecorationLine: 'underline' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Space.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: W.card,
  },
  factAccent: { backgroundColor: W.accentSoft },
  highlights: { gap: Space.sm, padding: Space.lg, borderRadius: Radius.card, borderWidth: 1, borderColor: W.border },
  highlightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md },
  highlightDot: {
    width: 24,
    height: 24,
    borderRadius: Radius.pill,
    backgroundColor: W.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  section: { gap: Space.md, paddingTop: Space.md },
  headerText: { flex: 1, alignItems: 'center' },
  center: { textAlign: 'center' },
  sheet: {
    marginTop: -Space.xxl,
    backgroundColor: W.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Space.screenX,
    paddingTop: Space.md,
    gap: Space.md,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.pill, backgroundColor: W.border },
  tabs: { flexDirection: 'row', gap: Space.sm },
  inclusion: { flexDirection: 'row', alignItems: 'center', gap: Space.lg, paddingVertical: Space.md },
  inclusionMedia: { width: 96, height: 96 },
  inclusionPhoto: { width: 88, height: 88, borderRadius: Radius.card },
  inclusionBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: W.background,
    borderWidth: 2,
    borderColor: W.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inclusionBadgeTint: { ...StyleSheet.absoluteFill, backgroundColor: W.accentSoft },
  notIncluded: { color: W.textSecondary, marginTop: Space.sm },
  inclusionIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: W.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.screenX,
    paddingTop: Space.md,
    backgroundColor: W.background,
    borderTopWidth: 1,
    borderTopColor: W.border,
  },
  bookButton: {
    height: 52,
    paddingHorizontal: Space.xxl,
    borderRadius: Radius.pill,
    backgroundColor: W.accentFill,
    justifyContent: 'center',
  },
}));
