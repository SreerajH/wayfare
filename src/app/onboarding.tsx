import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/wayfare/controls';
import { Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';
import { useScreenStatusBar } from '@/hooks/use-screen-status-bar';
import { markOnboardingSeen } from '@/lib/onboarding';
import { useAuth } from '@/providers/auth-provider';

// Figma "Wayfare / Onboarding 1–3" (A5): photo hero with rounded bottom, dots, title, body, CTA.
const PAGES = [
  {
    image: require('@/assets/images/onboarding/onboarding-1.webp'),
    title: 'Discover places worth the trip',
    body: 'Hand-picked destinations and local experiences, from alpine lakes to city lights.',
  },
  {
    image: require('@/assets/images/onboarding/onboarding-2.webp'),
    title: 'Plan every day with ease',
    body: 'Clear day-by-day itineraries, so you always know what comes next.',
  },
  {
    image: require('@/assets/images/onboarding/onboarding-3.webp'),
    title: 'Book in minutes, travel light',
    body: 'Secure booking, instant confirmation and every ticket in one place.',
  },
];

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, setOnboardingSeen } = useAuth();
  const list = useRef<FlatList>(null);
  const [page, setPage] = useState(0);
  useScreenStatusBar('light');

  // 480 on a 852pt-tall phone (the Figma frame), scaled down on shorter screens
  const heroHeight = Math.round(Math.min(480, height * 0.56));
  const last = page === PAGES.length - 1;

  const finish = async () => {
    await markOnboardingSeen();
    setOnboardingSeen(true);
    // opened again from More while signed in → just go back to the app
    if (session) router.replace('/');
    else router.replace({ pathname: '/sign-in', params: { returnTo: '/' } });
  };
  const next = () => {
    if (last) return finish();
    // set the page right away: scroll-end events aren't reliable for programmatic scrolls
    list.current?.scrollToIndex({ index: page + 1 });
    setPage(page + 1);
  };

  return (
    <View style={styles.screen}>
      <FlatList
        ref={list}
        data={PAGES}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.title}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        scrollEventThrottle={32}
        onScroll={(e) => {
          // swipes: switch once the next page is more than half on screen
          const p = Math.round(e.nativeEvent.contentOffset.x / width);
          if (p !== page && p >= 0 && p < PAGES.length) setPage(p);
        }}
        style={styles.pager}
        renderItem={({ item, index }) => (
          <View style={{ width }}>
            <View style={[styles.hero, { height: heroHeight }]}>
              <Image source={item.image} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
              {/* keeps the status bar readable on bright skies */}
              <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']} style={styles.scrim} />
            </View>
            <View style={styles.copy}>
              <View style={styles.dots} accessibilityLabel={`Page ${index + 1} of ${PAGES.length}`}>
                {PAGES.map((p, i) => (
                  <View key={p.title} style={[styles.dot, i === index && styles.dotActive]} />
                ))}
              </View>
              <Text style={[Type.display, { color: W.text }]}>{item.title}</Text>
              <Text style={[Type.body, { color: W.textSecondary }]}>{item.body}</Text>
            </View>
          </View>
        )}
      />

      {last ? null : (
        <Pressable
          onPress={finish}
          accessibilityRole="button"
          accessibilityLabel="Skip intro"
          style={[styles.skip, { top: insets.top + Space.sm }]}>
          <Text style={[Type.bodyMedium, { color: W.text }]}>Skip</Text>
        </Pressable>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + Space.xxl }]}>
        <Button label={last ? 'Get started' : 'Next'} icon="arrow" onPress={next} fill />
        {last && !session ? <Button label="I already have an account" variant="ghost" onPress={finish} fill /> : null}
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: W.background },
  pager: { flexGrow: 1 },
  hero: {
    backgroundColor: W.dark,
    borderBottomLeftRadius: Radius.sheet,
    borderBottomRightRadius: Radius.sheet,
    overflow: 'hidden',
  },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  copy: { paddingHorizontal: Space.screenX, paddingTop: Space.xxxl, gap: Space.lg },
  dots: { flexDirection: 'row', gap: Space.sm, marginBottom: Space.xs },
  dot: { width: 8, height: 8, borderRadius: Radius.pill, backgroundColor: W.border },
  dotActive: { width: 24, backgroundColor: W.accentStrong },
  skip: {
    position: 'absolute',
    right: Space.screenX,
    height: 44,
    paddingHorizontal: Space.lg,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    backgroundColor: W.background,
  },
  footer: { paddingHorizontal: Space.screenX, gap: Space.sm },
}));
