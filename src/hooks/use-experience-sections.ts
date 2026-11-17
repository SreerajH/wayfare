import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Columns every experience card needs (also used by destination + search queries). */
export const EXPERIENCE_CARD_FIELDS =
  'id, slug, title, subtitle, duration_days, duration_nights, price_per_person, currency, cover_image_url, rating, review_count';

export type SectionKey = 'popular' | 'value' | 'rating' | 'short' | 'day';
export const SECTION_KEYS: SectionKey[] = ['popular', 'value', 'rating', 'short', 'day'];

export const SECTION_META: Record<SectionKey, { title: string; subtitle: string }> = {
  popular: { title: 'Most popular', subtitle: 'Most-booked by travellers' },
  value: { title: 'Best value', subtitle: 'Most trip for your money' },
  rating: { title: 'Top rated', subtitle: 'Highest rated by guests' },
  short: { title: 'Quick getaways', subtitle: '2 days or less' },
  day: { title: 'Day trips', subtitle: 'Back by dinner' },
};

export const isSectionKey = (v: unknown): v is SectionKey => typeof v === 'string' && (SECTION_KEYS as string[]).includes(v);

/** The fields the rankings read; search results and catalog rows both satisfy it. */
export type Rankable = { duration_days: number; price_per_person: number; rating: number | null; review_count: number };

export const pricePerDay = (e: Rankable) => e.price_per_person / Math.max(1, e.duration_days);

const byRating = (a: Rankable, b: Rankable) => (b.rating ?? 0) - (a.rating ?? 0) || b.review_count - a.review_count;
const byReviews = (a: Rankable, b: Rankable) => b.review_count - a.review_count || (b.rating ?? 0) - (a.rating ?? 0);

/** Filter + order a list for one ranking (shared by Home sections and search's ?sort=). */
export function rankExperiences<T extends Rankable>(list: readonly T[], key: SectionKey): T[] {
  switch (key) {
    case 'popular':
      return [...list].sort(byReviews);
    case 'value':
      return list.filter((e) => (e.rating ?? 0) >= 4.6).sort((a, b) => pricePerDay(a) - pricePerDay(b) || byRating(a, b));
    case 'rating':
      return [...list].sort(byRating);
    case 'short':
      return list.filter((e) => e.duration_days <= 2).sort(byRating);
    case 'day':
      return list.filter((e) => e.duration_days === 1).sort(byRating);
  }
}

async function fetchCatalog() {
  const { data, error } = await supabase
    .from('experiences')
    .select(`${EXPERIENCE_CARD_FIELDS}, is_trending, destination:destinations(name, country, continent)`);
  if (error) throw error;
  return data;
}

export type CatalogExperience = Awaited<ReturnType<typeof fetchCatalog>>[number];

const SECTION_LIMIT = 10;
/** a section with fewer items than this is hidden (Day trips needs at least 2) */
const MIN_ITEMS: Partial<Record<SectionKey, number>> = { day: 2 };

/**
 * Home's decision sections, derived from ONE catalog query.
 * The whole catalog is fetched and ranked on the device because it is small (~16 rows).
 * TODO: when the catalog grows, move these rankings into a Postgres view / RPC
 * (e.g. `experience_sections(limit)`) so the client only downloads what it shows.
 */
export function useExperienceSections() {
  return useQuery({
    queryKey: ['experiences', 'catalog'],
    queryFn: fetchCatalog,
    select: (rows) =>
      SECTION_KEYS.map((key) => ({ key, ...SECTION_META[key], items: rankExperiences(rows, key).slice(0, SECTION_LIMIT) })).filter(
        (s) => s.items.length >= (MIN_ITEMS[s.key] ?? 1),
      ),
  });
}

/** The whole (small) catalog, e.g. for the Filters sheet's live result count. Same cached query as Home. */
export function useCatalog() {
  return useQuery({ queryKey: ['experiences', 'catalog'], queryFn: fetchCatalog });
}

/** Full ranked list for search's "See all" (same cached query as Home). */
export function useRankedExperiences(key: SectionKey | undefined) {
  return useQuery({
    queryKey: ['experiences', 'catalog'],
    queryFn: fetchCatalog,
    enabled: !!key,
    select: (rows) => (key ? rankExperiences(rows, key) : []),
  });
}
