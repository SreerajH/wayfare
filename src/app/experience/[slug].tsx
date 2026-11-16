import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeartButton } from '@/components/wayfare/heart-button';
import { ItineraryTimeline } from '@/components/wayfare/itinerary-timeline';
import { BackButton, Chip, EmptyState, ErrorState, Icon, ICONS } from '@/components/wayfare/primitives';
import { RemoteImage } from '@/components/wayfare/remote-image';
import { DetailSkeleton } from '@/components/wayfare/skeleton';
import { Radius, Space, Type, W } from '@/constants/wayfare';
import { formatDuration, formatPrice } from '@/features/catalog/format';
import { useExperience } from '@/hooks/use-experience';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useScreenStatusBar } from '@/hooks/use-screen-status-bar';

const BAR_HEIGHT = 76;
/** photo height below the status bar */
const HERO_BODY = 228;

function inclusionIcon(icon: string): keyof typeof ICONS {
  return icon in ICONS ? (icon as keyof typeof ICONS) : 'check';
}

export default function ExperienceScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const q = useExperience(slug);
  const [tab, setTab] = useState<'itinerary' | 'included'>('itinerary');
  useScreenStatusBar(q.data ? 'light' : 'dark');

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
  const price = formatPrice(e.price_per_person, e.currency);
  const bookPath = `/book/${e.slug}`;

  return (
    <View style={styles.screen}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: BAR_HEIGHT + insets.bottom + Space.xxl }}>
        <View style={[styles.hero, { height: heroHeight }]}>
          <RemoteImage uri={e.cover_image_url} label={e.title} style={StyleSheet.absoluteFill} />
          <View style={styles.tint} />
          <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']} style={styles.scrim} />
        </View>

        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.tabs}>
            <Chip label="Itinerary" active={tab === 'itinerary'} onPress={() => setTab('itinerary')} />
            <Chip label="What's included" active={tab === 'included'} onPress={() => setTab('included')} />
          </View>
          {tab === 'itinerary' ? (
            <>
              <Text style={[Type.heading, { color: W.text }]}>
                {e.duration_days}-Day {e.destination?.name ?? ''} Journey
              </Text>
              <Text style={[Type.caption, { color: W.textSecondary }]}>{formatDuration(e.duration_days, e.duration_nights)}</Text>
              {e.itinerary_days.length === 0 ? (
                <EmptyState height={140} title="Itinerary coming soon" message="Day-by-day plans are being finalised." />
              ) : (
                <ItineraryTimeline days={e.itinerary_days} />
              )}
            </>
          ) : (
            <>
              <Text style={[Type.heading, { color: W.text }]}>What&apos;s included</Text>
              {e.inclusions.length === 0 ? (
                <EmptyState height={140} title="Details coming soon" message="Inclusions are being finalised." />
              ) : (
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
              )}
            </>
          )}
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
        <View>
          <Text style={[Type.caption, { color: W.textSecondary }]}>from</Text>
          <Text style={[Type.subheading, { color: W.text }]}>{price} / person</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (requireAuth(bookPath)) router.push({ pathname: '/book/[slug]', params: { slug: e.slug } });
          }}
          style={({ pressed }) => [styles.bookButton, pressed && { opacity: 0.85 }]}>
          <Text style={[Type.bodyMedium, styles.inverse]}>Book now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: W.accentStrong,
    justifyContent: 'center',
  },
});
