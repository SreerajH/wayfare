import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, TextField } from '@/components/wayfare/controls';
import { BackButton, Icon } from '@/components/wayfare/primitives';
import { Font, Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';
import { readableError } from '@/lib/errors';
import { authRedirectUri, signInWithGoogle } from '@/lib/google-auth';
import { markOnboardingSeen, setAuthReturnTo } from '@/lib/onboarding';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only allow in-app paths as a return target. */
function safeReturn(returnTo: string | undefined): Href {
  return returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? (returnTo as Href) : '/';
}

export default function SignInScreen() {
  const { returnTo, error: linkError } = useLocalSearchParams<{ returnTo?: string; error?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, setOnboardingSeen } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(
    linkError === 'link' ? 'That sign-in link has expired or was opened on another device. Send a new one.' : null,
  );
  const [sending, setSending] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // signed in (OTP, Google or a deep link) → back to where the user was
  useEffect(() => {
    if (session) router.replace(safeReturn(returnTo));
  }, [session, returnTo, router]);

  const sendCode = async () => {
    const value = email.trim().toLowerCase();
    if (!EMAIL.test(value)) return setError('Enter a valid email address.');
    setError(null);
    setSending(true);
    // the email has a sign-in link (Supabase's default template) and, once custom SMTP is set up, a 6-digit code
    await setAuthReturnTo(safeReturn(returnTo) as string);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: value,
      options: { shouldCreateUser: true, emailRedirectTo: authRedirectUri },
    });
    setSending(false);
    if (otpError) return setError(await readableError(otpError));
    setEmail(value);
    setStep('code');
  };

  const google = async () => {
    setError(null);
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(await readableError(e));
    } finally {
      setGoogleBusy(false);
    }
  };

  const browse = async () => {
    await markOnboardingSeen();
    setOnboardingSeen(true);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.sm, paddingBottom: insets.bottom + Space.xxl }]}>
        {step === 'code' ? (
          <View style={{ marginLeft: -4 }}>
            <Pressable onPress={() => setStep('email')} accessibilityRole="button" accessibilityLabel="Change email" style={styles.backHit}>
              <Icon name="back" />
            </Pressable>
          </View>
        ) : router.canGoBack() ? (
          <View style={{ marginLeft: -4 }}>
            <BackButton />
          </View>
        ) : null}

        {step === 'email' ? (
          <>
            <View style={styles.logo}>
              <Text style={styles.logoText}>W</Text>
            </View>
            <View style={{ gap: Space.sm }}>
              <Text style={[Type.display, { color: W.text }]}>Welcome to Wayfare</Text>
              <Text style={[Type.body, { color: W.textSecondary }]}>Sign in to save places, book experiences and keep every ticket in one place.</Text>
            </View>

            <Pressable
              onPress={google}
              disabled={googleBusy}
              accessibilityRole="button"
              style={({ pressed }) => [styles.google, (pressed || googleBusy) && { opacity: 0.7 }]}>
              <Text style={[Type.subheading, { color: W.text }]}>G</Text>
              <Text style={[Type.bodyMedium, { color: W.text }]}>{googleBusy ? 'Opening Google…' : 'Continue with Google'}</Text>
            </Pressable>

            <View style={styles.or}>
              <View style={styles.line} />
              <Text style={[Type.caption, { color: W.textSecondary }]}>or</Text>
              <View style={styles.line} />
            </View>

            <TextField
              label="Email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError(null);
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={sendCode}
              error={error}
            />
            <Button label="Send code" onPress={sendCode} loading={sending} fill />
            <Pressable onPress={browse} accessibilityRole="button" style={styles.browse}>
              <Text style={[Type.bodyMedium, { color: W.accentStrong }]}>Not now — just browsing</Text>
            </Pressable>
            <Text style={[Type.caption, styles.terms]}>
              By continuing you agree to Wayfare&apos;s <Text style={{ color: W.accentStrong }}>Terms of Service</Text> and{' '}
              <Text style={{ color: W.accentStrong }}>Privacy Policy</Text>.
            </Text>
          </>
        ) : (
          <OtpStep email={email} onResend={sendCode} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function OtpStep({ email, onResend }: { email: string; onResend: () => Promise<void> }) {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const inputs = useRef<(ComponentRef<typeof TextInput> | null)[]>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const verify = async (code: string) => {
    setVerifying(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    setVerifying(false);
    if (verifyError) {
      setError(/expired|invalid/i.test(verifyError.message) ? 'That code is wrong or has expired. Check it or send a new one.' : await readableError(verifyError));
      setDigits(Array(CODE_LENGTH).fill(''));
      inputs.current[0]?.focus();
    }
    // success → session listener in SignInScreen navigates back
  };

  const onChange = (index: number, text: string) => {
    const clean = text.replace(/\D/g, '');
    const next = [...digits];
    if (clean.length > 1) {
      // pasted / autofilled the whole code
      clean.slice(0, CODE_LENGTH).split('').forEach((d, i) => (next[i] = d));
      setDigits(next);
      inputs.current[Math.min(clean.length, CODE_LENGTH) - 1]?.focus();
    } else {
      next[index] = clean;
      setDigits(next);
      if (clean && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus();
    }
    const code = next.join('');
    if (code.length === CODE_LENGTH && !verifying) verify(code);
  };

  return (
    <>
      <View style={{ gap: Space.sm }}>
        <Text style={[Type.display, { color: W.text }]}>Check your email</Text>
        <Text style={[Type.body, { color: W.textSecondary }]}>
          We sent a sign-in link to {email}. Open it on this phone to sign in — or, if the email has a 6-digit code, enter it below.
        </Text>
      </View>
      <View style={styles.codeRow}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(r) => {
              inputs.current[i] = r;
            }}
            value={d}
            onChangeText={(t) => onChange(i, t)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
            }}
            keyboardType="number-pad"
            textContentType={i === 0 ? 'oneTimeCode' : 'none'}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={i === 0 ? CODE_LENGTH : 1}
            autoFocus={i === 0}
            selectTextOnFocus
            editable={!verifying}
            accessibilityLabel={`Digit ${i + 1}`}
            style={[styles.codeBox, !!d && styles.codeBoxFilled, !!error && { borderColor: W.error }]}
          />
        ))}
      </View>
      {error ? <Text style={[Type.caption, { color: W.error }]}>{error}</Text> : null}
      {seconds > 0 ? (
        <Text style={[Type.bodyMedium, { color: W.textSecondary }]}>
          Resend code in <Text style={{ color: W.text }}>0:{String(seconds).padStart(2, '0')}</Text>
        </Text>
      ) : (
        <Pressable
          onPress={async () => {
            setSeconds(RESEND_SECONDS);
            await onResend();
          }}
          accessibilityRole="button"
          style={styles.browse}>
          <Text style={[Type.bodyMedium, { color: W.accentStrong }]}>Resend code</Text>
        </Pressable>
      )}
      <Button label="Verify" onPress={() => verify(digits.join(''))} loading={verifying} disabled={digits.join('').length < CODE_LENGTH} fill />
    </>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: W.background },
  content: { paddingHorizontal: Space.screenX, gap: Space.xxl, flexGrow: 1 },
  backHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 64, height: 64, borderRadius: Radius.card, backgroundColor: W.dark, alignItems: 'center', justifyContent: 'center', marginTop: Space.lg },
  logoText: { color: W.accent, fontSize: 30, fontFamily: Font.bold },
  google: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: W.border,
  },
  or: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  line: { flex: 1, height: 1, backgroundColor: W.border },
  browse: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  terms: { color: W.textSecondary, textAlign: 'center', marginTop: 'auto' },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Space.sm },
  codeBox: {
    flex: 1,
    maxWidth: 52,
    height: 56,
    borderRadius: Radius.sm,
    backgroundColor: W.card,
    borderWidth: 1.5,
    borderColor: 'transparent',
    textAlign: 'center',
    fontSize: 22,
    fontFamily: Font.semibold,
    color: W.text,
  },
  codeBoxFilled: { borderColor: W.accentStrong, backgroundColor: W.background },
}));
