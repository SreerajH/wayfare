/**
 * Contact details typed on Review, handed to Payment in memory
 * (not as route params, so a phone number never ends up in a URL on web).
 */
export type BookingContact = { phone: string; requests: string };

let current: BookingContact | null = null;

export const setBookingContact = (c: BookingContact) => {
  current = c;
};
export const getBookingContact = () => current;

/** Digits with optional +, spaces, dashes or brackets; 6–20 characters (same rule as the server). */
export const isValidPhone = (v: string) => /^\+?[0-9 ()-]{6,20}$/.test(v.trim()) && v.replace(/\D/g, '').length >= 6;
