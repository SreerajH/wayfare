import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Font, W } from '@/constants/wayfare';

// Must match app.json → expo-splash-screen (backgroundColor + imageWidth) so the hand-off is seamless.
const SPLASH_BG = W.dark;
const MARK_SIZE = 120;

/**
 * Branded launch screen from the Figma "Wayfare / Loading Screen":
 * the native splash shows the W mark; this overlay takes over in the same spot, lifts the mark,
 * fades in the wordmark + tagline, then fades away to reveal the app.
 */
export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  const lift = useSharedValue(0);
  const textIn = useSharedValue(0);
  const fadeOut = useSharedValue(1);

  useEffect(() => {
    if (!ready) return;
    lift.value = withTiming(-64, { duration: 520, easing: Easing.out(Easing.cubic) });
    textIn.value = withDelay(180, withTiming(1, { duration: 480 }));
    fadeOut.value = withDelay(
      1500,
      withTiming(0, { duration: 380 }, (finished) => {
        if (finished) scheduleOnRN(setVisible, false);
      }),
    );
  }, [ready, lift, textIn, fadeOut]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fadeOut.value }));
  const markStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textIn.value,
    transform: [{ translateY: (1 - textIn.value) * 12 }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.overlay, overlayStyle]}
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => setReady(true));
      }}>
      <Animated.View style={markStyle}>
        <Image source={require('@/assets/images/splash-icon.png')} style={styles.mark} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[styles.textBlock, textStyle]}>
        <Image
          source={require('@/assets/images/splash-wordmark.png')}
          style={styles.wordmark}
          contentFit="contain"
          accessibilityLabel="Wayfare"
        />
        <Text style={styles.tagline} allowFontScaling={false}>
          Thoughtful Travel,{'\n'}Clearly Planned
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const keyframe = new Keyframe({
  0: { transform: [{ scale: 2 }], opacity: 0 },
  100: { transform: [{ scale: 1 }], opacity: 1, easing: Easing.elastic(0.7) },
});

/** Small animated brand mark (kept for any screen that still imports it). */
export function AnimatedIcon() {
  return (
    <Animated.View entering={keyframe.duration(600)} style={styles.iconContainer}>
      <Image style={styles.mark} source={require('@/assets/images/splash-icon.png')} contentFit="contain" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  mark: { width: MARK_SIZE, height: MARK_SIZE },
  textBlock: { position: 'absolute', top: '50%', marginTop: -6, alignItems: 'center', gap: 18 },
  wordmark: { width: 172, height: 67 },
  tagline: {
    fontFamily: Font.regular,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.6,
    color: '#B9BABD',
    textAlign: 'center',
  },
  iconContainer: { width: 128, height: 128, alignItems: 'center', justifyContent: 'center' },
});
