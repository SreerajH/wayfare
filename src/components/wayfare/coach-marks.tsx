import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

import { Font, Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';

/**
 * First-run "coach marks": the screen dims, one control at a time is spotlighted and a small
 * card explains what it does. Shown once (remembered in AsyncStorage); replayable from Profile.
 */

const STORAGE_KEY = 'wayfare.coach-marks.home.v1';

export type CoachStepId = 'search' | 'continents' | 'card' | 'nav';

const STEPS: { id: CoachStepId; title: string; body: string }[] = [
  { id: 'search', title: 'Search anything', body: 'Find a destination, tour or experience by name.' },
  { id: 'continents', title: 'Filter by continent', body: 'Tap a continent to only see trips in that part of the world.' },
  {
    id: 'card',
    title: 'Explore or save',
    body: 'Tap “Explore destination” for highlights and bookable trips. Tap ♡ to keep it in Saved.',
  },
  {
    id: 'nav',
    title: 'Get around',
    body: 'Trips holds your bookings and tickets, Saved keeps your favourites, Profile has your account.',
  },
];

type Box = { x: number; y: number; width: number; height: number };
// RN 0.88: a View ref is the host element instance, not the View component type
type ViewHandle = ComponentRef<typeof View>;
type TargetRef = RefObject<ViewHandle | null>;

type CoachContext = {
  register: (id: CoachStepId, ref: TargetRef) => () => void;
  /** Starts the tour if it hasn't been seen yet. Safe to call repeatedly. */
  start: () => void;
  /** Forget that the tour was seen; it plays again next time Home is opened. */
  reset: () => Promise<void>;
};

const Ctx = createContext<CoachContext | null>(null);

function measure(ref: TargetRef) {
  return new Promise<Box | null>((resolve) => {
    const node = ref.current;
    if (!node) return resolve(null);
    node.measureInWindow((x: number, y: number, width: number, height: number) => resolve(width > 0 && height > 0 ? { x, y, width, height } : null));
  });
}

export function CoachMarksProvider({ children }: { children: ReactNode }) {
  const targets = useRef(new Map<CoachStepId, TargetRef>());
  const seen = useRef<boolean | null>(null); // null = not read from storage yet
  const running = useRef(false);
  const [active, setActive] = useState<{ index: number; rect: Box } | null>(null);

  const finish = useCallback(() => {
    running.current = false;
    seen.current = true;
    setActive(null);
    AsyncStorage.setItem(STORAGE_KEY, '1').catch(() => {});
  }, []);

  const show = useCallback(
    async (from: number) => {
      for (let i = from; i < STEPS.length; i++) {
        const ref = targets.current.get(STEPS[i].id);
        const rect = ref ? await measure(ref) : null;
        if (rect) return setActive({ index: i, rect });
      }
      finish();
    },
    [finish],
  );

  const start = useCallback(() => {
    if (running.current || seen.current === true) return;
    running.current = true;
    (async () => {
      if (seen.current === null) {
        try {
          seen.current = (await AsyncStorage.getItem(STORAGE_KEY)) === '1';
        } catch {
          seen.current = true; // storage unavailable → never block the app
        }
      }
      if (seen.current) {
        running.current = false;
        return;
      }
      await new Promise((r) => setTimeout(r, 700)); // let images and the carousel settle
      show(0);
    })();
  }, [show]);

  const value = useMemo<CoachContext>(
    () => ({
      register: (id, ref) => {
        targets.current.set(id, ref);
        return () => {
          if (targets.current.get(id) === ref) targets.current.delete(id);
        };
      },
      start,
      reset: async () => {
        seen.current = false;
        running.current = false;
        await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      },
    }),
    [start],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {active ? (
        <CoachOverlay
          step={active.index}
          rect={active.rect}
          onNext={() => (active.index + 1 < STEPS.length ? show(active.index + 1) : finish())}
          onSkip={finish}
        />
      ) : null}
    </Ctx.Provider>
  );
}

export function useCoachMarks() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCoachMarks must be used inside <CoachMarksProvider>');
  return ctx;
}

/** Ref to put on the element a step should spotlight. */
export function useCoachTarget(id: CoachStepId) {
  const ref = useRef<ViewHandle | null>(null);
  const { register } = useCoachMarks();
  useEffect(() => register(id, ref), [id, register]);
  return ref;
}

