import { Text, View } from 'react-native';

import { Icon } from '@/components/wayfare/primitives';
import { RemoteImage } from '@/components/wayfare/remote-image';
import { Font, Radius, themedStyles, W } from '@/constants/wayfare';
import { initialOf } from '@/lib/names';

type Props = {
  /** signed photo URL, if the user uploaded one */
  uri: string | null | undefined;
  /** first name — its first letter is shown when there's no photo */
  name: string | null | undefined;
  size?: number;
};

/** Photo → monogram (first letter of the name) → generic person icon when signed out. */
export function UserAvatar({ uri, name, size = 44 }: Props) {
  const box = { width: size, height: size, borderRadius: Radius.pill };
  if (uri) return <RemoteImage uri={uri} label={name ?? 'You'} style={box} />;

  const initial = initialOf(name);
  if (initial) {
    return (
      <View style={[box, styles.monogram]} accessibilityRole="image" accessibilityLabel={`${name}'s profile`}>
        <Text style={[styles.initial, { fontSize: size * 0.42, lineHeight: size * 0.52 }]} allowFontScaling={false}>
          {initial}
        </Text>
      </View>
    );
  }
  return (
    <View style={[box, styles.empty]}>
      <Icon name="user" color={W.textSecondary} />
    </View>
  );
}

const styles = themedStyles(() => ({
  monogram: { backgroundColor: W.dark, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: Font.semibold, color: W.textInverse, textAlign: 'center', includeFontPadding: false },
  empty: { backgroundColor: W.card, alignItems: 'center', justifyContent: 'center' },
}));
