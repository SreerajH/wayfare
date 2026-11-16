import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/wayfare/controls';
import { Icon, type ICONS } from '@/components/wayfare/primitives';
import { Radius, Space, Type, W } from '@/constants/wayfare';
import { markOnboardingSeen } from '@/lib/onboarding';
import { useAuth } from '@/providers/auth-provider';

const PAGES: { icon: keyof typeof ICONS; title: string; body: string }[] = [
  { icon: 'location', title: 'Discover places worth the trip', body: 'Hand-picked destinations and local experiences across Japan and beyond.' },
  { icon: 'calendar', title: 'Plan every day with ease', body: 'Clear day-by-day itineraries, so you always know what comes next.' },
  { icon: 'qr', title: 'Book in minutes, travel light', body: 'Secure booking, instant confirmation and every ticket in one place.' },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setOnboardingSeen } = useAuth();
  const list = useRef<FlatList>(null);
  const [page, setPage] = useState(0);

  const finish = async () => {
    await markOnboardingSeen();
    setOnboardingSeen(true);
    router.replace({ pathname: '/sign-in', params: { returnTo: '/' } });
  };
  const next = () => (page < PAGES.length - 1 ? list.current?.scrollToIndex({ index: page + 1 }) : finish());

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + Space.xxl }]}>
      <View style={styles.top}>
        {page < PAGES.length - 1 ? (
          <Pressable onPress={finish} accessibilityRole="button" style={styles.skip}>
            <Text style={[Type.bodyMedium, { color: W.text }]}>Skip</Text>
          </Pressable>
        ) : null}
      </View>
      <FlatList
        ref={list}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.title}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.page, { width }]}>
            <View style={styles.art}>
              <Icon name={item.icon} size={96} color={W.accentStrong} />
            </View>
            <Text style={[Type.display, { color: W.text }]}>{item.title}</Text>
            <Text style={[Type.body, { color: W.textSecondary }]}>{item.body}</Text>
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}>
          {PAGES.map((p, i) => (
            <View key={p.title} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        <Button label={page === PAGES.length - 1 ? 'Get started' : 'Next'} onPress={next} fill />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: W.background },
  top: { height: 52, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: Space.screenX },
  skip: { height: 44, paddingHorizontal: Space.lg, justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: W.card },
  page: { paddingHorizontal: Space.screenX, gap: Space.lg, justifyContent: 'center' },
  art: {
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: Radius.pill,
    backgroundColor: W.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.xxxl,
  },
  footer: { paddingHorizontal: Space.screenX, gap: Space.xxl },
  dots: { flexDirection: 'row', gap: Space.sm },
  dot: { width: 8, height: 8, borderRadius: Radius.pill, backgroundColor: W.border },
  dotActive: { width: 24, backgroundColor: W.accentStrong },
});
