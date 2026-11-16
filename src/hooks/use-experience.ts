import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Experience page: itinerary_days by day_number, inclusions by sort_order. Null when not found. */
export function useExperience(slug: string) {
  return useQuery({
    queryKey: ['experience', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experiences')
        .select(
          '*, destination:destinations(id, name, country, slug), itinerary_days(id, day_number, title, description, image_url), inclusions(id, icon, title, detail, sort_order)',
        )
        .eq('slug', slug)
        .order('day_number', { referencedTable: 'itinerary_days' })
        .order('sort_order', { referencedTable: 'inclusions' })
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
