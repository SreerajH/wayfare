import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';

export const ICONS = {
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  arrow: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  location: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  building: { ios: 'building.2', android: 'apartment', web: 'apartment' },
  bus: { ios: 'bus', android: 'directions_bus', web: 'directions_bus' },
  people: { ios: 'person.2', android: 'group', web: 'group' },
  coffee: { ios: 'cup.and.saucer', android: 'local_cafe', web: 'local_cafe' },
  check: { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  qr: { ios: 'qrcode', android: 'qr_code_2', web: 'qr_code_2' },
  user: { ios: 'person', android: 'person', web: 'person' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  chevronDown: { ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' },
  copy: { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' },
  bell: { ios: 'bell', android: 'notifications', web: 'notifications' },
  moon: { ios: 'moon', android: 'dark_mode', web: 'dark_mode' },
  filter: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  star: { ios: 'star.fill', android: 'star', web: 'star' },
  ticket: { ios: 'ticket', android: 'confirmation_number', web: 'confirmation_number' },
  sparkle: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  card: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
  lock: { ios: 'lock', android: 'lock', web: 'lock' },
  camera: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
  help: { ios: 'questionmark.circle', android: 'help', web: 'help' },
  mail: { ios: 'envelope', android: 'mail', web: 'mail' },
  luggage: { ios: 'suitcase', android: 'luggage', web: 'luggage' },
  heart: { ios: 'heart', android: 'favorite_border', web: 'favorite_border' },
  wifiOff: { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' },
  tips: { ios: 'lightbulb', android: 'lightbulb', web: 'lightbulb' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  directions: { ios: 'map', android: 'directions', web: 'directions' },
  calendarAdd: { ios: 'calendar.badge.plus', android: 'event_available', web: 'event_available' },
} as const;

export function Icon({ name, size = 20, color = W.text }: { name: keyof typeof ICONS; size?: number; color?: string }) {
  return <SymbolView name={ICONS[name]} size={size} tintColor={color} />;
}

/** Filter / tab chip: 36px pill inside a 44px touch target. */
export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={styles.chipHit}>
      <View style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}>
        <Text style={[Type.bodyMedium, { color: active ? W.onSelected : W.textSecondary }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function RatingBadge({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  return (
    <View style={styles.rating}>
      <Text style={[Type.micro, { color: W.rating }]}>★</Text>
      <Text style={[Type.micro, { color: W.text }]}>{rating.toFixed(1)}</Text>
    </View>
  );
}

export function BackButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={styles.iconHit}>
      <View style={styles.iconCircle}>
        <Icon name="back" />
      </View>
    </Pressable>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[Type.heading, { color: W.text }]}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="link" style={styles.link}>
          <Text style={[Type.bodyMedium, { color: W.accentStrong }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function LoadingState({ height = 200 }: { height?: number }) {
  return (
    <View style={[styles.state, { minHeight: height }]}>
      <ActivityIndicator color={W.accentStrong} />
    </View>
  );
}

export function ErrorState({ onRetry, height = 200 }: { onRetry: () => void; height?: number }) {
  return (
    <View style={[styles.state, { minHeight: height }]}>
      <Text style={[Type.subheading, { color: W.text }]}>Couldn&apos;t load this</Text>
      <Text style={[Type.bodyMedium, styles.stateMessage]}>Check your connection and try again.</Text>
      <Pressable onPress={onRetry} accessibilityRole="button" style={styles.retry}>
        <Text style={[Type.bodyMedium, { color: W.textInverse }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

/** Figma EmptyState: accent/soft circle with a 48px icon, title, message, optional button. */
export function EmptyState({ title, message, height = 200, icon, actionLabel, onAction }: {
  title: string; message: string; height?: number; icon?: keyof typeof ICONS; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <View style={[styles.state, { minHeight: height }]}>
      {icon ? (
        <View style={styles.emptyCircle}>
          <Icon name={icon} size={48} color={W.accentStrong} />
        </View>
      ) : null}
      <Text style={[Type.subheading, { color: W.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[Type.bodyMedium, styles.stateMessage]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" style={styles.retry}>
          <Text style={[Type.bodyMedium, { color: W.textInverse }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  chipHit: { paddingVertical: 4 },
  chip: { height: 36, paddingHorizontal: Space.lg, borderRadius: Radius.pill, justifyContent: 'center' },
  chipActive: { backgroundColor: W.selected },
  chipInactive: { backgroundColor: W.card },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: Space.sm,
    borderRadius: Radius.pill,
    backgroundColor: W.background,
    borderWidth: 1,
    borderColor: W.border,
    alignSelf: 'flex-start',
  },
  iconHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: W.background,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { minHeight: 44, justifyContent: 'center' },
  state: { alignItems: 'center', justifyContent: 'center', gap: Space.sm, paddingHorizontal: Space.xxl },
  stateMessage: { color: W.textSecondary, textAlign: 'center', maxWidth: 300 },
  emptyCircle: {
    width: 112,
    height: 112,
    borderRadius: Radius.pill,
    backgroundColor: W.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.sm,
  },
  retry: {
    marginTop: Space.sm,
    height: 44,
    paddingHorizontal: Space.xxl,
    borderRadius: Radius.pill,
    backgroundColor: W.accentFill,
    justifyContent: 'center',
  },
}));
