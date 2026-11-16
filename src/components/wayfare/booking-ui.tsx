import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/wayfare/primitives';
import { RemoteImage } from '@/components/wayfare/remote-image';
import { Radius, Space, Type, W } from '@/constants/wayfare';
import { formatDuration } from '@/features/catalog/format';

/** Header + scroll body + pinned footer shared by the booking steps. */
export function BookingScaffold({ title, step, children, footer }: { title: string; step: string; children: ReactNode; footer: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + Space.sm }]}>
        <BackButton />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[Type.heading, { color: W.text }]}>{title}</Text>
          <Text style={[Type.micro, { color: W.textSecondary }]}>{step}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + Space.md }]}>{footer}</View>
    </View>
  );
}

export function ExperienceSummary({ title, image, days, nights }: { title: string; image: string | null; days: number; nights: number }) {
  return (
    <View style={styles.summary}>
      <RemoteImage uri={image} label={title} style={styles.summaryImage} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[Type.subheading, { color: W.text }]} numberOfLines={2}>{title}</Text>
        <Text style={[Type.caption, { color: W.textSecondary }]}>{formatDuration(days, nights)}</Text>
      </View>
    </View>
  );
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[strong ? Type.subheading : Type.bodyMedium, { color: strong ? W.text : W.textSecondary, flexShrink: 1 }]}>{label}</Text>
      <Text style={[strong ? Type.subheading : Type.body, { color: W.text }]}>{value}</Text>
    </View>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      {title ? <Text style={[Type.subheading, { color: W.text }]}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: W.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Space.screenX - 4, paddingBottom: Space.sm },
  body: { paddingHorizontal: Space.screenX, paddingTop: Space.sm, paddingBottom: Space.xxxl, gap: Space.lg },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.md,
    paddingHorizontal: Space.screenX,
    paddingTop: Space.md,
    borderTopWidth: 1,
    borderTopColor: W.border,
    backgroundColor: W.background,
  },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Space.md, padding: Space.md, borderRadius: Radius.card, borderWidth: 1, borderColor: W.border },
  summaryImage: { width: 72, height: 72, borderRadius: Radius.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Space.md },
  card: { borderRadius: Radius.card, borderWidth: 1, borderColor: W.border, padding: Space.lg, gap: Space.md },
});
