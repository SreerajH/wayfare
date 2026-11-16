import { useEffect, useRef } from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Radius, themedStyles, W } from '@/constants/wayfare';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useIsSaved, useToggleSave, type SavedItem, type SaveTarget } from '@/hooks/use-saved';

type Props = {
  target: SaveTarget;
  /** What the Saved grid shows while the save is in flight. */
  preview?: SavedItem;
  label: string;
};

// Symmetric heart drawn on a 24×24 grid: horizontally centred on x=12, optically centred vertically.
// (The Material Symbols glyph used before sits off-centre inside its font box on Android.)
const HEART_PATH =
  'M12 20.4l-1.3-1.2C6.1 15 3 12.2 3 8.8 3 6 5.2 3.9 7.9 3.9c1.6 0 3.1.7 4.1 1.9 1-1.2 2.5-1.9 4.1-1.9 2.7 0 4.9 2.1 4.9 4.9 0 3.4-3.1 6.2-7.7 10.4L12 20.4z';

/** Every heart in the app uses this — they all read the same cache, so they stay in sync. */
export function HeartButton({ target, preview, label }: Props) {
  const requireAuth = useRequireAuth();
  const saved = useIsSaved(target);
  const toggle = useToggleSave();

  // small "pop" when the saved state changes (not on first render)
  const scale = useSharedValue(1);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    scale.value = withSequence(withTiming(1.22, { duration: 110 }), withSpring(1, { damping: 12, stiffness: 260 }));
  }, [saved, scale]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={() => {
        if (!requireAuth()) return;
        toggle.mutate({ target, saved, preview });
      }}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={saved ? `Remove ${label} from saved` : `Save ${label}`}
      style={styles.hit}>
      {/* the circle always stays white — only the heart itself turns red when saved */}
      <Animated.View style={[styles.circle, iconStyle]}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path
            d={HEART_PATH}
            fill={saved ? W.heart : 'none'}
            stroke={saved ? W.heart : W.text}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  hit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: W.background,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.14)',
  },
}));
