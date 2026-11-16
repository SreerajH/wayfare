import { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Space, W } from '@/constants/wayfare';

/** Grey block (surface/card) with a gentle pulse — the Figma "Homepage Loading" style. */
export function Bone({ w, h, r = Radius.sm, style }: { w: DimensionValue; h: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const [pulse] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: W.card, opacity: pulse }, style]} />;
}

export function HomeSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView scrollEnabled={false} style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + Space.sm }}>
      <View style={styles.padded}>
        <View style={styles.rowBetween}>
          <View style={{ gap: Space.sm }}>
            <Bone w={200} h={28} />
            <Bone w={150} h={16} />
          </View>
          <Bone w={44} h={44} r={Radius.pill} />
        </View>
        <Bone w="100%" h={48} r={Radius.pill} style={{ marginTop: Space.xl }} />
        <Bone w={160} h={20} style={{ marginTop: Space.xxl }} />
        <View style={[styles.row, { marginTop: Space.md }]}>
          {[56, 72, 64, 112].map((w, i) => (
            <Bone key={i} w={w} h={36} r={Radius.pill} />
          ))}
        </View>
      </View>
      <CarouselSkeleton />
      <View style={[styles.padded, styles.rowBetween, { marginTop: Space.xxl }]}>
        <Bone w={180} h={20} />
        <Bone w={56} h={16} />
      </View>
    </ScrollView>
  );
}

export function CarouselSkeleton() {
  return (
    <View style={[styles.row, { paddingHorizontal: Space.screenX, marginTop: Space.lg, gap: Space.lg }]}>
      <Bone w={264} h={368} r={Radius.sheet} />
      <Bone w={264} h={368} r={Radius.sheet} />
    </View>
  );
}

export function ExperienceRowSkeleton() {
  return (
    <View style={[styles.row, { paddingHorizontal: Space.screenX, gap: Space.lg }]}>
      {[0, 1].map((i) => (
        <View key={i} style={styles.expCard}>
          <Bone w="100%" h={150} />
          <Bone w={180} h={18} />
          <Bone w={140} h={14} />
        </View>
      ))}
    </View>
  );
}

/** Photo header + sheet, used by Destination, Experience and Trip details. */
export function DetailSkeleton({ heroHeight = 380 }: { heroHeight?: number }) {
  return (
    <View style={styles.screen}>
      <Bone w="100%" h={heroHeight} r={0} />
      <View style={[styles.sheet, { gap: Space.md }]}>
        <Bone w={40} h={4} r={Radius.pill} style={{ alignSelf: 'center' }} />
        <View style={styles.rowBetween}>
          <Bone w={160} h={26} />
          <Bone w={52} h={24} r={Radius.pill} />
        </View>
        <Bone w={200} h={14} />
        <Bone w="100%" h={14} style={{ marginTop: Space.sm }} />
        <Bone w="90%" h={14} />
        <Bone w="70%" h={14} />
        {[0, 1, 2].map((i) => (
          <Bone key={i} w="100%" h={112} r={Radius.card} style={{ marginTop: Space.sm }} />
        ))}
      </View>
    </View>
  );
}

/** Thumbnail + two lines, for Trips and Search. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={{ gap: Space.lg }}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={[styles.row, { gap: Space.md }]}>
          <Bone w={88} h={88} r={Radius.card} />
          <View style={{ gap: Space.sm, flex: 1 }}>
            <Bone w="70%" h={18} />
            <Bone w="50%" h={14} />
            <Bone w={80} h={22} r={Radius.pill} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function GridSkeleton() {
  return (
    <View style={styles.grid}>
      {Array.from({ length: 4 }, (_, i) => (
        <View key={i} style={{ width: '47.5%', gap: Space.sm }}>
          <Bone w="100%" h={168} r={Radius.card} />
          <Bone w="70%" h={16} />
          <Bone w="50%" h={12} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: W.background },
  padded: { paddingHorizontal: Space.screenX },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  expCard: { width: 280, gap: Space.sm, padding: Space.sm, borderRadius: Radius.card, borderWidth: 1, borderColor: W.border },
  sheet: {
    marginTop: -Space.xxl,
    backgroundColor: W.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Space.screenX,
    paddingTop: Space.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.lg, justifyContent: 'space-between' },
});
