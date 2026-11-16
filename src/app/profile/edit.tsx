import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, TextField } from '@/components/wayfare/controls';
import { BackButton, Icon, LoadingState } from '@/components/wayfare/primitives';
import { RemoteImage } from '@/components/wayfare/remote-image';
import { Radius, Space, Type, W } from '@/constants/wayfare';
import { useAvatarUrl, useUpdateProfile, useUploadAvatar } from '@/hooks/use-profile';
import { readableError } from '@/lib/errors';
import { firstNameFor } from '@/lib/names';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';
import type { Tables } from '@/types/database';

const PHONE = /^\+?[0-9 ()-]{7,20}$/;

export default function EditProfileScreen() {
  const { profile } = useAuth();
  // wait for the profile so the form starts with the saved values
  if (!profile) return <LoadingState height={500} />;
  return <EditProfileForm profile={profile} />;
}

function EditProfileForm({ profile }: { profile: Tables<'profiles'> }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const update = useUpdateProfile();
  const upload = useUploadAvatar();
  const [name, setName] = useState(profile.full_name ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [picked, setPicked] = useState<{ uri: string; mimeType?: string | null } | null>(null);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const savedAvatar = useAvatarUrl(profile.avatar_url);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setPicked({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
  };

  const save = async () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Enter your name.';
    if (phone.trim() && !PHONE.test(phone.trim())) next.phone = 'Enter a valid phone number, e.g. +91 98765 43210.';
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      const avatar_url = picked ? await upload.mutateAsync(picked) : undefined;
      await update.mutateAsync({ full_name: name.trim(), phone: phone.trim() || null, ...(avatar_url ? { avatar_url } : {}) });
      toast('Profile saved', 'info');
      router.back();
    } catch (e) {
      toast(await readableError(e));
    }
  };

  const busy = upload.isPending || update.isPending;
  const shown = picked?.uri ?? savedAvatar;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.sm, paddingBottom: insets.bottom + Space.xxl }]}>
        <View style={styles.header}>
          <BackButton />
          <Text style={[Type.heading, { color: W.text }]}>Edit profile</Text>
          <View style={{ width: 44 }} />
        </View>

        <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel="Change photo" style={styles.avatarWrap}>
          {shown ? (
            <RemoteImage uri={shown} label={name || 'You'} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Icon name="user" size={40} color={W.accentStrong} />
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Icon name="camera" size={18} color={W.textInverse} />
          </View>
        </Pressable>
        <Pressable onPress={pickPhoto} accessibilityRole="button" style={styles.changePhoto}>
          <Text style={[Type.bodyMedium, { color: W.accentStrong }]}>Change photo</Text>
        </Pressable>

        <TextField
          label="Full name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          placeholder={profile.full_name ? undefined : (firstNameFor(null, user) ?? 'Your name')}
          error={errors.name}
        />
        <TextField label="Email" value={user?.email ?? ''} editable={false} helper="Your email is used to sign in and can't be changed here." />
        <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="+91 98765 43210" error={errors.phone} />

        <Button label="Save changes" onPress={save} loading={busy} fill />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: W.background },
  content: { paddingHorizontal: Space.screenX, gap: Space.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: -4 },
  avatarWrap: { alignSelf: 'center', width: 104, height: 104 },
  avatar: { width: 96, height: 96, borderRadius: Radius.pill },
  avatarEmpty: { backgroundColor: W.accentSoft, alignItems: 'center', justifyContent: 'center' },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: W.accentStrong,
    borderWidth: 2,
    borderColor: W.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhoto: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: -Space.md },
});
