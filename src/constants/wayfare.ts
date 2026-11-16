// Wayfare design tokens (mirrors the Figma "Wayfare/…" variables)
import { StyleSheet } from 'react-native';

import type { Enums } from '@/types/database';

/** Light palette — mirrors the Figma "Wayfare/…" variables. */
export const LightPalette = {
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  /** text/icons on photos, charcoal surfaces and accent fills */
  textInverse: '#FFFFFF',
  background: '#FFFFFF',
  /** soft warm grey — reads more "hospitality" than the cold #F2F3F5 */
  card: '#F4F4F2',
  /** charcoal used by the splash, nav bar and dark buttons */
  dark: '#1E1F21',
  border: '#E6E6E3',
  /** brand mint from the W logo — use on dark surfaces and for small highlights only */
  accent: '#27C197',
  /** deep pine green for links, icons and selected states (text-safe on the background) */
  accentStrong: '#0B6B55',
  /** filled buttons/badges that carry white text */
  accentFill: '#0B6B55',
  accentSoft: 'rgba(39, 193, 151, 0.14)',
  rating: '#F5A623',
  /** saved / liked heart */
  heart: '#E5484D',
  error: '#D92D20',
  errorSoft: 'rgba(217, 45, 32, 0.12)',
  warning: '#B54708',
  warningSoft: 'rgba(181, 71, 8, 0.12)',
  /** selected chip */
  selected: '#1E1F21',
  onSelected: '#FFFFFF',
  /** dims the page behind sheets and dialogs */
  scrim: 'rgba(31, 32, 35, 0.5)',
};

export type Palette = { [K in keyof typeof LightPalette]: string };

/**
 * Dark palette — soft graphite, not black: warm off-white text (not pure white) and raised surfaces
 * a few steps lighter than the page, so it's easy on the eyes at night. Same token meanings as light.
 */
export const DarkPalette: Palette = {
  text: '#E8E9EB',
  textSecondary: '#A0A4AA',
  textInverse: '#FFFFFF',
  background: '#1B1C1E',
  card: '#25272A',
  dark: '#33363A',
  border: '#303236',
  accent: '#3FD3A6',
  accentStrong: '#4CCFA6',
  accentFill: '#17805F',
  accentSoft: 'rgba(76, 207, 166, 0.14)',
  rating: '#F5B544',
  heart: '#FF6B6F',
  error: '#FF7A6E',
  errorSoft: 'rgba(255, 122, 110, 0.14)',
  warning: '#F0A35E',
  warningSoft: 'rgba(240, 163, 94, 0.14)',
  selected: '#E8E9EB',
  onSelected: '#1B1C1E',
  scrim: 'rgba(0, 0, 0, 0.6)',
};

export type ColorScheme = 'light' | 'dark';

/**
 * The live palette. Components read `W.x` while rendering; the ThemeProvider swaps its values and
 * remounts the UI when the appearance changes, so every screen re-renders with the new colours.
 */
export const W: Palette = { ...LightPalette };

let scheme: ColorScheme = 'light';
let paletteVersion = 0;

export function setColorScheme(next: ColorScheme) {
  if (next === scheme) return;
  scheme = next;
  Object.assign(W, next === 'dark' ? DarkPalette : LightPalette);
  paletteVersion++;
}

export const currentColorScheme = () => scheme;

/**
 * StyleSheet.create for styles that use W colours: built lazily from the current palette and rebuilt
 * after a theme switch. Use exactly like a StyleSheet: `const styles = themedStyles(() => ({ ... }))`.
 */
type StyleObject = Parameters<typeof StyleSheet.create>[0];

export function themedStyles<S extends StyleObject>(factory: () => S & StyleObject): Readonly<S> {
  let built: Readonly<S> | null = null;
  let builtFor = -1;
  return new Proxy({} as Readonly<S>, {
    get(_, key) {
      if (!built || builtFor !== paletteVersion) {
        built = StyleSheet.create(factory());
        builtFor = paletteVersion;
      }
      return built[key as keyof S];
    },
  });
}

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
