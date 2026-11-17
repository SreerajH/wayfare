import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { EXPERIENCE_CARD_FIELDS } from '@/hooks/use-experience-sections';
import { supabase } from '@/lib/supabase';
import type { Enums } from '@/types/database';

export type DurationBucket = 'short' | 'mid' | 'long';

export type SearchFilters = {
  continent?: Enums<'continent'>;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  duration?: DurationBucket;
  /** only trips flagged as trending right now */
  trending?: boolean;
  /** at least this many reviews */
  minReviews?: number;
  /** how results are ordered (default: best rated first) */
  order?: SortOrder;
};

export type SortOrder = 'rating' | 'price_asc' | 'price_desc' | 'reviews' | 'shortest';

export const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'rating', label: 'Top rated' },
  { value: 'reviews', label: 'Most reviewed' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'shortest', label: 'Shortest first' },
];

type Sortable = {
  price_per_person: number;
  rating: number | null;
  review_count: number;
  duration_days: number;
};

/** Order experiences for the Filters sheet's "Sort by" (stable: ties keep the incoming order). */
export function sortExperiences<T extends Sortable>(list: readonly T[], order: SortOrder | undefined): T[] {
  if (!order || order === 'rating') return [...list];
  const by: Record<Exclude<SortOrder, 'rating'>, (a: T, b: T) => number> = {
    reviews: (a, b) => b.review_count - a.review_count,
    price_asc: (a, b) => a.price_per_person - b.price_per_person,
    price_desc: (a, b) => b.price_per_person - a.price_per_person,
    shortest: (a, b) => a.duration_days - b.duration_days || a.price_per_person - b.price_per_person,
  };
  return [...list].sort(by[order]);
}

/** Duration buckets used by the Filters sheet: 1–2, 3–4 and 5+ days. */
export const DURATION_RANGES: Record<DurationBucket, { label: string; min: number; max?: number }> = {
  short: { label: '1–2 days', min: 1, max: 2 },
  mid: { label: '3–4 days', min: 3, max: 4 },
  long: { label: '5+ days', min: 5 },
};

/** Filters that only apply to experiences (destinations have no price or length). */
export const hasExperienceOnlyFilters = (f: SearchFilters) => f.minPrice != null || f.maxPrice != null || !!f.duration;

// PostgREST `or=` filters use , ( ) as syntax and % * as wildcards — strip them from user input.
const sanitize = (q: string) =>
  q
    .replace(/[%*,()\\"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Search destinations (name/country) and experiences (title) with ilike, debounced 300ms. */
export function useSearch(query: string, filters: SearchFilters) {
  const debounced = useDebouncedValue(sanitize(query), 300);
  const hasFilters =
    !!(filters.continent || filters.minRating || filters.trending || filters.minReviews || filters.order) ||
    hasExperienceOnlyFilters(filters);
  const enabled = debounced.length >= 2 || hasFilters;

  const result = useQuery({
    queryKey: ['search', debounced, filters],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const like = `%${debounced}%`;

      let dq = supabase
        .from('destinations')
        .select('id, slug, name, country, continent, hero_image_url, rating, review_count')
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(20);
      if (debounced) dq = dq.or(`name.ilike.${like},country.ilike.${like}`);
      if (filters.continent) dq = dq.eq('continent', filters.continent);
      if (filters.minRating) dq = dq.gte('rating', filters.minRating);
      if (filters.trending) dq = dq.eq('is_trending', true);
      if (filters.minReviews) dq = dq.gte('review_count', filters.minReviews);

      let eq = supabase
        .from('experiences')
        .select(`${EXPERIENCE_CARD_FIELDS}, destination:destinations!inner(name, country, continent)`)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(30);
      if (debounced) eq = eq.ilike('title', like);
      if (filters.continent) eq = eq.eq('destination.continent', filters.continent);
      if (filters.minRating) eq = eq.gte('rating', filters.minRating);
      if (filters.trending) eq = eq.eq('is_trending', true);
      if (filters.minReviews) eq = eq.gte('review_count', filters.minReviews);
      if (filters.minPrice != null) eq = eq.gte('price_per_person', filters.minPrice);
      if (filters.maxPrice != null) eq = eq.lte('price_per_person', filters.maxPrice);
      if (filters.duration) {
        const r = DURATION_RANGES[filters.duration];
        eq = eq.gte('duration_days', r.min);
        if (r.max) eq = eq.lte('duration_days', r.max);
      }

      // price and length only apply to experiences, so hide destinations while they're set
      const [d, e] = await Promise.all([hasExperienceOnlyFilters(filters) ? Promise.resolve({ data: [], error: null }) : dq, eq]);
      if (d.error) throw d.error;
      if (e.error) throw e.error;
      return {
        destinations: d.data ?? [],
        experiences: sortExperiences(e.data ?? [], filters.order),
      };
    },
  });

  return { ...result, enabled, isDebouncing: sanitize(query) !== debounced };
}
