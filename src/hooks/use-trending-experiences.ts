import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export const EXPERIENCE_CARD_FIELDS =
  'id, slug, title, subtitle, duration_days, duration_nights, price_per_person, currency, cover_image_url, rating, review_count';

/** Home "Trending experiences". */
export function useTrendingExperiences() {
  return useQuery({
    queryKey: ['experiences', 'trending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experiences')
        .select(`${EXPERIENCE_CARD_FIELDS}, destination:destinations(name, country, slug)`)
        .eq('is_trending', true)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
}
