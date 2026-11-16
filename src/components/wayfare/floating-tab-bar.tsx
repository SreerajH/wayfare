import type { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCoachTarget } from '@/components/wayfare/coach-marks';
import { TabBarHeight } from '@/constants/theme';
import { Font, Radius, W } from '@/constants/wayfare';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
type SymbolName = ComponentProps<typeof SymbolView>['name'];

const TABS: Record<string, { label: string; icon: SymbolName; activeIcon: SymbolName }> = {
  index: {
    label: 'Home',
    icon: { ios: 'house', android: 'home', web: 'home' },
    activeIcon: { ios: 'house.fill', android: 'home', web: 'home' },
  },
  trips: {
    label: 'Trips',
    icon: { ios: 'suitcase', android: 'luggage', web: 'luggage' },
    activeIcon: { ios: 'suitcase.fill', android: 'luggage', web: 'luggage' },
  },
  saved: {
    label: 'Saved',
    icon: { ios: 'heart', android: 'favorite_border', web: 'favorite_border' },
    activeIcon: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  },
  more: {
    label: 'Profile',
    icon: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
    activeIcon: { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
  },
};

const INACTIVE = 'rgba(255, 255, 255, 0.64)'; // ≈ 7:1 on the charcoal bar

/**
 * Floating charcoal pill (from the Figma nav), now with a label under every icon.
 * The active tab gets a mint pill behind its icon and a white label.
 */
export function FloatingTabBar({ state, descriptors, emitter, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const coachRef = useCoachTarget('nav');

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 8 }]}>
      <View ref={coachRef} collapsable={false} style={styles.bar} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === index;
          const { options } = descriptors[route.key];

          // same contract as expo-router 58's built-in BottomTabBar (emitter + navigateToTab)
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          return (
            <TabItem
              key={route.key}
              label={tab.label}
              icon={focused ? tab.activeIcon : tab.icon}
              focused={focused}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? tab.label}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({
  label,
  icon,
  focused,
  onPress,
  onLongPress,
  accessibilityLabel,
}: {
  label: string;
  icon: SymbolName;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel: string;
}) {
  const pill = useAnimatedStyle(
    () => ({
      opacity: withTiming(focused ? 1 : 0, { duration: 180 }),
      transform: [{ scaleX: withSpring(focused ? 1 : 0.5, { damping: 16, stiffness: 240 }) }],
    }),
    [focused],
  );

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, pill]} />
        <SymbolView name={icon} size={22} tintColor={focused ? W.textInverse : INACTIVE} />
      </View>
      <Text style={[styles.label, { color: focused ? W.textInverse : INACTIVE }]} numberOfLines={1} allowFontScaling={false}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20, alignItems: 'center' },
  bar: {
    width: '100%',
    maxWidth: 440,
    height: TabBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderRadius: Radius.pill,
    backgroundColor: W.dark,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.28)',
  },
  item: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  iconWrap: { width: 56, height: 30, alignItems: 'center', justifyContent: 'center' },
  pill: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(39, 193, 151, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(39, 193, 151, 0.55)',
  },
  label: { fontFamily: Font.medium, fontSize: 12, lineHeight: 15 },
});
