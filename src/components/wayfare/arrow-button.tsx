import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/wayfare/primitives';

const OUT = 28; // px the arrow travels before it wraps around

/**
 * Round "go" arrow on cards. On tap the arrow shoots off to the right, comes back in from the left,
 * and the card's navigation fires as it leaves, so the motion reads as "on your way".
 */
export function ArrowButton({
  onPress,
  color,
  size,
  label,
  style,
}: {
  onPress: () => void;
  color: string;
  size: number;
  label: string;
  style: StyleProp<ViewStyle>;
}) {
  const x = useSharedValue(0);
  const opacity = useSharedValue(1);
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    opacity: opacity.value,
  }));

  const go = () => {
    const ease = Easing.out(Easing.cubic);
    x.set(
      withSequence(
        withTiming(OUT, { duration: 170, easing: Easing.in(Easing.cubic) }),
        withTiming(-OUT, { duration: 0 }),
        withTiming(0, { duration: 260, easing: ease }),
      ),
    );
    // navigate from the JS thread as the arrow leaves (a UI-thread animation callback didn't fire reliably on Android)
    setTimeout(onPress, 170);
    opacity.set(withSequence(withTiming(0, { duration: 170 }), withTiming(1, { duration: 260 })));
  };

  return (
    <Pressable
      onPressIn={() => {
        // a small nudge right on touch-down, before the release sends it off
        x.set(withTiming(4, { duration: 90 }));
      }}
      onPressOut={() => {
        // dragged off without a tap: settle back (a tap's onPress replaces this right after)
        x.set(withTiming(0, { duration: 120 }));
      }}
      onPress={go}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [style, { overflow: 'hidden', transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
      <Animated.View style={arrowStyle}>
        <Icon name="arrow" size={size} color={color} />
      </Animated.View>
    </Pressable>
  );
}
