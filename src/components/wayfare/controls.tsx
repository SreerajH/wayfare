import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from '@/components/wayfare/primitives';
import { Font, Radius, Space, Type, W } from '@/constants/wayfare';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'dark' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  fill?: boolean;
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, fill }: ButtonProps) {
  const off = disabled || loading;
  const bg = variant === 'primary' ? W.accentStrong : variant === 'dark' ? W.dark : 'transparent';
  const color = variant === 'ghost' ? W.text : variant === 'danger' ? W.error : W.textInverse;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        fill && { alignSelf: 'stretch' },
        variant === 'danger' && styles.dangerBorder,
        (pressed || off) && { opacity: off ? 0.5 : 0.85 },
      ]}>
      {loading ? <ActivityIndicator color={color} /> : <Text style={[Type.bodyMedium, { color }]}>{label}</Text>}
    </Pressable>
  );
}

export const StatusColors = {
  confirmed: { bg: W.accentSoft, dot: W.accent, text: W.accentStrong, label: 'Confirmed' },
  pending: { bg: 'rgba(181, 71, 8, 0.12)', dot: '#B54708', text: '#B54708', label: 'Pending' },
  cancelled: { bg: 'rgba(217, 45, 32, 0.12)', dot: W.error, text: W.text, label: 'Cancelled' },
  completed: { bg: W.card, dot: W.textSecondary, text: W.text, label: 'Completed' },
} as const;

export function StatusBadge({ status }: { status: keyof typeof StatusColors }) {
  const c = StatusColors[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <View style={[styles.dot, { backgroundColor: c.dot }]} />
      <Text style={[Type.micro, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

export function TextField({ label, error, helper, ...props }: TextInputProps & { label: string; error?: string | null; helper?: string }) {
  return (
    <View style={{ gap: Space.sm, alignSelf: 'stretch' }}>
      <Text style={[Type.caption, { color: W.textSecondary }]}>{label}</Text>
      <TextInput
        placeholderTextColor={W.textSecondary}
        {...props}
        style={[styles.input, props.editable === false && { color: W.textSecondary }, !!error && { borderColor: W.error }]}
      />
      {error ? <Text style={[Type.caption, { color: W.error }]}>{error}</Text> : helper ? <Text style={[Type.caption, { color: W.textSecondary }]}>{helper}</Text> : null}
    </View>
  );
}

export function Stepper({ label, detail, value, min, max, onChange }: {
  label: string; detail: string; value: number; min: number; max: number; onChange: (n: number) => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <View style={{ flex: 1 }}>
        <Text style={[Type.body, { color: W.text }]}>{label}</Text>
        <Text style={[Type.caption, { color: W.textSecondary }]}>{detail}</Text>
      </View>
      <View style={styles.stepper}>
        <StepButton icon="minus" disabled={value <= min} onPress={() => onChange(value - 1)} label={`Fewer ${label.toLowerCase()}`} />
        <Text style={[Type.subheading, styles.stepValue]} accessibilityLiveRegion="polite">{value}</Text>
        <StepButton icon="plus" disabled={value >= max} onPress={() => onChange(value + 1)} label={`More ${label.toLowerCase()}`} />
      </View>
    </View>
  );
}

function StepButton({ icon, disabled, onPress, label }: { icon: 'minus' | 'plus'; disabled: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={[styles.stepButton, disabled && { opacity: 0.35 }]}>
      <Icon name={icon} />
    </Pressable>
  );
}

/** Cross-platform confirm dialog (Alert.alert has no buttons on web). */
export function ConfirmDialog({ visible, title, message, confirmLabel, destructive, loading, onConfirm, onCancel }: {
  visible: boolean; title: string; message: string; confirmLabel: string; destructive?: boolean; loading?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel="Close dialog">
        <Pressable style={styles.dialog} onPress={() => {}}>
          <Text style={[Type.heading, { color: W.text }]}>{title}</Text>
          <Text style={[Type.bodyMedium, { color: W.textSecondary }]}>{message}</Text>
          <View style={styles.dialogActions}>
            <Button label="Keep it" variant="ghost" onPress={onCancel} disabled={loading} />
            <Button label={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} loading={loading} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: { height: 52, paddingHorizontal: Space.xxl, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  dangerBorder: { borderWidth: 1, borderColor: W.border },
  badge: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingVertical: 4, paddingHorizontal: Space.md, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  input: {
    height: 52,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.card,
    backgroundColor: W.card,
    borderWidth: 1.5,
    borderColor: 'transparent',
    color: W.text,
    fontFamily: Font.regular,
    fontSize: 15,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  stepButton: { width: 44, height: 44, borderRadius: Radius.pill, borderWidth: 1, borderColor: W.border, alignItems: 'center', justifyContent: 'center' },
  stepValue: { color: W.text, minWidth: 20, textAlign: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(31, 32, 35, 0.5)', justifyContent: 'center', padding: Space.xxl },
  dialog: { backgroundColor: W.background, borderRadius: Radius.sheet, padding: Space.xxl, gap: Space.md },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Space.sm, marginTop: Space.sm },
});
