import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { Font } from '@/constants/wayfare';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Font.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Font.bold,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Font.medium,
  },
  title: {
    fontSize: 48,
    fontFamily: Font.semibold,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontFamily: Font.semibold,
  },
  link: {
    fontFamily: Font.regular,
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: Font.regular,
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono, // system monospace — a real weight, not a custom font
    fontSize: 12,
  },
});
