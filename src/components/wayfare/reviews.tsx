import { useRouter } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';

import { Bone } from '@/components/wayfare/skeleton';
import { SectionHeader } from '@/components/wayfare/primitives';
import { Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';
import { formatReviews } from '@/features/catalog/format';
import { useReviews, type Review, type ReviewTarget } from '@/hooks/use-reviews';

const monthYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
const travelled = (d: string) => monthYear.format(new Date(`${d}T00:00:00`));

/** ★★★★☆ — filled stars in the rating colour, the rest in the border grey. */
export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.round(rating);
  return (
    <Text style={{ fontSize: size, lineHeight: size + 4, letterSpacing: 1 }} accessibilityLabel={`${rating} out of 5 stars`}>
      <Text style={{ color: W.rating }}>{'★'.repeat(full)}</Text>
      <Text style={{ color: W.border }}>{'★'.repeat(5 - full)}</Text>
    </Text>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Big score + stars + review count. */
export function RatingSummary({ rating, count }: { rating: number | null; count: number }) {
  if (rating == null) return null;
  return (
    <View style={styles.summary}>
      <Text style={[Type.display, styles.score]}>{rating.toFixed(1)}</Text>
      <View style={{ gap: 2 }}>
        <Stars rating={rating} size={16} />
        <Text style={[Type.caption, { color: W.textSecondary }]}>Based on {formatReviews(count)}</Text>
      </View>
    </View>
  );
}

/**
 * One review. `compact` = fixed-width card for the horizontal row (body clamped, the full text is on
 * the All reviews screen); otherwise a full-width list item with the whole text.
 */
export function ReviewCard({ review, compact, showExperience }: { review: Review; compact?: boolean; showExperience?: boolean }) {
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.author}>
        <View style={styles.avatar}>
          <Text style={[Type.bodyMedium, { color: W.accentStrong }]}>{initials(review.author_name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[Type.subheading, { color: W.text }]} numberOfLines={1}>
            {review.author_name}
          </Text>
          {review.author_location ? <Text style={[Type.caption, { color: W.textSecondary }]}>{review.author_location}</Text> : null}
        </View>
      </View>
      <View style={styles.ratingRow}>
        <Stars rating={review.rating} />
        <Text style={[Type.micro, { color: W.textSecondary }]}>Travelled {travelled(review.travelled_on)}</Text>
      </View>
      {review.title ? <Text style={[Type.subheading, { color: W.text }]}>{review.title}</Text> : null}
      <Text style={[Type.body, { color: W.textSecondary }]} numberOfLines={compact ? 4 : undefined}>
        {review.body}
      </Text>
      {showExperience && review.experience ? (
        <View style={styles.tag}>
          <Text style={[Type.micro, { color: W.text }]} numberOfLines={1}>
            {review.experience.title}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Reviews block for detail pages: summary, a swipeable row of recent reviews, "See all". */
export function ReviewsSection({ target, slug, rating, count }: { target: ReviewTarget; slug: string; rating: number | null; count: number }) {
  const router = useRouter();
  const q = useReviews(target, 6);
  const seeAll = () => router.push({ pathname: '/reviews/[slug]', params: { slug, kind: target.kind } });

  return (
    <View style={styles.section}>
      <View style={styles.padded}>
        <SectionHeader title="Reviews" action={q.data?.length ? 'See all' : undefined} onAction={seeAll} />
        <RatingSummary rating={rating} count={count} />
      </View>
      {q.isPending ? (
        <View style={[styles.row, styles.padded]}>
          <Bone w={280} h={200} r={Radius.card} />
          <Bone w={60} h={200} r={Radius.card} />
        </View>
      ) : q.isError || !q.data?.length ? (
        <Text style={[Type.caption, styles.padded, { color: W.textSecondary }]}>
          {q.isError ? "Couldn't load reviews right now." : 'No written reviews yet.'}
        </Text>
      ) : (
        <FlatList
          horizontal
          data={q.data}
          keyExtractor={(r) => r.id}
          showsHorizontalScrollIndicator={false}
          snapToInterval={280 + Space.md}
          decelerationRate="fast"
          contentContainerStyle={styles.carousel}
          renderItem={({ item }) => (
            <Pressable onPress={seeAll} accessibilityRole="button" accessibilityHint="Opens all reviews">
              <ReviewCard review={item} compact showExperience={target.kind === 'destination'} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  section: { gap: Space.md },
  padded: { paddingHorizontal: Space.screenX, gap: Space.md },
  row: { flexDirection: 'row', gap: Space.md },
  carousel: { paddingHorizontal: Space.screenX, gap: Space.md },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  score: { color: W.text },
  card: {
    padding: Space.lg,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: W.border,
    backgroundColor: W.background,
    gap: Space.sm,
  },
  cardCompact: { width: 280, minHeight: 220 },
  author: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  avatar: { width: 40, height: 40, borderRadius: Radius.pill, backgroundColor: W.accentSoft, alignItems: 'center', justifyContent: 'center' },
  tag: { alignSelf: 'flex-start', marginTop: 'auto', paddingHorizontal: Space.sm, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: W.card },
}));
