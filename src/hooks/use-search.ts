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
};

/** Duration buckets used by the Filters sheet: 1–2, 3–4 and 5+ days. */
export const DURATION_RANGES: Record<DurationBucket, { label: string; min: number; max?: number }> = {
  short: { label: '1–2 days', min: 1, max: 2 },
  mid: { label: '3–4 days', min: 3, max: 4 },
  long: { label: '5+ days', min: 5 },
};

/** Filters that only apply to experiences (destinations have no price or length). */
export const hasExperienceOnlyFilters = (f: SearchFilters) => f.minPrice != null || f.maxPrice != null || !!f.duration;

// PostgREST `or=` filters use , ( ) as syntax and % * as wildcards — strip them from user input.
const sanitize = (q: string) => q.replace(/[%*,()\\"]/g, ' ').replace(/\s+/g, ' ').trim();

/** Search destinations (name/country) and experiences (title) with ilike, debounced 300ms. */
export function useSearch(query: string, filters: SearchFilters) {
  const debounced = useDebouncedValue(sanitize(query), 300);
  const hasFilters = !!(filters.continent || filters.minRating) || hasExperienceOnlyFilters(filters);
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

      let eq = supabase
        .from('experiences')
        .select(`${EXPERIENCE_CARD_FIELDS}, destination:destinations!inner(name, country, continent)`)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(30);
      if (debounced) eq = eq.ilike('title', like);
      if (filters.continent) eq = eq.eq('destination.continent', filters.continent);
      if (filters.minRating) eq = eq.gte('rating', filters.minRating);
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
      return { destinations: d.data ?? [], experiences: e.data ?? [] };
    },
  });

  return { ...result, enabled, isDebouncing: sanitize(query) !== debounced };
}
