import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DestinationCard, ExperienceCard } from '@/components/wayfare/cards';
import { CoachTarget, useCoachMarks } from '@/components/wayfare/coach-marks';
import { Chip, EmptyState, ErrorState, Icon, SectionHeader } from '@/components/wayfare/primitives';
import { Bone, CarouselSkeleton, ExperienceRowSkeleton, HomeSkeleton } from '@/components/wayfare/skeleton';
import { UserAvatar } from '@/components/wayfare/user-avatar';
import { BottomTabInset } from '@/constants/theme';
import { CONTINENT_LABELS, Radius, Space, Type, W } from '@/constants/wayfare';
import { formatPrice } from '@/features/catalog/format';
import { useNotifications } from '@/hooks/use-notifications';
import { useAvatarUrl } from '@/hooks/use-profile';
import { useDestinations } from '@/hooks/use-destinations';
import { pricePerDay, useExperienceSections, type CatalogExperience, type SectionKey } from '@/hooks/use-experience-sections';
import { firstNameFor } from '@/lib/names';
import { useAuth } from '@/providers/auth-provider';
import type { Enums } from '@/types/database';

type Continent = Enums<'continent'>;
const CONTINENTS = Object.keys(CONTINENT_LABELS) as Continent[];

/** The pill on a card's photo says why it is in this section. */
function sectionBadge(key: SectionKey, e: CatalogExperience) {
  if (key === 'popular') return { label: 'Popular', tone: 'dark' as const };
  // per-day figure is a comparison aid, so whole dollars read better than cents
  if (key === 'value') return { label: `${formatPrice(Math.round(pricePerDay(e)), e.currency)} / day`, tone: 'accent' as const };
  return undefined;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, session, user } = useAuth();
  const avatarUrl = useAvatarUrl(profile?.avatar_url);
  const [continent, setContinent] = useState<Continent | undefined>(undefined);
  const destinations = useDestinations(continent);
  const sections = useExperienceSections();
  const notifications = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const coach = useCoachMarks();

  const hasCards = !!destinations.data?.length;
  // first-run tips once the carousel is on screen (no-op after they've been seen)
  useFocusEffect(
    useCallback(() => {
      if (hasCards) coach.start();
    }, [hasCards, coach]),
  );

  // first load of the whole screen → full skeleton
  if (destinations.isPending && sections.isPending && !continent) return <HomeSkeleton />;

  const firstName = session ? firstNameFor(profile?.full_name, user) : null;
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([destinations.refetch(), sections.refetch()]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={W.accentStrong} />}
      contentContainerStyle={{ paddingTop: insets.top + Space.sm, paddingBottom: insets.bottom + BottomTabInset + Space.xxl }}>
      <View style={styles.padded}>
        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[Type.display, { color: W.text }]} numberOfLines={1}>
              Hello, {firstName ?? 'traveler'}
            </Text>
            <Text style={[Type.bodyMedium, { color: W.textSecondary }]}>Where would you like to go next?</Text>
          </View>
          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={notifications.unread.size ? `Notifications, ${notifications.unread.size} unread` : 'Notifications'}
            style={styles.bell}>
            <Icon name="bell" size={22} />
            {notifications.unread.size ? <View style={styles.bellDot} /> : null}
          </Pressable>
          <Pressable
            onPress={() => router.push(session ? '/more' : { pathname: '/sign-in', params: { returnTo: '/' } })}
            accessibilityRole="button"
            accessibilityLabel={session ? 'Your profile' : 'Sign in'}
            style={styles.avatarHit}>
            <UserAvatar uri={avatarUrl} name={firstName} />
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <CoachTarget id="search" style={styles.searchWrap}>
            <Pressable
              onPress={() => router.push('/search')}
              accessibilityRole="search"
              style={({ pressed }) => [styles.search, pressed && { opacity: 0.8 }]}>
              <Icon name="search" color={W.textSecondary} />
              <Text style={[Type.bodyMedium, { color: W.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
                Search destinations or experiences
              </Text>
            </Pressable>
          </CoachTarget>
          <Pressable
            onPress={() => router.push({ pathname: '/search', params: { filters: '1' } })}
            accessibilityRole="button"
            accessibilityLabel="Filters"
            style={({ pressed }) => [styles.filterButton, pressed && { opacity: 0.85 }]}>
            <Icon name="filter" color={W.textInverse} />
          </Pressable>
        </View>

        <Text style={[Type.heading, styles.sectionTitle]}>Select your next trip</Text>
      </View>

      <CoachTarget id="continents">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="All" active={!continent} onPress={() => setContinent(undefined)} />
          {CONTINENTS.map((c) => (
            <Chip key={c} label={CONTINENT_LABELS[c]} active={continent === c} onPress={() => setContinent(c)} />
          ))}
        </ScrollView>
      </CoachTarget>

      {destinations.isPending ? (
        <CarouselSkeleton />
      ) : destinations.isError ? (
        <ErrorState height={368} onRetry={() => destinations.refetch()} />
      ) : destinations.data.length === 0 ? (
        <EmptyState
          height={368}
          icon="location"
          title={`No ${continent ? CONTINENT_LABELS[continent] : ''} trips yet`}
          message="We're adding new destinations soon. Try another continent."
        />
      ) : (
        <FlatList
          horizontal
          data={destinations.data}
          keyExtractor={(d) => d.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          renderItem={({ item, index }) => {
            const card = (
              <DestinationCard
                id={item.id}
                slug={item.slug}
                name={item.name}
                country={item.country}
                heroImageUrl={item.hero_image_url}
                rating={item.rating}
                reviewCount={item.review_count}
              />
            );
            return index === 0 ? <CoachTarget id="card">{card}</CoachTarget> : card;
          }}
        />
      )}

      {sections.isPending ? (
        <View style={styles.sectionsLoading}>
          {[0, 1].map((i) => (
            <View key={i} style={styles.sectionBlock}>
              <View style={styles.padded}>
                <Bone w={160} h={22} />
                <Bone w={200} h={14} style={{ marginTop: Space.xs }} />
              </View>
              <ExperienceRowSkeleton />
            </View>
          ))}
        </View>
      ) : sections.isError ? (
        <View style={styles.sectionBlock}>
          <ErrorState onRetry={() => sections.refetch()} />
        </View>
      ) : (
        sections.data.map((section) => (
          <View key={section.key} style={styles.sectionBlock}>
            <View style={styles.padded}>
              <SectionHeader
                title={section.title}
                action="See all"
                onAction={() => router.push({ pathname: '/search', params: { sort: section.key } })}
              />
              <Text style={[Type.caption, styles.sectionSubtitle]}>{section.subtitle}</Text>
            </View>
            <FlatList
              horizontal
              data={section.items}
              keyExtractor={(e) => e.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
              renderItem={({ item }) => (
                <ExperienceCard
                  width={280}
                  id={item.id}
                  slug={item.slug}
                  title={item.title}
                  place={item.destination ? `${item.destination.name}, ${item.destination.country}` : undefined}
                  badge={sectionBadge(section.key, item)}
                  durationDays={item.duration_days}
                  durationNights={item.duration_nights}
                  pricePerPerson={item.price_per_person}
                  currency={item.currency}
                  coverImageUrl={item.cover_image_url}
                  rating={item.rating}
                  reviewCount={item.review_count}
                />
              )}
            />
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: W.background },
  padded: { paddingHorizontal: Space.screenX, gap: 4 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  avatarHit: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  bell: { width: 44, height: 44, borderRadius: Radius.pill, backgroundColor: W.card, alignItems: 'center', justifyContent: 'center' },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 9,
    height: 9,
    borderRadius: Radius.pill,
    backgroundColor: W.heart,
    borderWidth: 1.5,
    borderColor: W.card,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, marginTop: Space.xl },
  searchWrap: { flex: 1 },
  filterButton: { width: 48, height: 48, borderRadius: Radius.pill, backgroundColor: W.dark, alignItems: 'center', justifyContent: 'center' },
  search: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.pill,
    backgroundColor: W.card,
  },
  sectionTitle: { color: W.text, marginTop: Space.xxl },
  chips: { paddingHorizontal: Space.screenX, gap: Space.sm, paddingVertical: Space.sm },
  carousel: { paddingHorizontal: Space.screenX, gap: Space.lg },
  sectionsLoading: { gap: 0 },
  sectionBlock: { marginTop: Space.xxl, gap: Space.md },
  sectionSubtitle: { color: W.textSecondary, marginTop: -2 },
});
