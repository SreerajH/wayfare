import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { readableError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';

export type SaveTarget = { kind: 'destination'; id: string } | { kind: 'experience'; id: string };

const SAVED_SELECT =
  'id, created_at, destination_id, experience_id, ' +
  'destination:destinations(id, slug, name, country, hero_image_url, rating), ' +
  'experience:experiences(id, slug, title, cover_image_url, duration_days, duration_nights, price_per_person, currency, rating)';

async function fetchSaved(userId: string) {
  const { data, error } = await supabase
    .from('saved_items')
    .select(SAVED_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as SavedItem[];
}

export type SavedItem = {
  id: string;
  created_at: string;
  destination_id: string | null;
  experience_id: string | null;
  destination: {
    id: string; slug: string; name: string; country: string; hero_image_url: string | null; rating: number | null;
  } | null;
  experience: {
    id: string; slug: string; title: string; cover_image_url: string | null; duration_days: number;
    duration_nights: number; price_per_person: number; currency: string; rating: number | null;
  } | null;
};

const savedKey = (userId: string | undefined) => ['saved', userId] as const;
const matches = (item: SavedItem, t: SaveTarget) =>
  t.kind === 'destination' ? item.destination_id === t.id : item.experience_id === t.id;

export function useSavedItems() {
  const { user } = useAuth();
  return useQuery({
    queryKey: savedKey(user?.id),
    enabled: !!user,
    queryFn: () => fetchSaved(user!.id),
  });
}

export function useIsSaved(target: SaveTarget) {
  const { data } = useSavedItems();
  return !!data?.some((item) => matches(item, target));
}

/**
 * Toggle a save with an optimistic update: every heart reading the ['saved', uid] cache flips
 * instantly; on failure the cache rolls back and a toast explains why.
 * `preview` fills the Saved grid card until the server row arrives.
 */
export function useToggleSave() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const key = savedKey(user?.id);

  return useMutation({
    mutationFn: async ({ target, saved }: { target: SaveTarget; saved: boolean; preview?: SavedItem }) => {
      const column = target.kind === 'destination' ? 'destination_id' : 'experience_id';
      if (saved) {
        const { error } = await supabase.from('saved_items').delete().eq(column, target.id).eq('user_id', user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saved_items').insert({ [column]: target.id });
        // already saved on another device → treat as success
        if (error && error.code !== '23505') throw error;
      }
    },
    onMutate: async ({ target, saved, preview }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SavedItem[]>(key);
      queryClient.setQueryData<SavedItem[]>(key, (old = []) =>
        saved
          ? old.filter((item) => !matches(item, target))
          : [
              preview ?? {
                id: `optimistic-${target.id}`,
                created_at: new Date().toISOString(),
                destination_id: target.kind === 'destination' ? target.id : null,
                experience_id: target.kind === 'experience' ? target.id : null,
                destination: null,
                experience: null,
              },
              ...old,
            ],
      );
      return { previous };
    },
    onError: async (error, { saved }, context) => {
      queryClient.setQueryData(key, context?.previous);
      toast(`Couldn't ${saved ? 'remove' : 'save'} that. ${await readableError(error)}`);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
