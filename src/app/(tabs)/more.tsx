import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { useCoachMarks } from '@/components/wayfare/coach-marks';
import { ConfirmDialog } from '@/components/wayfare/controls';
import { Icon, type ICONS } from '@/components/wayfare/primitives';
import { SignInPrompt } from '@/components/wayfare/sign-in-prompt';
import { UserAvatar } from '@/components/wayfare/user-avatar';
import { BottomTabInset } from '@/constants/theme';
import { Radius, Space, Type, W } from '@/constants/wayfare';
import { useAvatarUrl } from '@/hooks/use-profile';
import { readableError } from '@/lib/errors';
import { firstNameFor } from '@/lib/names';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { session, user, profile, signOut } = useAuth();
  const coach = useCoachMarks();
  const avatarUrl = useAvatarUrl(profile?.avatar_url);
  const [confirmOut, setConfirmOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!session) {
    return (
      <SignInPrompt
        title="Profile"
        icon="user"
        heading="Your Wayfare account"
        message="Sign in to manage your profile, trips and saved places."
        returnTo="/more"
      />
    );
  }

  const firstName = firstNameFor(profile?.full_name, user);
  const name = profile?.full_name?.trim() || firstName || 'Traveler';
  const replayTips = async () => {
    await coach.reset();
    router.navigate('/');
  };
  const logOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setConfirmOut(false);
      router.replace('/');
    } catch (e) {
      toast(await readableError(e));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + Space.sm, paddingBottom: insets.bottom + BottomTabInset + Space.xxl, paddingHorizontal: Space.screenX, gap: Space.xxl }}>
      <Text style={[Type.display, { color: W.text }]}>Profile</Text>

      <View style={styles.profile}>
        <UserAvatar uri={avatarUrl} name={firstName} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[Type.subheading, { color: W.text }]} numberOfLines={1}>{name}</Text>
          <Text style={[Type.caption, { color: W.textSecondary }]} numberOfLines={1}>{user?.email}</Text>
          <Pressable onPress={() => router.push('/profile/edit')} accessibilityRole="link" style={styles.editLink}>
            <Text style={[Type.bodyMedium, { color: W.accentStrong }]}>Edit profile</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.list}>
        <Row icon="user" label="Edit profile" onPress={() => router.push('/profile/edit')} />
        <Row icon="calendar" label="My trips" onPress={() => router.push('/trips')} />
        <Row icon="heart" label="Saved places" onPress={() => router.push('/saved')} />
        <Row icon="bell" label="Notifications" onPress={() => router.push('/notifications')} />
        <Row icon="tips" label="Replay app tips" onPress={replayTips} />
        <Row icon="location" label="Replay intro" onPress={() => router.push('/onboarding')} />
        <Row icon="help" label="Help & support" onPress={() => toast('Help & support is coming soon.', 'info')} last />
      </View>

      <Pressable onPress={() => setConfirmOut(true)} accessibilityRole="button" style={styles.row}>
        <Icon name="logout" color={W.error} />
        <Text style={[Type.body, { color: W.error, flex: 1 }]}>Log out</Text>
      </Pressable>

      <Text style={[Type.micro, styles.version]}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>

      <ConfirmDialog
        visible={confirmOut}
        title="Log out?"
        message="You'll need to sign in again to see your trips and saved places."
        confirmLabel="Log out"
        destructive
        loading={signingOut}
        onConfirm={logOut}
        onCancel={() => setConfirmOut(false)}
      />
    </ScrollView>
  );
}

function Row({ icon, label, onPress, last }: { icon: keyof typeof ICONS; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.row, !last && styles.divider]}>
      <Icon name={icon} />
      <Text style={[Type.body, { color: W.text, flex: 1 }]}>{label}</Text>
      <Icon name="chevronRight" color={W.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: W.background },
  profile: { flexDirection: 'row', alignItems: 'center', gap: Space.lg },
  editLink: { minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' },
  list: { borderRadius: Radius.card, borderWidth: 1, borderColor: W.border, paddingHorizontal: Space.lg },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: Space.lg },
  divider: { borderBottomWidth: 1, borderBottomColor: W.border },
  version: { color: W.textSecondary, textAlign: 'center' },
});
