// Wayfare design tokens (mirrors the Figma "Wayfare/…" variables)
import type { Enums } from '@/types/database';

export const W = {
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textInverse: '#FFFFFF',
  background: '#FFFFFF',
  /** soft warm grey — reads more "hospitality" than the cold #F2F3F5 */
  card: '#F4F4F2',
  /** charcoal used by the splash, nav bar and dark buttons */
  dark: '#1E1F21',
  border: '#E6E6E3',
  /** brand mint from the W logo — use on dark surfaces and for small highlights only */
  accent: '#27C197',
  /** deep pine green for buttons, links and selected states on white (passes AA with white text) */
  accentStrong: '#0B6B55',
  accentSoft: 'rgba(39, 193, 151, 0.14)',
  rating: '#F5A623',
  /** saved / liked heart */
  heart: '#E5484D',
  error: '#D92D20',
} as const;

/** Instrument Sans (the Figma typeface) — loaded in app/_layout.tsx from assets/fonts. */
export const Font = {
  regular: 'InstrumentSans-Regular',
  medium: 'InstrumentSans-Medium',
  semibold: 'InstrumentSans-SemiBold',
  bold: 'InstrumentSans-Bold',
} as const;

export const FontFiles = {
  [Font.regular]: require('@/assets/fonts/InstrumentSans_400Regular.ttf'),
  [Font.medium]: require('@/assets/fonts/InstrumentSans_500Medium.ttf'),
  [Font.semibold]: require('@/assets/fonts/InstrumentSans_600SemiBold.ttf'),
  [Font.bold]: require('@/assets/fonts/InstrumentSans_700Bold.ttf'),
};

export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, screenX: 20 } as const;
export const Radius = { sm: 8, card: 16, sheet: 24, pill: 999 } as const;

// Each weight is its own font file, so styles set fontFamily (not fontWeight) —
// adding fontWeight on top of a custom font makes Android fake-bold it.
export const Type = {
  display: { fontFamily: Font.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  title: { fontFamily: Font.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  heading: { fontFamily: Font.semibold, fontSize: 18, lineHeight: 24 },
  subheading: { fontFamily: Font.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: Font.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: Font.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: Font.regular, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: Font.medium, fontSize: 12, lineHeight: 16 },
} as const;

export const CONTINENT_LABELS: Record<Enums<'continent'>, string> = {
  asia: 'Asia',
  europe: 'Europe',
  africa: 'Africa',
  north_america: 'North America',
  south_america: 'South America',
  oceania: 'Oceania',
};
