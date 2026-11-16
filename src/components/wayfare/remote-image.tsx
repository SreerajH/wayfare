import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Font, W } from '@/constants/wayfare';

// Soft grey-green (#D9E6E1) shown while a photo loads — one shared hash until per-image hashes are stored.
const PLACEHOLDER_BLURHASH = '00O|^I';

// Wikimedia asks hotlinking clients to identify themselves; only send this to their host.
const WIKIMEDIA_HEADERS = { 'User-Agent': 'Wayfare/1.0 (com.sreerajh.wayfare)' };

type Props = {
  uri: string | null | undefined;
  /** Shown on the fallback when the image is missing or fails to load. */
  label: string;
  style?: StyleProp<ViewStyle>;
};

/** Photo from Storage (or Wikimedia): blur placeholder, memory+disk cache, calm neutral fallback. */
export function RemoteImage({ uri, label, style }: Props) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[styles.fallback, style]} accessibilityRole="image" accessibilityLabel={label}>
        <Text style={styles.fallbackText} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.loading, style]}>
      <Image
        source={{ uri, headers: /wikimedia\.org/.test(uri) ? WIKIMEDIA_HEADERS : undefined }}
        placeholder={{ blurhash: PLACEHOLDER_BLURHASH }}
        placeholderContentFit="cover"
        cachePolicy="memory-disk"
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={250}
        accessibilityLabel={label}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { backgroundColor: W.card, overflow: 'hidden' },
  fallback: {
    backgroundColor: W.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackText: {
    color: W.textSecondary,
    opacity: 0.4,
    fontFamily: Font.bold,
    fontSize: 28,
    paddingHorizontal: 12,
  },
});
