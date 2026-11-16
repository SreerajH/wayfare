import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { Row } from '@/components/wayfare/booking-ui';
import { Button } from '@/components/wayfare/controls';
import { Icon } from '@/components/wayfare/primitives';
import { Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';
import { formatRange } from '@/lib/dates';
import { useToast } from '@/providers/toast-provider';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const CIRCLE = 160;
const MARK = 96;
const CHECK = 'M29 49 L42 61 L67 35';
const CHECK_LENGTH = 56; // ≈ 17.7 + 36.1, rounded up so the start is fully hidden
const DRAW_DELAY = 150;
const DRAW_MS = 450;
/** content starts once the check has finished drawing */
const CONTENT_AT = DRAW_DELAY + DRAW_MS;

function successHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

function travelersLabel(adults: number, children: number) {
  const parts = [`${adults} ${adults === 1 ? 'adult' : 'adults'}`];
  if (children > 0) parts.push(`${children} ${children === 1 ? 'child' : 'children'}`);
  return parts.join(' · ');
}

export default function ConfirmedScreen() {
  const p = useLocalSearchParams<{ id: string; code: string; title: string; start: string; end: string; adults?: string; children?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const reduceMotion = useReducedMotion();

  const circleScale = useSharedValue(reduceMotion ? 1 : 0.6);
  const circleOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const dashOffset = useSharedValue(reduceMotion ? 0 : CHECK_LENGTH);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      successHaptic();
      return;
    }
    // 1) soft circle springs in
    circleScale.value = withSpring(1, { damping: 12 });
    circleOpacity.value = withTiming(1, { duration: 200 });
    // 2) the check draws itself → 3) one ring pulse + success haptic
    dashOffset.value = withDelay(
      DRAW_DELAY,
      withTiming(0, { duration: DRAW_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (!finished) return;
        pulseOpacity.value = 0.5;
        pulseScale.value = withTiming(1.35, { duration: 600, easing: Easing.out(Easing.quad) });
        pulseOpacity.value = withTiming(0, { duration: 600 });
        scheduleOnRN(successHaptic);
      }),
    );
  }, [reduceMotion, circleScale, circleOpacity, dashOffset, pulseScale, pulseOpacity]);

  const circleStyle = useAnimatedStyle(() => ({ opacity: circleOpacity.value, transform: [{ scale: circleScale.value }] }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value, transform: [{ scale: pulseScale.value }] }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: dashOffset.value }));

  // 4) content staggers up after the check (a plain fade when reduced motion is on)
  const enter = (i: number) => (reduceMotion ? FadeIn.duration(200) : FadeInDown.delay(CONTENT_AT + i * 80).duration(360));

  const adults = Number(p.adults) || 0;
  const children = Number(p.children) || 0;

  const copyCode = async () => {
    await Clipboard.setStringAsync(p.code);
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    toast('Booking ID copied', 'info');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Space.xxxl, paddingBottom: insets.bottom + Space.xxl }]}>
      <View style={styles.center}>
        <View style={styles.markWrap} accessible accessibilityRole="image" accessibilityLabel="Booking confirmed">
          <Animated.View style={[styles.pulse, pulseStyle]} />
          <Animated.View style={[styles.circle, circleStyle]}>
            <Svg width={MARK} height={MARK} viewBox={`0 0 ${MARK} ${MARK}`}>
              <Circle cx={MARK / 2} cy={MARK / 2} r={MARK / 2 - 3} stroke={W.accentStrong} strokeWidth={4} fill="none" />
              <AnimatedPath
                d={CHECK}
                stroke={W.accentStrong}
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={CHECK_LENGTH}
                animatedProps={checkProps}
              />
            </Svg>
          </Animated.View>
        </View>

        <Animated.Text entering={enter(0)} style={[Type.display, styles.text]}>
          You&apos;re all set!
        </Animated.Text>
        <Animated.Text entering={enter(1)} style={[Type.body, styles.text, { color: W.textSecondary }]}>
          {p.title} is booked. Your ticket is in Trips whenever you need it.
        </Animated.Text>
        <Animated.View entering={enter(2)} style={styles.card}>
          <View style={styles.codeRow}>
            <Text style={[Type.subheading, { color: W.text }]}>Booking ID</Text>
            <View style={styles.codeValue}>
              <Text style={[Type.subheading, { color: W.text }]} selectable>
                {p.code}
              </Text>
              <Pressable onPress={copyCode} accessibilityRole="button" accessibilityLabel="Copy booking ID" style={styles.copy}>
                <Icon name="copy" size={18} color={W.accentStrong} />
              </Pressable>
            </View>
          </View>
          {p.title ? <Row label="Trip" value={p.title} /> : null}
          {p.start && p.end ? <Row label="Dates" value={formatRange(p.start, p.end)} /> : null}
          {adults > 0 ? <Row label="Travelers" value={travelersLabel(adults, children)} /> : null}
        </Animated.View>
      </View>
      <Animated.View entering={enter(3)} style={{ gap: Space.sm }}>
        <Button label="View trip" onPress={() => router.replace({ pathname: '/trip/[id]', params: { id: p.id } })} fill />
        <Button label="Back to home" variant="ghost" onPress={() => router.replace('/')} fill />
      </Animated.View>
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: W.background, paddingHorizontal: Space.screenX, justifyContent: 'space-between' },
  center: { alignItems: 'center', gap: Space.lg },
  markWrap: { width: CIRCLE, height: CIRCLE, alignItems: 'center', justifyContent: 'center', marginBottom: Space.sm },
  circle: { ...StyleSheet.absoluteFill, borderRadius: Radius.pill, backgroundColor: W.accentSoft, alignItems: 'center', justifyContent: 'center' },
  pulse: { ...StyleSheet.absoluteFill, borderRadius: Radius.pill, borderWidth: 2, borderColor: W.accentStrong },
  text: { color: W.text, textAlign: 'center' },
  card: { alignSelf: 'stretch', borderRadius: Radius.card, borderWidth: 1, borderColor: W.border, padding: Space.lg, gap: Space.md, marginTop: Space.sm },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Space.md },
  codeValue: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  copy: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: -Space.sm },
}));
