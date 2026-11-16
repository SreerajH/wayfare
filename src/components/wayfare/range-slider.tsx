import { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Radius, W } from '@/constants/wayfare';

const THUMB = 28;
const HIT = 44;

type Props = {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  /** spoken value for screen readers, e.g. "$100" */
  format: (n: number) => string;
};

/**
 * Two-thumb range slider (Figma Filters → Price range): 4px track, accent range, 28px thumbs in a 44px row.
 * One responder for the whole row: a touch grabs the nearest thumb, so small thumbs stay easy to hit.
 */
export function RangeSlider({ min, max, step, value, onChange, format }: Props) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<0 | 1>(0);
  const [lo, hi] = value;

  const usable = Math.max(0, width - THUMB);
  const pos = (n: number) => ((n - min) / (max - min)) * usable;

  // rebuilt whenever the value changes; the responder system always calls the latest handlers
  const responder = useMemo(() => {
    const toValue = (x: number) => {
      const raw = min + ((x - THUMB / 2) / Math.max(1, usable)) * (max - min);
      return Math.min(max, Math.max(min, Math.round(raw / step) * step));
    };
    const move = (x: number, thumb: 0 | 1) => {
      const v = toValue(x);
      const next: [number, number] = thumb === 0 ? [Math.min(v, hi - step), hi] : [lo, Math.max(v, lo + step)];
      if (next[0] !== lo || next[1] !== hi) onChange(next);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // keep the gesture when the finger drifts vertically (the sheet must not steal it)
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const v = toValue(e.nativeEvent.locationX);
        const thumb: 0 | 1 = Math.abs(v - lo) <= Math.abs(v - hi) ? 0 : 1;
        setActive(thumb);
        move(e.nativeEvent.locationX, thumb);
      },
      onPanResponderMove: (e) => move(e.nativeEvent.locationX, active),
    });
  }, [min, max, step, usable, lo, hi, active, onChange]);

  const adjust = (i: 0 | 1, dir: 1 | -1) => {
    const next: [number, number] = [lo, hi];
    next[i] = Math.min(max, Math.max(min, next[i] + dir * step));
    if (next[0] < next[1]) onChange(next);
  };

  return (
    <View style={styles.row} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} {...responder.panHandlers}>
      {/* children ignore touches so locationX is always relative to this row */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.track} />
        <View style={[styles.range, { left: pos(lo) + THUMB / 2, width: Math.max(0, pos(hi) - pos(lo)) }]} />
      </View>
      {([0, 1] as const).map((i) => (
        <View
          key={i}
          pointerEvents="none"
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={i === 0 ? 'Minimum price' : 'Maximum price'}
          accessibilityValue={{ text: format(value[i]) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => adjust(i, e.nativeEvent.actionName === 'increment' ? 1 : -1)}
          style={[styles.thumb, { left: pos(value[i]) }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: HIT, justifyContent: 'center' },
  track: { position: 'absolute', left: THUMB / 2, right: THUMB / 2, top: HIT / 2 - 2, height: 4, borderRadius: Radius.pill, backgroundColor: W.border },
  range: { position: 'absolute', top: HIT / 2 - 2, height: 4, borderRadius: Radius.pill, backgroundColor: W.accentStrong },
  thumb: {
    position: 'absolute',
    top: (HIT - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: Radius.pill,
    backgroundColor: W.background,
    borderWidth: 2,
    borderColor: W.accentStrong,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  },
});
