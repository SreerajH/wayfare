// Calendar dates are plain 'YYYY-MM-DD' strings in the user's local time zone.

export function toISODate(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseISODate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, days: number) {
  const d = parseISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function today() {
  return toISODate(new Date());
}

const short = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const withYear = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function formatDate(s: string, year = false) {
  return (year ? withYear : short).format(parseISODate(s));
}

/** "Aug 12 – Aug 15, 2026", or "Aug 12, 2026" for one-day trips. */
export function formatRange(start: string, end: string) {
  if (start === end) return formatDate(start, true);
  return `${formatDate(start)} – ${formatDate(end, true)}`;
}

export function daysBetweenInclusive(start: string, end: string) {
  return Math.round((parseISODate(end).getTime() - parseISODate(start).getTime()) / 86_400_000) + 1;
}
