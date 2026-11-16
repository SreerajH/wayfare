import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HeartButton } from '@/components/wayfare/heart-button';
import { Icon, RatingBadge } from '@/components/wayfare/primitives';
import { RemoteImage } from '@/components/wayfare/remote-image';
import { Radius, Space, Type, W } from '@/constants/wayfare';
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
  // the heart is a sibling of the card's Pressable (a button can't contain a button on web)
  return (
    <View style={styles.heroCard}>
    <Pressable
      onPress={() => router.push({ pathname: '/destination/[slug]', params: { slug } })}
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
          <View style={styles.glassArrow}>
            <Icon name="arrow" />
          </View>
        </View>
      </View>
    </Pressable>
      <View style={styles.heroHeart}>
        <HeartButton
          target={{ kind: 'destination', id }}
          label={name}
          preview={{
            id: `optimistic-${id}`, created_at: new Date().toISOString(), destination_id: id, experience_id: null, experience: null,
            destination: { id, slug, name, country, hero_image_url: heroImageUrl, rating },
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
  /** Fixed width for horizontal rows; omit to fill the parent. */
  width?: number;
};

export function ExperienceCard(p: ExperienceCardProps) {
  const router = useRouter();
  return (
    <View style={p.width ? { width: p.width } : null}>
    <Pressable
      onPress={() => router.push({ pathname: '/experience/[slug]', params: { slug: p.slug } })}
      accessibilityRole="button"
      accessibilityLabel={p.title}
      style={({ pressed }) => [styles.expCard, pressed && styles.pressed]}>
      <RemoteImage uri={p.coverImageUrl} label={p.title} style={styles.expImage} />
      <View style={styles.expBody}>
        <Text style={[Type.subheading, { color: W.text }]} numberOfLines={1}>
          {p.title}
        </Text>
        <Text style={[Type.caption, { color: W.textSecondary }]} numberOfLines={1}>
          {formatDuration(p.durationDays, p.durationNights)} · from {formatPrice(p.pricePerPerson, p.currency)}/person
        </Text>
        <View style={[styles.row, styles.expFooter]}>
          <View style={styles.row}>
            <RatingBadge rating={p.rating} />
            <Text style={[Type.micro, { color: W.textSecondary }]}>{formatReviews(p.reviewCount)}</Text>
          </View>
          <View style={styles.darkCircle}>
            <Icon name="arrow" color={W.textInverse} />
          </View>
        </View>
      </View>
    </Pressable>
      <View style={styles.expHeart}>
        <HeartButton
          target={{ kind: 'experience', id: p.id }}
          label={p.title}
          preview={{
            id: `optimistic-${p.id}`, created_at: new Date().toISOString(), destination_id: null, experience_id: p.id, destination: null,
            experience: {
              id: p.id, slug: p.slug, title: p.title, cover_image_url: p.coverImageUrl, duration_days: p.durationDays,
              duration_nights: p.durationNights, price_per_person: p.pricePerPerson, currency: p.currency, rating: p.rating,
            },
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  heroCard: { width: 264, height: 368, borderRadius: Radius.sheet, overflow: 'hidden', backgroundColor: W.dark },
  heroHeart: { position: 'absolute', top: Space.md, right: Space.md, zIndex: 1 },
  heroBody: { flex: 1, justifyContent: 'flex-end', padding: Space.lg, gap: Space.xs },
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
  glassArrow: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: W.background,
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
  expHeart: { position: 'absolute', top: 12, right: 12 },
  expBody: { paddingHorizontal: 4, gap: 4 },
  expFooter: { justifyContent: 'space-between', marginTop: 4 },
  darkCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: W.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
