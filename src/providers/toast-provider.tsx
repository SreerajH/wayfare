import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Space, Type, W } from '@/constants/wayfare';

type Toast = { id: number; message: string; tone: 'error' | 'info' };
const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, tone: Toast['tone'] = 'error') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setToast(null));
    }, 3200);
    return () => clearTimeout(t);
  }, [toast, opacity]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[styles.toast, { opacity, bottom: insets.bottom + 96 }, toast.tone === 'error' && styles.error]}>
          <Text style={[Type.bodyMedium, { color: W.textInverse }]}>{toast.message}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Space.screenX,
    right: Space.screenX,
    paddingVertical: Space.md,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.card,
    backgroundColor: W.dark,
  },
  error: { backgroundColor: '#B42318' },
});
