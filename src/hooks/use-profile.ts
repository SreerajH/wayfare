import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

/**
 * avatar_url is either a full URL (e.g. from Google) or a path in the private "avatars" bucket,
 * which needs a short-lived signed URL to display.
 */
export function useAvatarUrl(avatar: string | null | undefined) {
  const isRemote = !!avatar && /^https?:\/\//.test(avatar);
  const signed = useQuery({
    queryKey: ['avatar-url', avatar],
    enabled: !!avatar && !isRemote,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('avatars').createSignedUrl(avatar!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  return isRemote ? avatar : (signed.data ?? null);
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { full_name?: string | null; phone?: string | null; avatar_url?: string | null }) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', user?.id] }),
  });
}

/** Uploads a picked image to avatars/<uid>/… and returns the storage path. */
export function useUploadAvatar() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ uri, mimeType }: { uri: string; mimeType?: string | null }) => {
      const type = mimeType && /^image\/(jpeg|png|webp)$/.test(mimeType) ? mimeType : 'image/jpeg';
      const ext = type.split('/')[1].replace('jpeg', 'jpg');
      const path = `${user!.id}/avatar-${Date.now()}.${ext}`;
      const body = await (await fetch(uri)).arrayBuffer();
      if (body.byteLength > 2 * 1024 * 1024) throw new Error('That photo is over 2 MB. Pick a smaller one.');
      const { error } = await supabase.storage.from('avatars').upload(path, body, { contentType: type, upsert: false });
      if (error) throw error;
      return path;
    },
  });
}
