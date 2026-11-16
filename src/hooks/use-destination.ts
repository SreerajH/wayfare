import { useQuery } from '@tanstack/react-query';

import { EXPERIENCE_CARD_FIELDS } from '@/hooks/use-trending-experiences';
import { supabase } from '@/lib/supabase';

/** Destination page with its experiences. `data` is null when the slug doesn't exist. */
export function useDestination(slug: string) {
  return useQuery({
    queryKey: ['destination', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('destinations')
        .select(`*, experiences(${EXPERIENCE_CARD_FIELDS})`)
        .eq('slug', slug)
        .order('price_per_person', { referencedTable: 'experiences', ascending: false })
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
