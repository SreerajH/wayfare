import { Linking, Share } from 'react-native';

import { addDays, formatRange } from '@/lib/dates';

/**
 * Support inbox shown on Trip details.
 * PLACEHOLDER: replace with the real support address before launch.
 */
export const SUPPORT_EMAIL = 'support@wayfare.app';

type Trip = { title: string; place?: string; start: string; end: string; code?: string };

const compact = (iso: string) => iso.replaceAll('-', '');

/**
 * Opens the "add event" screen of Google Calendar (app on Android, web elsewhere), pre-filled as an
 * all-day event. No calendar permission needed: the user saves it themselves.
 */
export function addTripToCalendar(t: Trip) {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${t.title} · Wayfare`,
    // all-day events use an exclusive end date
    dates: `${compact(t.start)}/${compact(addDays(t.end, 1))}`,
    details: t.code ? `Booking ID ${t.code}. Your QR ticket is in the Wayfare app under Trips.` : 'Booked with Wayfare.',
    ...(t.place ? { location: t.place } : {}),
  });
  return Linking.openURL(`https://calendar.google.com/calendar/render?${q.toString()}`);
}

export function shareTrip(t: Trip) {
  const where = t.place ? ` in ${t.place}` : '';
  return Share.share({ message: `I'm going on ${t.title}${where}, ${formatRange(t.start, t.end)}! Booked with Wayfare.` });
}

/** Map search for the trip's destination (opens the Maps app when installed). */
export function openDirections(place: string) {
  return Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`);
}

export function contactSupport(code: string) {
  const q = new URLSearchParams({ subject: `Help with booking ${code}` });
  return Linking.openURL(`mailto:${SUPPORT_EMAIL}?${q.toString().replaceAll('+', '%20')}`);
}
