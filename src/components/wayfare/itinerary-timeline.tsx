import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/wayfare/primitives';
import { RemoteImage } from '@/components/wayfare/remote-image';
import { Radius, Space, Type, W } from '@/constants/wayfare';

export type ItineraryDay = {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  image_url: string | null;
};

const layout = LinearTransition.duration(250);
const DOT = 24;

/**
 * Vertical day-by-day timeline. Each day is a card that expands in place to show the full
 * description and a large photo. Several days can be open; day 1 starts open so the pattern is discoverable.
 */
export function ItineraryTimeline({ days }: { days: ItineraryDay[] }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(days[0] ? [days[0].id] : []));
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <View>
      {days.map((day, i) => (
        <DayRow key={day.id} day={day} last={i === days.length - 1} expanded={open.has(day.id)} onToggle={() => toggle(day.id)} />
      ))}
    </View>
  );
}

function DayRow({ day, last, expanded, onToggle }: { day: ItineraryDay; last: boolean; expanded: boolean; onToggle: () => void }) {
  const rotation = useSharedValue(expanded ? 180 : 0);
  useEffect(() => {
    rotation.value = withTiming(expanded ? 180 : 0, { duration: 250 });
  }, [expanded, rotation]);
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const label = `Day ${day.day_number}`;

  return (
    <Animated.View layout={layout} style={styles.row}>
      {/* rail: numbered dot + the line down to the next day */}
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: expanded ? W.accentStrong : W.dark }]}>
          <Text style={[Type.micro, { color: W.textInverse }]} allowFontScaling={false}>
            {day.day_number}
          </Text>
        </View>
        {last ? null : <View style={styles.line} />}
      </View>

      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${label}, ${day.title}`}
        accessibilityHint={expanded ? 'Collapses this day' : 'Shows the full plan for this day'}
        style={({ pressed }) => [styles.card, last ? null : styles.cardGap, pressed && styles.pressed]}>
        <View style={styles.head}>
          {expanded ? null : <RemoteImage uri={day.image_url} label={label} style={styles.thumb} />}
          <View style={styles.headText}>
            <Text style={[Type.micro, { color: W.textSecondary }]}>{label}</Text>
            <Text style={[Type.subheading, { color: W.text }]}>{day.title}</Text>
            {!expanded && day.description ? (
              <Text style={[Type.caption, { color: W.textSecondary }]} numberOfLines={2}>
                {day.description}
              </Text>
            ) : null}
          </View>
          <Animated.View style={[styles.chevron, chevronStyle]}>
            <Icon name="chevronDown" size={22} color={W.text} />
          </Animated.View>
        </View>

        {expanded ? (
          <Animated.View entering={FadeIn.duration(220)} style={styles.body}>
            <RemoteImage uri={day.image_url} label={label} style={styles.photo} />
            {day.description ? <Text style={[Type.body, { color: W.textSecondary }]}>{day.description}</Text> : null}
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Space.md },
  rail: { width: DOT, alignItems: 'center', paddingTop: Space.lg },
  dot: { width: DOT, height: DOT, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2, backgroundColor: W.border, marginTop: Space.xs },
  card: {
    flex: 1,
    padding: Space.md,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: W.border,
    backgroundColor: W.background,
    overflow: 'hidden',
  },
  cardGap: { marginBottom: Space.md },
  pressed: { opacity: 0.85 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  thumb: { width: 64, height: 64, borderRadius: Radius.sm },
  headText: { flex: 1, gap: 2 },
  chevron: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  body: { gap: Space.md, marginTop: Space.md },
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.card },
});
