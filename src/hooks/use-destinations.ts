import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Enums } from '@/types/database';

type Continent = Enums<'continent'>;

/** Home carousel: destinations, optionally filtered by the selected continent chip. */
export function useDestinations(continent?: Continent) {
  return useQuery({
    queryKey: ['destinations', continent ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('destinations')
        .select('id, slug, name, country, hero_image_url, rating, review_count, continent, is_trending')
        .order('is_trending', { ascending: false })
        .order('rating', { ascending: false, nullsFirst: false });
      if (continent) query = query.eq('continent', continent);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

/** Every destination with its experience count (search screen, empty query). */
export function useDestinationList() {
  return useQuery({
    queryKey: ['destinations', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('destinations')
        .select('id, slug, name, country, continent, hero_image_url, rating, review_count, experiences(count)')
        .order('name');
      if (error) throw error;
      return data.map(({ experiences, ...d }) => ({ ...d, experienceCount: experiences[0]?.count ?? 0 }));
    },
  });
}
