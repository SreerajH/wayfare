import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Href } from 'expo-router';

import type { ICONS } from '@/components/wayfare/primitives';
import { isUpcoming, useBookings, type Booking } from '@/hooks/use-bookings';
import { formatDate, formatRange, parseISODate, today } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export type AppNotification = {
  id: string;
  icon: keyof typeof ICONS;
  title: string;
  message: string;
  /** when it happened (ISO) — sorts the feed and drives Today / Earlier + unread */
  at: string;
  href?: Href;
};

const READ_KEY = 'wayfare.notifications-read-at';
const NEW_DESTINATION_DAYS = 30;

async function getReadAt() {
  try {
    return (await AsyncStorage.getItem(READ_KEY)) ?? '1970-01-01T00:00:00.000Z';
  } catch {
    return '1970-01-01T00:00:00.000Z';
  }
}

const dayMs = 86_400_000;
const hasHappened = (iso: string) => new Date(iso).getTime() <= Date.now();
const atStartOf = (isoDate: string, plusDays = 0) => new Date(parseISODate(isoDate).getTime() + plusDays * dayMs).toISOString();

/** Feed items that follow from a booking: confirmed → starting soon → how was it. */
function fromBooking(b: Booking): AppNotification[] {
  const title = b.experience?.title ?? 'Your trip';
  const out: AppNotification[] = [];
  if (b.status === 'cancelled') {
    out.push({ id: `${b.id}:cancelled`, icon: 'close', title: 'Booking cancelled', message: `${title} · ${formatRange(b.start_date, b.end_date)} was cancelled.`, at: b.created_at, href: `/trip/${b.id}` });
    return out;
  }
  out.push({
    id: `${b.id}:confirmed`,
    icon: 'check',
    title: 'Booking confirmed',
    message: `${title} · ${formatRange(b.start_date, b.end_date)} is all set.`,
    at: b.created_at,
    href: `/trip/${b.id}`,
  });
  const daysToGo = Math.round((parseISODate(b.start_date).getTime() - parseISODate(today()).getTime()) / dayMs);
  if (isUpcoming(b) && daysToGo >= 0 && daysToGo <= 14) {
    const when = daysToGo === 0 ? 'starts today' : daysToGo === 1 ? 'starts tomorrow' : `starts in ${daysToGo} days`;
    // the reminder "arrives" 14 days out (or at booking time if booked later)
    const at = new Date(Math.max(new Date(b.created_at).getTime(), parseISODate(b.start_date).getTime() - 14 * dayMs)).toISOString();
    out.push({ id: `${b.id}:soon`, icon: 'calendar', title: `Your trip ${when}`, message: `${title} — your ticket is ready in Trips.`, at, href: `/trip/ticket/${b.id}` });
  }
  if (b.end_date < today()) {
    out.push({ id: `${b.id}:done`, icon: 'heart', title: `How was ${title}?`, message: `Your trip ended ${formatDate(b.end_date)}. We hope it was wonderful.`, at: atStartOf(b.end_date, 1), href: `/trip/${b.id}` });
  }
  return out;
}

/**
 * Notifications are derived from real data (the user's bookings, account and new catalog entries)
 * rather than a notifications table; "read" is a per-device timestamp.
 */
export function useNotifications() {
  const { user } = useAuth();
  const bookings = useBookings();
  const readAt = useQuery({ queryKey: ['notifications', 'read-at'], queryFn: getReadAt, staleTime: Infinity });
  const newPlaces = useQuery({
    queryKey: ['destinations', 'new'],
    queryFn: async () => {
      // "new" = added after the catalog's launch batch, within the last 30 days (the catalog is tiny)
      const { data, error } = await supabase.from('destinations').select('slug, name, country, created_at').order('created_at');
      if (error) throw error;
      if (!data.length) return [];
      const launch = new Date(data[0].created_at).getTime();
      const since = Date.now() - NEW_DESTINATION_DAYS * dayMs;
      return data.filter((d) => {
        const t = new Date(d.created_at).getTime();
        return t > launch + 3_600_000 && t >= since;
      });
    },
  });

  const items: AppNotification[] = [];
  for (const b of bookings.data ?? []) items.push(...fromBooking(b));
  for (const d of newPlaces.data ?? []) {
    items.push({ id: `new:${d.slug}`, icon: 'location', title: `New on Wayfare: ${d.name}`, message: `Explore experiences in ${d.name}, ${d.country}.`, at: d.created_at, href: `/destination/${d.slug}` });
  }
  if (user?.created_at) {
    items.push({ id: 'welcome', icon: 'sparkle', title: 'Welcome to Wayfare', message: 'Save places you love with the heart, and book a trip in a few taps.', at: user.created_at, href: '/' });
  }
  // nothing from the future (e.g. a reminder scheduled for later)
  const feed = items.filter((n) => hasHappened(n.at)).sort((a, b) => b.at.localeCompare(a.at));
  // until the read marker loads, treat everything as read (no flash of unread dots)
  const lastRead = readAt.data ?? '9999-12-31T00:00:00.000Z';
  const unread = new Set(feed.filter((n) => n.at > lastRead).map((n) => n.id));

  return {
    feed,
    unread,
    isPending: (!!user && bookings.isPending) || newPlaces.isPending || readAt.isPending,
    isError: bookings.isError || newPlaces.isError,
    refetch: () => Promise.all([bookings.refetch(), newPlaces.refetch()]),
  };
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return async () => {
    const at = new Date().toISOString();
    queryClient.setQueryData(['notifications', 'read-at'], at);
    try {
      await AsyncStorage.setItem(READ_KEY, at);
    } catch {
      // non-critical
    }
  };
}

/** "2m", "3h", "Yesterday", "Mon", "Aug 12" */
export function relativeTime(iso: string) {
  const t = new Date(iso);
  const diff = Date.now() - t.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  if (t >= startToday) return `${Math.floor(diff / 3_600_000)}h`;
  if (t.getTime() >= startToday.getTime() - dayMs) return 'Yesterday';
  if (t.getTime() >= startToday.getTime() - 6 * dayMs) return t.toLocaleDateString('en-US', { weekday: 'short' });
  return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function isToday(iso: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return new Date(iso) >= start;
}
