import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Space, Type, W } from '@/constants/wayfare';

const layout = LinearTransition.duration(250);

/** Long copy clamped to `lines`, with a "Read more" / "Show less" toggle that animates the height. */
export function ExpandableText({ text, lines = 3, style }: { text: string; lines?: number; style?: TextStyle }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const lineHeight = style?.lineHeight ?? Type.body.lineHeight;

  return (
    <Animated.View layout={layout} style={styles.wrap}>
      {/* invisible full-length copy, only to learn whether the text needs more than `lines` lines */}
      <View
        style={styles.measure}
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        // measured height (not Text.onTextLayout) so this also works on web
        onLayout={(e) => setOverflows(e.nativeEvent.layout.height > lineHeight * lines + 1)}>
        <Text style={style}>{text}</Text>
      </View>
      <Text style={style} numberOfLines={expanded ? undefined : lines}>
        {text}
      </Text>
      {overflows ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          hitSlop={8}
          style={styles.toggle}>
          <Text style={[Type.bodyMedium, { color: W.accentStrong }]}>{expanded ? 'Show less' : 'Read more'}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  measure: { position: 'absolute', left: 0, right: 0, opacity: 0 },
  toggle: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center', marginTop: Space.xs },
});

/** Shared layout transition so siblings below an expanding block glide instead of jumping. */
export const expandLayout = layout;