/** Wrapper version of useCoachTarget for elements you can't put a ref on directly. */
export function CoachTarget({ id, children, style }: { id: CoachStepId; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useCoachTarget(id);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}

const HOLE_PAD = 8;
const CARD_MAX = 320;
const EDGE = 20;

function CoachOverlay({ step, rect, onNext, onSkip }: { step: number; rect: Box; onNext: () => void; onSkip: () => void }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setSize(e.nativeEvent.layout);

  const hole = {
    x: rect.x - HOLE_PAD,
    y: rect.y - HOLE_PAD,
    width: rect.width + HOLE_PAD * 2,
    height: rect.height + HOLE_PAD * 2,
  };
  const radius = Math.min(24, hole.height / 2);
  const { title, body } = STEPS[step];
  const last = step === STEPS.length - 1;

  let card: ViewStyle | null = null;
  let arrowLeft = 0;
  let below = true;
  if (size) {
    const cardWidth = Math.min(CARD_MAX, size.width - EDGE * 2);
    const centerX = hole.x + hole.width / 2;
    const left = Math.max(EDGE, Math.min(centerX - cardWidth / 2, size.width - EDGE - cardWidth));
    below = hole.y + hole.height / 2 < size.height * 0.55;
    arrowLeft = Math.max(16, Math.min(centerX - left - 7, cardWidth - 30));
    card = below
      ? { left, width: cardWidth, top: hole.y + hole.height + 14 }
      : { left, width: cardWidth, bottom: size.height - hole.y + 14 };
  }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[StyleSheet.absoluteFill, styles.root]}
      onLayout={onLayout}
      accessibilityViewIsModal>
      {size ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={onNext} accessibilityLabel="Next tip">
          <Svg width={size.width} height={size.height}>
            <Defs>
              <Mask id="coach-hole">
                <Rect x={0} y={0} width={size.width} height={size.height} fill="#fff" />
                <Rect x={hole.x} y={hole.y} width={hole.width} height={hole.height} rx={radius} fill="#000" />
              </Mask>
            </Defs>
            <Rect x={0} y={0} width={size.width} height={size.height} fill="rgba(12, 13, 14, 0.74)" mask="url(#coach-hole)" />
            <Rect
              x={hole.x}
              y={hole.y}
              width={hole.width}
              height={hole.height}
              rx={radius}
              fill="none"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth={2}
            />
          </Svg>
        </Pressable>
      ) : null}

      {card ? (
        <Animated.View key={step} entering={FadeInDown.duration(220)} style={[styles.card, card]} accessibilityLiveRegion="polite">
          <View style={[styles.arrow, below ? styles.arrowTop : styles.arrowBottom, { left: arrowLeft }]} />
          <Text style={[Type.micro, { color: W.textSecondary }]}>
            {step + 1} of {STEPS.length}
          </Text>
          <Text style={[Type.subheading, { color: W.text }]}>{title}</Text>
          <Text style={[Type.caption, { color: W.textSecondary, fontSize: 14, lineHeight: 20 }]}>{body}</Text>
          <View style={styles.actions}>
            {!last ? (
              <Pressable onPress={onSkip} accessibilityRole="button" hitSlop={8} style={styles.skip}>
                <Text style={[Type.bodyMedium, { color: W.textSecondary }]}>Skip</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onNext} accessibilityRole="button" style={styles.next}>
              <Text style={styles.nextLabel}>{last ? 'Got it' : 'Next'}</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = themedStyles(() => ({
  root: { zIndex: 900, elevation: 900 },
  card: {
    position: 'absolute',
    backgroundColor: W.background,
    borderRadius: Radius.card,
    padding: Space.lg,
    gap: 4,
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
  },
  arrow: {
    position: 'absolute',
    width: 14,
    height: 14,
    backgroundColor: W.background,
    transform: [{ rotate: '45deg' }],
  },
  arrowTop: { top: -6 },
  arrowBottom: { bottom: -6 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: Space.lg, marginTop: Space.md },
  skip: { paddingVertical: Space.sm },
  next: { backgroundColor: W.dark, borderRadius: Radius.pill, paddingHorizontal: Space.xl, height: 40, justifyContent: 'center' },
  nextLabel: { fontFamily: Font.semibold, fontSize: 14, color: W.textInverse },
}));
