import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeartButton } from '@/components/wayfare/heart-button';
import { BackButton, Chip, EmptyState, ErrorState, Icon, ICONS } from '@/components/wayfare/primitives';
import { RemoteImage } from '@/components/wayfare/remote-image';
import { DetailSkeleton } from '@/components/wayfare/skeleton';
import { Radius, Space, Type, W } from '@/constants/wayfare';
import { formatDuration, formatPrice } from '@/features/catalog/format';
import { useExperience } from '@/hooks/use-experience';
import { useRequireAuth } from '@/hooks/use-require-auth';

const BAR_HEIGHT = 76;

function inclusionIcon(icon: string): keyof typeof ICONS {
  return icon in ICONS ? (icon as keyof typeof ICONS) : 'check';
}

export default function ExperienceScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const q = useExperience(slug);
  const [tab, setTab] = useState<'itinerary' | 'included'>('itinerary');

  if (q.isPending) {
    return (
      <View style={styles.screen}>
        <DetailSkeleton heroHeight={228} />
        <View style={[styles.floatingBack, { top: insets.top + Space.sm }]}>
          <BackButton />
        </View>
      </View>
    );
  }
  if (q.isError || !q.data) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={{ paddingHorizontal: Space.screenX }}>
          <BackButton />
        </View>
        {q.isError ? (
          <ErrorState height={400} onRetry={() => q.refetch()} />
        ) : (
          <EmptyState height={400} icon="search" title="Experience not found" message="It may have been removed." />
        )}
      </View>
    );
  }

  const e = q.data;
  const price = formatPrice(e.price_per_person, e.currency);
  const bookPath = `/book/${e.slug}`;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: BAR_HEIGHT + insets.bottom + Space.xxl }}>
        <View style={styles.hero}>
          <RemoteImage uri={e.cover_image_url} label={e.title} style={StyleSheet.absoluteFill} />
          <View style={styles.tint} />
          <View style={[styles.header, { paddingTop: insets.top + Space.sm }]}>
            <BackButton />
            <View style={styles.headerText}>
              <Text style={[Type.subheading, styles.inverse]} numberOfLines={1}>
                {e.title}
              </Text>
              <Text style={[Type.caption, styles.inverse]} numberOfLines={1}>
                {[`${e.duration_days} ${e.duration_days === 1 ? 'day' : 'days'}`, e.subtitle].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <HeartButton
              target={{ kind: 'experience', id: e.id }}
              label={e.title}
              preview={{
                id: `optimistic-${e.id}`, created_at: new Date().toISOString(), destination_id: null, experience_id: e.id, destination: null,
                experience: {
                  id: e.id, slug: e.slug, title: e.title, cover_image_url: e.cover_image_url, duration_days: e.duration_days,
                  duration_nights: e.duration_nights, price_per_person: e.price_per_person, currency: e.currency, rating: e.rating,
                },
              }}
            />
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.tabs}>
            <Chip label="Itinerary" active={tab === 'itinerary'} onPress={() => setTab('itinerary')} />
            <Chip label="What's included" active={tab === 'included'} onPress={() => setTab('included')} />
          </View>

          {tab === 'itinerary' ? (
            <>
              <Text style={[Type.heading, { color: W.text }]}>
                {e.duration_days}-Day {e.destination?.name ?? ''} Journey
              </Text>
              <Text style={[Type.caption, { color: W.textSecondary }]}>{formatDuration(e.duration_days, e.duration_nights)}</Text>
              {e.itinerary_days.length === 0 ? (
                <EmptyState height={140} title="Itinerary coming soon" message="Day-by-day plans are being finalised." />
              ) : (
                e.itinerary_days.map((day) => (
                  <View key={day.id} style={styles.dayCard}>
                    <RemoteImage uri={day.image_url} label={`Day ${day.day_number}`} style={styles.dayImage} />
                    <View style={styles.flex}>
                      <Text style={[Type.micro, { color: W.textSecondary }]}>Day {day.day_number}</Text>
                      <Text style={[Type.subheading, { color: W.text }]} numberOfLines={1}>
                        {day.title}
                      </Text>
                      {day.description ? (
                        <Text style={[Type.bodyMedium, { color: W.textSecondary }]} numberOfLines={2}>
                          {day.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </>
          ) : (
            <>
              <Text style={[Type.heading, { color: W.text }]}>What&apos;s included</Text>
              {e.inclusions.length === 0 ? (
                <EmptyState height={140} title="Details coming soon" message="Inclusions are being finalised." />
              ) : (
                e.inclusions.map((inc) => (
                  <View key={inc.id} style={styles.inclusion}>
                    <View style={styles.inclusionIcon}>
                      <Icon name={inclusionIcon(inc.icon)} size={24} color={W.accentStrong} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={[Type.subheading, { color: W.text }]}>{inc.title}</Text>
                      {inc.detail ? <Text style={[Type.caption, { color: W.textSecondary }]}>{inc.detail}</Text> : null}
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + Space.md }]}>
        <View>
          <Text style={[Type.caption, { color: W.textSecondary }]}>from</Text>
          <Text style={[Type.subheading, { color: W.text }]}>{price} / person</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (requireAuth(bookPath)) router.push({ pathname: '/book/[slug]', params: { slug: e.slug } });
          }}
          style={({ pressed }) => [styles.bookButton, pressed && { opacity: 0.85 }]}>
          <Text style={[Type.bodyMedium, styles.inverse]}>Book now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: W.background },
  flex: { flex: 1, gap: 2 },
  inverse: { color: W.textInverse },
  floatingBack: { position: 'absolute', left: Space.screenX - 4 },
  hero: { height: 228, backgroundColor: W.dark },
  tint: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 32, 35, 0.35)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingHorizontal: Space.screenX - 4 },
  headerText: { flex: 1, alignItems: 'center' },
  sheet: {
    marginTop: -Space.xxl,
    backgroundColor: W.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Space.screenX,
    paddingTop: Space.md,
    gap: Space.md,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.pill, backgroundColor: W.border },
  tabs: { flexDirection: 'row', gap: Space.sm },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    padding: Space.md,
    height: 112,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: W.border,
  },
  dayImage: { width: 120, height: 88, borderRadius: Radius.sm },
  inclusion: { flexDirection: 'row', alignItems: 'center', gap: Space.lg, paddingVertical: Space.md },
  inclusionIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: W.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.screenX,
    paddingTop: Space.md,
    backgroundColor: W.background,
    borderTopWidth: 1,
    borderTopColor: W.border,
  },
  bookButton: {
    height: 52,
    paddingHorizontal: Space.xxl,
    borderRadius: Radius.pill,
    backgroundColor: W.accentStrong,
    justifyContent: 'center',
  },
});
