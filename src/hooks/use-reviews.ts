import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type Review = {
  id: string;
  author_name: string;
  author_location: string | null;
  rating: number;
  title: string | null;
  body: string;
  travelled_on: string;
  /** set when listing a destination's reviews, so each card can say which experience it's about */
  experience?: { title: string; slug: string } | null;
};

const FIELDS = 'id, author_name, author_location, rating, title, body, travelled_on';

export type ReviewTarget = { kind: 'experience' | 'destination'; id: string };

/** Newest first. A destination's reviews are the reviews of its experiences. */
export function useReviews(target: ReviewTarget | undefined, limit?: number) {
  return useQuery({
    queryKey: ['reviews', target?.kind, target?.id, limit ?? 'all'],
    enabled: !!target?.id,
    queryFn: async () => {
      let q =
        target!.kind === 'experience'
          ? supabase.from('reviews').select(FIELDS).eq('experience_id', target!.id)
          : supabase
              .from('reviews')
              .select(`${FIELDS}, experience:experiences!inner(title, slug, destination_id)`)
              .eq('experience.destination_id', target!.id);
      q = q.order('travelled_on', { ascending: false });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Review[];
    },
  });
}
