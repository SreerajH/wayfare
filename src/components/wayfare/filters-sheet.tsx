import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/wayfare/controls';
import { Chip } from '@/components/wayfare/primitives';
import { RangeSlider } from '@/components/wayfare/range-slider';
import { CONTINENT_LABELS, Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';
import { formatPrice } from '@/features/catalog/format';
import { useCatalog, type CatalogExperience } from '@/hooks/use-experience-sections';
import { DURATION_RANGES, SORT_OPTIONS, type DurationBucket, type SearchFilters, type SortOrder } from '@/hooks/use-search';
import type { Enums } from '@/types/database';

type Continent = Enums<'continent'>;
const CONTINENTS = Object.keys(CONTINENT_LABELS) as Continent[];

export const PRICE_MIN = 0;
export const PRICE_MAX = 1500;
const PRICE_STEP = 50;
const RATINGS: { label: string; value?: number }[] = [
  { label: 'Any' },
  { label: '4.0+', value: 4 },
  { label: '4.5+', value: 4.5 },
  { label: '4.8+', value: 4.8 },
];
const REVIEWS: { label: string; value?: number }[] = [
  { label: 'Any' },
  { label: '150+ reviews', value: 150 },
  { label: '250+ reviews', value: 250 },
];

/** How many of the Filters sheet's own fields are set (for the badge on the filter button). */
export function activeFilterCount(f: SearchFilters) {
  return [f.minPrice != null || f.maxPrice != null, f.duration, f.minRating, f.trending, f.minReviews, f.order, f.continent].filter(Boolean)
    .length;
}

function matches(e: CatalogExperience, f: SearchFilters, query: string) {
  const q = query.trim().toLowerCase();
  if (q.length >= 2 && !e.title.toLowerCase().includes(q)) return false;
  if (f.continent && e.destination?.continent !== f.continent) return false;
  if (f.minRating && (e.rating ?? 0) < f.minRating) return false;
  if (f.trending && !e.is_trending) return false;
  if (f.minReviews && e.review_count < f.minReviews) return false;
  if (f.minPrice != null && e.price_per_person < f.minPrice) return false;
  if (f.maxPrice != null && e.price_per_person > f.maxPrice) return false;
  if (f.duration) {
    const r = DURATION_RANGES[f.duration];
    if (e.duration_days < r.min || (r.max != null && e.duration_days > r.max)) return false;
  }
  return true;
}

/** Figma "Wayfare / Filters" (A5): sort, region, price, duration, rating, popularity, and a live "Apply · N results". */
export function FiltersSheet({
  visible,
  value,
  query,
  onApply,
  onClose,
}: {
  visible: boolean;
  value: SearchFilters;
  query: string;
  onApply: (f: SearchFilters) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      {/* remounts on open, so the draft always starts from the applied filters */}
      {visible ? <Sheet value={value} query={query} onApply={onApply} onClose={onClose} /> : null}
    </Modal>
  );
}

function Sheet({
  value,
  query,
  onApply,
  onClose,
}: {
  value: SearchFilters;
  query: string;
  onApply: (f: SearchFilters) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const catalog = useCatalog();
  const [price, setPrice] = useState<[number, number]>([value.minPrice ?? PRICE_MIN, value.maxPrice ?? PRICE_MAX]);
  const [duration, setDuration] = useState<DurationBucket | undefined>(value.duration);
  const [minRating, setMinRating] = useState<number | undefined>(value.minRating);
  const [order, setOrder] = useState<SortOrder | undefined>(value.order);
  const [continent, setContinent] = useState<Continent | undefined>(value.continent);
  const [trending, setTrending] = useState(!!value.trending);
  const [minReviews, setMinReviews] = useState<number | undefined>(value.minReviews);

  const draft: SearchFilters = {
    continent,
    minRating,
    order,
    trending: trending || undefined,
    minReviews,
    duration,
    minPrice: price[0] > PRICE_MIN ? price[0] : undefined,
    maxPrice: price[1] < PRICE_MAX ? price[1] : undefined,
  };
  const count = catalog.data?.filter((e) => matches(e, draft, query)).length;
  const fmt = (n: number) => formatPrice(n);
  const priceLabel = `${fmt(price[0])} – ${fmt(price[1])}${price[1] >= PRICE_MAX ? '+' : ''}`;
  const reset = () => {
    setPrice([PRICE_MIN, PRICE_MAX]);
    setDuration(undefined);
    setMinRating(undefined);
    setOrder(undefined);
    setContinent(undefined);
    setTrending(false);
    setMinReviews(undefined);
  };

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close filters" />
      </Animated.View>
      <Animated.View entering={SlideInDown.duration(280)} style={[styles.sheet, { paddingBottom: insets.bottom + Space.xxl }]}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Text style={[Type.heading, { color: W.text }]}>Filters</Text>
          <Pressable onPress={reset} accessibilityRole="button" hitSlop={8} style={styles.link}>
            <Text style={[Type.bodyMedium, { color: W.accentStrong }]}>Reset</Text>
          </Pressable>
        </View>

        <ScrollView bounces={false} style={styles.scroll} contentContainerStyle={styles.groups}>
          <View style={styles.group}>
            <Text style={[Type.subheading, { color: W.text }]}>Sort by</Text>
            <View style={styles.chips}>
              {SORT_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  label={o.label}
                  active={(order ?? 'rating') === o.value}
                  onPress={() => setOrder(o.value === 'rating' ? undefined : o.value)}
                />
              ))}
            </View>
          </View>

          <View style={styles.group}>
            <Text style={[Type.subheading, { color: W.text }]}>Region</Text>
            <View style={styles.chips}>
              <Chip label="Anywhere" active={!continent} onPress={() => setContinent(undefined)} />
              {CONTINENTS.map((c) => (
                <Chip
                  key={c}
                  label={CONTINENT_LABELS[c]}
                  active={continent === c}
                  onPress={() => setContinent(continent === c ? undefined : c)}
                />
              ))}
            </View>
          </View>

          <View style={styles.group}>
            <View style={styles.labelRow}>
              <Text style={[Type.subheading, { color: W.text }]}>Price range</Text>
              <Text style={[Type.bodyMedium, { color: W.textSecondary }]}>{priceLabel}</Text>
            </View>
            <Text style={[Type.caption, { color: W.textSecondary }]}>Per person, before tax</Text>
            <RangeSlider min={PRICE_MIN} max={PRICE_MAX} step={PRICE_STEP} value={price} onChange={setPrice} format={fmt} />
          </View>

          <View style={styles.group}>
            <Text style={[Type.subheading, { color: W.text }]}>Duration</Text>
            <View style={styles.chips}>
              {(Object.keys(DURATION_RANGES) as DurationBucket[]).map((k) => (
                <Chip
                  key={k}
                  label={DURATION_RANGES[k].label}
                  active={duration === k}
                  onPress={() => setDuration(duration === k ? undefined : k)}
                />
              ))}
            </View>
          </View>

          <View style={styles.group}>
            <Text style={[Type.subheading, { color: W.text }]}>Rating</Text>
            <View style={styles.chips}>
              {RATINGS.map((r) => (
                <Chip key={r.label} label={r.label} active={minRating === r.value} onPress={() => setMinRating(r.value)} />
              ))}
            </View>
          </View>

          <View style={styles.group}>
            <Text style={[Type.subheading, { color: W.text }]}>Popularity</Text>
            <View style={styles.chips}>
              {REVIEWS.map((r) => (
                <Chip key={r.label} label={r.label} active={minReviews === r.value} onPress={() => setMinReviews(r.value)} />
              ))}
            </View>
          </View>

          <Pressable
            onPress={() => setTrending((t) => !t)}
            accessibilityRole="switch"
            accessibilityState={{ checked: trending }}
            style={styles.toggleRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[Type.subheading, { color: W.text }]}>Trending now</Text>
              <Text style={[Type.caption, { color: W.textSecondary }]}>Trips travellers are booking this month</Text>
            </View>
            <View style={[styles.switchTrack, trending && styles.switchTrackOn]}>
              <View style={[styles.switchKnob, trending && styles.switchKnobOn]} />
            </View>
          </Pressable>
        </ScrollView>

        <Button
          label={
            count == null ? 'Apply' : count === 0 ? 'No matches — adjust filters' : `Apply · ${count} ${count === 1 ? 'result' : 'results'}`
          }
          disabled={count === 0}
          onPress={() => onApply(draft)}
          fill
        />
      </Animated.View>
    </View>
  );
}

const styles = themedStyles(() => ({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { flex: 1, backgroundColor: W.scrim },
  sheet: {
    maxHeight: '88%',
    backgroundColor: W.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Space.screenX,
    paddingTop: Space.md,
    gap: Space.xl,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: W.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  link: { minHeight: 44, justifyContent: 'center' },
  // size to content, shrink (and scroll) only when the sheet hits its max height
  scroll: { flexGrow: 0, flexShrink: 1 },
  groups: { gap: Space.xxl },
  group: { gap: Space.sm },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.lg,
    minHeight: 48,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: W.border,
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackOn: { backgroundColor: W.accentFill },
  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    backgroundColor: '#FFFFFF',
  },
  switchKnobOn: { alignSelf: 'flex-end' },
}));
