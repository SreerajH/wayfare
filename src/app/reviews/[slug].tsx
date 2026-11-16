import { useLocalSearchParams } from 'expo-router';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, EmptyState, ErrorState } from '@/components/wayfare/primitives';
import { RatingSummary, ReviewCard } from '@/components/wayfare/reviews';
import { ListSkeleton } from '@/components/wayfare/skeleton';
import { Space, themedStyles, Type, W } from '@/constants/wayfare';
import { useDestination } from '@/hooks/use-destination';
import { useExperience } from '@/hooks/use-experience';
import { useReviews } from '@/hooks/use-reviews';

/** All reviews for a destination (its experiences' reviews) or one experience, full text, newest first. */
export default function ReviewsScreen() {
  const { slug, kind } = useLocalSearchParams<{ slug: string; kind?: string }>();
  const isExperience = kind === 'experience';
  const insets = useSafeAreaInsets();
  const destination = useDestination(isExperience ? '' : slug);
  const experience = useExperience(isExperience ? slug : '');
  const item = isExperience ? experience.data : destination.data;
  const title = isExperience ? experience.data?.title : destination.data?.name;
  const reviews = useReviews(item ? { kind: isExperience ? 'experience' : 'destination', id: item.id } : undefined);

  const pending = (isExperience ? experience.isPending : destination.isPending) || (!!item && reviews.isPending);
  const failed = (isExperience ? experience.isError : destination.isError) || reviews.isError;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Space.sm }]}>
      <View style={styles.header}>
        <BackButton />
        <View style={styles.headerText}>
          <Text style={[Type.heading, { color: W.text, textAlign: 'center' }]}>Reviews</Text>
          {title ? (
            <Text style={[Type.caption, { color: W.textSecondary, textAlign: 'center' }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>
        <View style={styles.balance} />
      </View>

      {pending ? (
        <View style={styles.padded}>
          <ListSkeleton rows={4} />
        </View>
      ) : failed ? (
        <ErrorState height={400} onRetry={() => reviews.refetch()} />
      ) : (
        <FlatList
          data={reviews.data ?? []}
          keyExtractor={(r) => r.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Space.xxxl }]}
          ListHeaderComponent={item ? <RatingSummary rating={item.rating} count={item.review_count} /> : undefined}
          ListEmptyComponent={<EmptyState height={300} icon="star" title="No written reviews yet" message="Reviews from travellers will show up here." />}
          renderItem={({ item: r }) => <ReviewCard review={r} showExperience={!isExperience} />}
        />
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: W.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingHorizontal: Space.screenX - 4 },
  headerText: { flex: 1 },
  balance: { width: 44, height: 44 },
  padded: { paddingHorizontal: Space.screenX, paddingTop: Space.lg },
  list: { paddingHorizontal: Space.screenX, paddingTop: Space.lg, gap: Space.md },
}));
