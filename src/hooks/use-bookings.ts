import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { today } from '@/lib/dates';
import type { PaymentResult } from '@/features/booking/payment';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const BOOKING_SELECT =
  'id, booking_code, start_date, end_date, adults, children, total_price, status, created_at, ' +
  'experience:experiences(id, slug, title, subtitle, cover_image_url, duration_days, duration_nights, currency, destination:destinations(name, country))';

export type Booking = {
  id: string;
  booking_code: string;
  start_date: string;
  end_date: string;
  adults: number;
  children: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  experience: {
    id: string; slug: string; title: string; subtitle: string | null; cover_image_url: string | null;
    duration_days: number; duration_nights: number; currency: string;
    destination: { name: string; country: string } | null;
  } | null;
};

/** Upcoming = ends today or later and still pending/confirmed. Everything else is Past. */
export function isUpcoming(b: Pick<Booking, 'end_date' | 'status'>) {
  return b.end_date >= today() && (b.status === 'confirmed' || b.status === 'pending');
}

export function useBookings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bookings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('bookings').select(BOOKING_SELECT).order('start_date', { ascending: true });
      if (error) throw error;
      return data as unknown as Booking[];
    },
  });
}

export function useBooking(id: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['booking', id],
    enabled: !!user && !!id,
    initialData: () => queryClient.getQueryData<Booking[]>(['bookings', user?.id])?.find((b) => b.id === id),
    queryFn: async () => {
      const { data, error } = await supabase.from('bookings').select(BOOKING_SELECT).eq('id', id).maybeSingle();
      if (error) throw error;
      return data as unknown as Booking | null;
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      // RLS only lets upcoming, open bookings be cancelled — no row back means it wasn't allowed
      if (!data) throw new Error('This trip can no longer be cancelled.');
    },
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
    },
  });
}

/** Server-side price breakdown (same function the database uses when the booking is created). */
export function useQuote(experienceId: string | undefined, adults: number, children: number) {
  return useQuery({
    queryKey: ['quote', experienceId, adults, children],
    enabled: !!experienceId && adults >= 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('quote_booking', { p_experience_id: experienceId!, p_adults: adults, p_children: children })
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('This experience is no longer available.');
      return data;
    },
  });
}

export type CreateBookingInput = {
  experience_id: string;
  start_date: string;
  adults: number;
  children: number;
  payment: PaymentResult;
  contact_phone?: string;
  special_requests?: string;
};

/** Calls the create-booking Edge Function with the user's JWT (added by supabase-js). */
export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBookingInput) => {
      const { data, error } = await supabase.functions.invoke<{ booking: Booking }>('create-booking', { body: input });
      if (error) throw error;
      if (!data?.booking) throw new Error('The booking could not be confirmed.');
      return data.booking;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });
}
