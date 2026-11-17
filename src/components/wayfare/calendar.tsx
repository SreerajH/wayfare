import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/wayfare/primitives';
import { Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';
import { addDays, parseISODate, toISODate } from '@/lib/dates';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

type Props = {
  /** first selectable day, 'YYYY-MM-DD' */
  minDate: string;
  maxDate: string;
  start: string | null;
  /** trip length — the end date follows automatically */
  durationDays: number;
  onSelectStart: (date: string) => void;
};

export function Calendar({ minDate, maxDate, start, durationDays, onSelectStart }: Props) {
  const initial = parseISODate(start ?? minDate);
  const [cursor, setCursor] = useState({ y: initial.getFullYear(), m: initial.getMonth() });
  const end = start ? addDays(start, durationDays - 1) : null;

  const weeks = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells: (string | null)[] = Array(first.getDay()).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(toISODate(new Date(cursor.y, cursor.m, d)));
    while (cells.length % 7) cells.push(null);
    return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  }, [cursor]);

  const min = parseISODate(minDate);
  const max = parseISODate(maxDate);
  const canPrev = cursor.y > min.getFullYear() || (cursor.y === min.getFullYear() && cursor.m > min.getMonth());
  const canNext = cursor.y < max.getFullYear() || (cursor.y === max.getFullYear() && cursor.m < max.getMonth());
  const shift = (delta: number) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <NavButton label="Previous month" icon="back" disabled={!canPrev} onPress={() => shift(-1)} />
        <Text style={[Type.subheading, { color: W.text }]}>{monthLabel.format(new Date(cursor.y, cursor.m, 1))}</Text>
        <NavButton label="Next month" icon="chevronRight" disabled={!canNext} onPress={() => shift(1)} />
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={[Type.micro, styles.weekday]}>
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.week}>
          {week.map((date, di) => {
            if (!date) return <View key={di} style={styles.cell} />;
            const disabled = date < minDate || date > maxDate;
            const isEdge = date === start || date === end;
            const inRange = !!start && !!end && date > start && date < end;
            const weekend = di === 0 || di === 6;
            return (
              <Pressable
                key={di}
                disabled={disabled}
                onPress={() => onSelectStart(date)}
                accessibilityRole="button"
                accessibilityLabel={parseISODate(date).toDateString()}
                accessibilityState={{ disabled, selected: isEdge || inRange }}
                style={[styles.cell, inRange && styles.band]}>
                <View style={[styles.day, isEdge && styles.edge]}>
                  <Text style={[Type.bodyMedium, { color: isEdge ? W.textInverse : disabled ? W.border : W.text }]}>
                    {parseISODate(date).getDate()}
                  </Text>
                  {/* weekend starts sell out first: a small dot as a hint */}
                  {weekend && !disabled && !isEdge ? <View style={styles.dot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={styles.legend}>
        <View style={[styles.dot, styles.legendDot]} />
        <Text style={[Type.micro, { color: W.textSecondary }]}>Weekend starts are popular, so book these early</Text>
      </View>
    </View>
  );
}

function NavButton({ label, icon, disabled, onPress }: { label: string; icon: 'back' | 'chevronRight'; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={[styles.nav, disabled && { opacity: 0.3 }]}>
      <Icon name={icon} />
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  card: { borderWidth: 1, borderColor: W.border, borderRadius: Radius.card, padding: Space.md, gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Space.xs },
  nav: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', color: W.textSecondary, paddingVertical: Space.xs },
  cell: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  band: { backgroundColor: W.accentSoft },
  day: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  edge: { backgroundColor: W.accentFill },
  dot: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: W.accentStrong },
  legend: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingHorizontal: Space.xs, paddingTop: Space.sm },
  legendDot: { position: 'relative', bottom: 0 },
}));
