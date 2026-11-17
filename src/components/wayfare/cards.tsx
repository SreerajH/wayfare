import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ArrowButton } from '@/components/wayfare/arrow-button';
import { HeartButton } from '@/components/wayfare/heart-button';
import { Icon, RatingBadge } from '@/components/wayfare/primitives';
import { RemoteImage } from '@/components/wayfare/remote-image';
import { currentColorScheme, LightPalette, Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';
import { formatDuration, formatPrice, formatReviews } from '@/features/catalog/format';

type DestinationCardProps = {
  id: string;
  slug: string;
  name: string;
  country: string;
  heroImageUrl: string | null;
  rating: number | null;
  reviewCount: number;
};

/** Tall photo card for the Home carousel (Figma DestinationHeroCard). */
export function DestinationCard({ id, slug, name, country, heroImageUrl, rating, reviewCount }: DestinationCardProps) {
  const router = useRouter();
  const open = () => router.push({ pathname: '/destination/[slug]', params: { slug } });
  // the heart is a sibling of the card's Pressable (a button can't contain a button on web)
  return (
    <View style={styles.heroCard}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${country}`}
        style={({ pressed }) => [styles.fill, pressed && styles.pressed]}>
        <RemoteImage uri={heroImageUrl} label={name} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.heroBody}>
          <Text style={[Type.caption, { color: W.textInverse }]}>{country}</Text>
          <Text style={[Type.title, { color: W.textInverse }]}>{name}</Text>
          <View style={styles.row}>
            <RatingBadge rating={rating} />
            <Text style={[Type.micro, { color: W.textInverse }]}>{formatReviews(reviewCount)}</Text>
          </View>
          <View style={styles.glass}>
            <Text style={[Type.bodyMedium, { color: W.textInverse }]}>Explore destination</Text>
            {/* space for the arrow button, which sits on top as a sibling (a button can't hold a button on web) */}
            <View style={styles.glassArrowSlot} />
          </View>
        </View>
      </Pressable>
      <ArrowButton
        onPress={open}
        label={`Explore ${name}`}
        size={20}
        color={LightPalette.text}
        style={[styles.glassArrow, styles.glassArrowPos]}
      />
      <View style={styles.heroHeart}>
        <HeartButton
          target={{ kind: 'destination', id }}
          label={name}
          preview={{
            id: `optimistic-${id}`,
            created_at: new Date().toISOString(),
            destination_id: id,
            experience_id: null,
            experience: null,
            destination: {
              id,
              slug,
              name,
              country,
              hero_image_url: heroImageUrl,
              rating,
            },
          }}
        />
      </View>
    </View>
  );
}

type ExperienceCardProps = {
  id: string;
  slug: string;
  title: string;
  durationDays: number;
  durationNights: number;
  pricePerPerson: number;
  currency: string;
  coverImageUrl: string | null;
  rating: number | null;
  reviewCount: number;
  /** "Tokyo, Japan" — shown when a row mixes destinations. */
  place?: string;
  /** Pill on the photo's top-left (the heart stays top-right). */
  badge?: { label: string; tone: 'dark' | 'accent' };
  /** Highlights the card as the #1 pick of a ranked row, e.g. "#1 Most popular". */
  featured?: string;
  /** Fixed width for horizontal rows; omit to fill the parent. */
  width?: number;
};

export function ExperienceCard(p: ExperienceCardProps) {
  const router = useRouter();
  const open = () => router.push({ pathname: '/experience/[slug]', params: { slug: p.slug } });
  const featured = !!p.featured;
  return (
    <View style={p.width ? { width: p.width } : null}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={[p.featured, p.title, p.place, p.badge?.label].filter(Boolean).join(', ')}
        style={({ pressed }) => [
          styles.expCard,
          featured && styles.expCardFeatured,
          p.width ? styles.fill : null,
          pressed && styles.pressed,
        ]}>
        <View>
          <RemoteImage uri={p.coverImageUrl} label={p.title} style={styles.expImage} />
          {p.featured ? (
            <View style={styles.featuredRibbon}>
              <Icon name="sparkle" size={13} color="#FFFFFF" />
              <Text style={[Type.micro, styles.featuredText]}>{p.featured}</Text>
            </View>
          ) : null}
          {p.badge ? (
            <View
              style={[
                styles.badge,
                p.featured && styles.badgeUnderRibbon,
                {
                  backgroundColor: p.badge.tone === 'accent' ? W.accentFill : W.dark,
                },
              ]}>
              <Text style={[Type.micro, { color: W.textInverse }]}>{p.badge.label}</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.expBody, p.width ? styles.fill : null]}>
          <Text style={[Type.subheading, { color: W.text }]} numberOfLines={2}>
            {p.title}
          </Text>
          {p.place ? (
            <View style={styles.place}>
              <Icon name="location" size={14} color={W.text} />
              <Text style={[Type.micro, { color: W.text, flexShrink: 1 }]} numberOfLines={1}>
                {p.place}
              </Text>
            </View>
          ) : null}
          <Text style={[Type.caption, { color: W.textSecondary }]}>
            {formatDuration(p.durationDays, p.durationNights)} · from {formatPrice(p.pricePerPerson, p.currency)} / person
          </Text>
          <View style={[styles.row, styles.expFooter]}>
            <View style={[styles.row, styles.footerMeta]}>
              <RatingBadge rating={p.rating} />
              <Text style={[Type.micro, { color: W.textSecondary }]}>{formatReviews(p.reviewCount)}</Text>
            </View>
            <View style={styles.circleSlot} />
          </View>
        </View>
      </Pressable>
      <ArrowButton
        onPress={open}
        label={`Open ${p.title}`}
        size={20}
        color={W.textInverse}
        style={[styles.darkCircle, featured && styles.darkCircleFeatured, styles.circlePos]}
      />
      <View style={styles.expHeart}>
        <HeartButton
          target={{ kind: 'experience', id: p.id }}
          label={p.title}
          preview={{
            id: `optimistic-${p.id}`,
            created_at: new Date().toISOString(),
            destination_id: null,
            experience_id: p.id,
            destination: null,
            experience: {
              id: p.id,
              slug: p.slug,
              title: p.title,
              cover_image_url: p.coverImageUrl,
              duration_days: p.durationDays,
              duration_nights: p.durationNights,
              price_per_person: p.pricePerPerson,
              currency: p.currency,
              rating: p.rating,
            },
          }}
        />
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  pressed: { opacity: 0.85 },
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  heroCard: {
    width: 264,
    height: 368,
    borderRadius: Radius.sheet,
    overflow: 'hidden',
    backgroundColor: W.dark,
  },
  heroHeart: {
    position: 'absolute',
    top: Space.md,
    right: Space.md,
    zIndex: 1,
  },
  heroBody: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Space.lg,
    gap: Space.xs,
  },
  glass: {
    marginTop: Space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Space.xl,
    padding: 4,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  glassArrowSlot: { width: 44, height: 44 },
  // on top of the pill's right end: card padding (16) + pill border (1) + pill padding (4)
  glassArrowPos: {
    position: 'absolute',
    right: Space.lg + 5,
    bottom: Space.lg + 5,
  },
  // always a white circle on the photo, in both themes
  glassArrow: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: LightPalette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expCard: {
    backgroundColor: W.background,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: W.border,
    padding: Space.sm,
    paddingBottom: Space.md,
    gap: Space.md,
  },
  expImage: { height: 150, borderRadius: Radius.sm },
  // the #1 card of a ranked row: accent outline, a soft accent wash and a ribbon on the photo
  expCardFeatured: {
    borderWidth: 2,
    borderColor: W.accentStrong,
    backgroundColor: currentColorScheme() === 'dark' ? '#1F2B27' : '#F1FAF6',
    padding: Space.sm - 1,
    paddingBottom: Space.md - 1,
  },
  featuredRibbon: {
    position: 'absolute',
    top: Space.sm,
    left: Space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Space.sm + 2,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: W.accentFill,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  featuredText: { color: '#FFFFFF', fontWeight: '700' },
  badgeUnderRibbon: { top: Space.sm + 32 },
  badge: {
    position: 'absolute',
    top: Space.sm,
    left: Space.sm,
    paddingHorizontal: Space.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  place: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  footerMeta: { flex: 1, flexWrap: 'wrap' },
  expHeart: { position: 'absolute', top: 12, right: 12 },
  expBody: { paddingHorizontal: 4, gap: 4 },
  // marginTop auto keeps footers aligned when cards in a row have 1- and 2-line titles
  expFooter: {
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 4,
  },
  // charcoal on light, green on dark (a grey circle disappears into the dark card)
  circleSlot: { width: 40, height: 40 },
  // over the footer's right end: card padding (8, 12) + border (1) + body inset (4)
  circlePos: {
    position: 'absolute',
    right: Space.sm + 5,
    bottom: Space.md + 1,
  },
  darkCircleFeatured: { backgroundColor: W.accentFill },
  darkCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: currentColorScheme() === 'dark' ? W.accentFill : W.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
