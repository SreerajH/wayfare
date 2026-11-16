import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { EXPERIENCE_CARD_FIELDS } from '@/hooks/use-trending-experiences';
import { supabase } from '@/lib/supabase';
import type { Enums } from '@/types/database';

export type SearchFilters = {
  continent?: Enums<'continent'>;
  minRating?: number;
  maxPrice?: number;
};

// PostgREST `or=` filters use , ( ) as syntax and % * as wildcards — strip them from user input.
const sanitize = (q: string) => q.replace(/[%*,()\\"]/g, ' ').replace(/\s+/g, ' ').trim();

/** Search destinations (name/country) and experiences (title) with ilike, debounced 300ms. */
export function useSearch(query: string, filters: SearchFilters) {
  const debounced = useDebouncedValue(sanitize(query), 300);
  const hasFilters = !!(filters.continent || filters.minRating || filters.maxPrice);
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
        .select(`${EXPERIENCE_CARD_FIELDS}, destination:destinations!inner(name, continent)`)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(30);
      if (debounced) eq = eq.ilike('title', like);
      if (filters.continent) eq = eq.eq('destination.continent', filters.continent);
      if (filters.minRating) eq = eq.gte('rating', filters.minRating);
      if (filters.maxPrice) eq = eq.lte('price_per_person', filters.maxPrice);

      // a price cap only applies to experiences
      const [d, e] = await Promise.all([filters.maxPrice ? Promise.resolve({ data: [], error: null }) : dq, eq]);
      if (d.error) throw d.error;
      if (e.error) throw e.error;
      return { destinations: d.data ?? [], experiences: e.data ?? [] };
    },
  });

  return { ...result, enabled, isDebouncing: sanitize(query) !== debounced };
}
