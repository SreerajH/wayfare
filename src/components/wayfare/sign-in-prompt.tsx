import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, type ICONS } from '@/components/wayfare/primitives';
import { BottomTabInset } from '@/constants/theme';
import { Space, themedStyles, Type, W } from '@/constants/wayfare';

/** Shown on Trips / Saved / Profile when signed out; Sign in returns to this tab. Centred above the floating tab bar. */
export function SignInPrompt({ title, heading, message, icon, returnTo }: {
  title: string; heading: string; message: string; icon: keyof typeof ICONS; returnTo: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + Space.sm, paddingBottom: insets.bottom + BottomTabInset }]}>
      <Text style={[Type.display, styles.title]}>{title}</Text>
      <View style={styles.center}>
        <EmptyState
          height={320}
          icon={icon}
          title={heading}
          message={message}
          actionLabel="Sign in"
          onAction={() => router.push({ pathname: '/sign-in', params: { returnTo } })}
        />
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: W.background },
  title: { color: W.text, paddingHorizontal: Space.screenX },
  center: { flex: 1, justifyContent: 'center' },
}));
