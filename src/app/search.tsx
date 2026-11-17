import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExperienceCard } from '@/components/wayfare/cards';
import { activeFilterCount, FiltersSheet } from '@/components/wayfare/filters-sheet';
import { BackButton, Chip, EmptyState, ErrorState, Icon, RatingBadge, SectionHeader } from '@/components/wayfare/primitives';
import { RemoteImage } from '@/components/wayfare/remote-image';
import { ListSkeleton } from '@/components/wayfare/skeleton';
import { CONTINENT_LABELS, Font, Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';
import { useDestinationList } from '@/hooks/use-destinations';
import { isSectionKey, rankExperiences, SECTION_META, useRankedExperiences, type SectionKey } from '@/hooks/use-experience-sections';
import { DURATION_RANGES, SORT_OPTIONS, sortExperiences, useSearch, type SearchFilters } from '@/hooks/use-search';
import { formatPrice } from '@/features/catalog/format';
import type { Enums } from '@/types/database';

type Continent = Enums<'continent'>;
const CONTINENTS = Object.keys(CONTINENT_LABELS) as Continent[];

type DestinationRowData = {
  id: string;
  slug: string;
  name: string;
  country: string;
  continent: Continent;
  hero_image_url: string | null;
  rating: number | null;
  experienceCount?: number;
};

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  // Home's "See all" opens /search?sort=popular|value|rating|short|day
  const params = useLocalSearchParams<{ sort?: string; filters?: string }>();
  // Home's filter button opens /search?filters=1 with the sheet already up
  const [sheetOpen, setSheetOpen] = useState(params.filters === '1');
  const [sort, setSort] = useState<SectionKey | undefined>(isSectionKey(params.sort) ? params.sort : undefined);
  const ranked = useRankedExperiences(sort);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const search = useSearch(query, filters);
  const all = useDestinationList();

  // with a sort active, search results follow the same ranking (and its filters, e.g. day trips only)
  // an explicit "Sort by" from the Filters sheet wins over the section's ranking
  const experiences = search.data
    ? filters.order
      ? sortExperiences(search.data.experiences, filters.order)
      : sort
        ? rankExperiences(search.data.experiences, sort)
        : search.data.experiences
    : [];

  const toggle = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: f[key] === value ? undefined : value }));

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Space.sm }]}>
      <View style={styles.searchRow}>
        <BackButton />
        <View style={styles.searchBox}>
          <Icon name="search" color={W.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus={params.filters !== '1'}
            placeholder="Search destinations or experiences"
            placeholderTextColor={W.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search"
            style={styles.searchInput}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search" hitSlop={10}>
              <Icon name="close" color={W.textSecondary} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={activeFilterCount(filters) ? `Filters, ${activeFilterCount(filters)} applied` : 'Filters'}
          style={styles.filterButton}>
          <Icon name="filter" color={W.textInverse} />
          {activeFilterCount(filters) ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount(filters)}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flexGrow: 0, flexShrink: 0 }}>
        {sort ? <Chip label={`${SECTION_META[sort].title}  ✕`} active onPress={() => setSort(undefined)} /> : null}
        {CONTINENTS.map((c) => (
          <Chip key={c} label={CONTINENT_LABELS[c]} active={filters.continent === c} onPress={() => toggle('continent', c)} />
        ))}
      </ScrollView>

      {appliedChips(filters).length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.applied} style={{ flexGrow: 0, flexShrink: 0 }}>
          {appliedChips(filters).map((c) => (
            <Pressable
              key={c.key}
              onPress={() => setFilters((f) => c.clear(f))}
              accessibilityRole="button"
              accessibilityLabel={`Remove filter ${c.label}`}
              style={styles.appliedChip}>
              <Text style={[Type.micro, { color: W.accentStrong }]}>{c.label}</Text>
              <Icon name="close" size={14} color={W.accentStrong} />
            </Pressable>
          ))}
          <Pressable onPress={() => setFilters({})} accessibilityRole="button" style={styles.clearAll}>
            <Text style={[Type.micro, { color: W.textSecondary, textDecorationLine: 'underline' }]}>Clear all</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Space.xxxl }]} keyboardShouldPersistTaps="handled">
        {!search.enabled && sort ? (
          // "See all" from Home → the full ranked list
          ranked.isPending ? (
            <ListSkeleton />
          ) : ranked.isError ? (
            <ErrorState onRetry={() => ranked.refetch()} />
          ) : (
            <View style={{ gap: Space.lg }}>
              <View>
                <SectionHeader title={SECTION_META[sort].title} />
                <Text style={[Type.caption, { color: W.textSecondary }]}>{SECTION_META[sort].subtitle}</Text>
              </View>
              {ranked.data.length === 0 ? (
                <EmptyState icon="search" title="Nothing here yet" message="New experiences are on the way." />
              ) : (
                ranked.data.map((e) => (
                  <ExperienceCard
                    key={e.id}
                    id={e.id}
                    slug={e.slug}
                    title={e.title}
                    place={e.destination ? `${e.destination.name}, ${e.destination.country}` : undefined}
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
          )
        ) : !search.enabled ? (
          // no query yet → browse everything
          all.isPending ? (
            <ListSkeleton />
          ) : all.isError ? (
            <ErrorState onRetry={() => all.refetch()} />
          ) : (
            <>
              <SectionHeader title="All destinations" />
              {all.data.map((d) => (
                <DestinationRow key={d.id} d={d} />
              ))}
            </>
          )
        ) : search.isPending || (search.isDebouncing && !search.data) ? (
          <ListSkeleton />
        ) : search.isError ? (
          <ErrorState onRetry={() => search.refetch()} />
        ) : search.data && search.data.destinations.length + experiences.length === 0 ? (
          <EmptyState icon="search" title="No matches" message="Try another name, or clear a filter." height={300} />
        ) : search.data ? (
          <View style={{ gap: Space.xxl, opacity: search.isFetching ? 0.6 : 1 }}>
            {search.data.destinations.length > 0 ? (
              <View style={{ gap: Space.sm }}>
                <SectionHeader title={`Destinations · ${search.data.destinations.length}`} />
                {search.data.destinations.map((d) => (
                  <DestinationRow key={d.id} d={d} />
                ))}
              </View>
            ) : null}
            {experiences.length > 0 ? (
              <View style={{ gap: Space.lg }}>
                <SectionHeader title={`Experiences · ${experiences.length}`} />
                <FlatList
                  scrollEnabled={false}
                  data={experiences}
                  keyExtractor={(e) => e.id}
                  contentContainerStyle={{ gap: Space.lg }}
                  renderItem={({ item: e }) => (
                    <ExperienceCard
                      id={e.id}
                      slug={e.slug}
                      title={e.title}
                      place={e.destination ? `${e.destination.name}, ${e.destination.country}` : undefined}
                      durationDays={e.duration_days}
                      durationNights={e.duration_nights}
                      pricePerPerson={e.price_per_person}
                      currency={e.currency}
                      coverImageUrl={e.cover_image_url}
                      rating={e.rating}
                      reviewCount={e.review_count}
                    />
                  )}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <FiltersSheet
        visible={sheetOpen}
        value={filters}
        query={query}
        onClose={() => setSheetOpen(false)}
        onApply={(f) => {
          setFilters(f);
          setSheetOpen(false);
        }}
      />
    </View>
  );
}

/** Sheet-only filters shown as one-tap removable chips (region already has its own chip row). */
function appliedChips(f: SearchFilters) {
  const chips: { key: string; label: string; clear: (f: SearchFilters) => SearchFilters }[] = [];
  if (f.order) chips.push({ key: 'order', label: SORT_OPTIONS.find((o) => o.value === f.order)?.label ?? 'Sorted', clear: (x) => ({ ...x, order: undefined }) });
  if (f.minPrice != null || f.maxPrice != null) {
    const label = `${formatPrice(f.minPrice ?? 0)} – ${f.maxPrice != null ? formatPrice(f.maxPrice) : 'any'}`;
    chips.push({ key: 'price', label, clear: (x) => ({ ...x, minPrice: undefined, maxPrice: undefined }) });
  }
  if (f.duration) chips.push({ key: 'duration', label: DURATION_RANGES[f.duration].label, clear: (x) => ({ ...x, duration: undefined }) });
  if (f.minRating) chips.push({ key: 'rating', label: `${f.minRating}+ stars`, clear: (x) => ({ ...x, minRating: undefined }) });
  if (f.minReviews) chips.push({ key: 'reviews', label: `${f.minReviews}+ reviews`, clear: (x) => ({ ...x, minReviews: undefined }) });
  if (f.trending) chips.push({ key: 'trending', label: 'Trending', clear: (x) => ({ ...x, trending: undefined }) });
  return chips;
}

function DestinationRow({ d }: { d: DestinationRowData }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/destination/[slug]',
          params: { slug: d.slug },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={`${d.name}, ${d.country}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <RemoteImage uri={d.hero_image_url} label={d.name} style={styles.thumb} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[Type.subheading, { color: W.text }]}>{d.name}</Text>
        <Text style={[Type.caption, { color: W.textSecondary }]}>
          {d.country} · {CONTINENT_LABELS[d.continent]}
        </Text>
        <View style={styles.meta}>
          <RatingBadge rating={d.rating} />
          {d.experienceCount !== undefined ? (
            <Text style={[Type.micro, { color: W.textSecondary }]}>
              {d.experienceCount} {d.experienceCount === 1 ? 'experience' : 'experiences'}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: W.background },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.screenX - 4,
  },
  searchBox: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.pill,
    backgroundColor: W.card,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: W.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: Radius.pill,
    backgroundColor: W.accentFill,
    borderWidth: 2,
    borderColor: W.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // fixed line box = badge's inner height so the digit sits dead centre (Android adds font padding otherwise)
  filterBadgeText: {
    fontFamily: Font.medium,
    fontSize: 11,
    lineHeight: 18,
    height: 18,
    color: W.textInverse,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  searchInput: {
    flex: 1,
    fontFamily: Font.regular,
    fontSize: 15,
    color: W.text,
    height: '100%',
  },
  chips: {
    paddingHorizontal: Space.screenX,
    gap: Space.sm,
    paddingVertical: Space.sm,
  },
  // a clear gap below the region chips so the two rows don't read as one cluster
  applied: { paddingHorizontal: Space.screenX, gap: Space.sm, paddingTop: Space.sm, paddingBottom: Space.md, alignItems: 'center' },
  appliedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: Space.md,
    borderRadius: Radius.pill,
    backgroundColor: W.accentSoft,
  },
  clearAll: { minHeight: 32, justifyContent: 'center', paddingHorizontal: Space.xs },
  body: {
    paddingHorizontal: Space.screenX,
    paddingTop: Space.md,
    gap: Space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.lg,
    paddingVertical: Space.sm,
  },
  thumb: { width: 72, height: 72, borderRadius: Radius.card },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
}));
