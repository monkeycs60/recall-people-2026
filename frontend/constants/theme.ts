import { Platform } from 'react-native';

export const Colors = {
  // Backgrounds - Warm Light Mode
  background: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceHover: '#F5F0E8',

  // Text - Warm tones
  textPrimary: '#1A1612',
  textSecondary: '#6B5E54',
  textMuted: '#A69B8F',
  textInverse: '#FFFFFF',

  // Accent - Terracotta/Amber (brand principal)
  primary: '#C67C4E',
  primaryLight: '#E8D5C4',
  primaryDark: '#A65D2E',

  // Accent secondaire (bleu gris doux)
  secondary: '#6B7D8A',
  secondaryLight: '#E8ECEF',

  // Semantic
  success: '#5D8C5A',
  warning: '#D4A34A',
  error: '#C45C4A',
  info: '#5C7A8C',

  // Borders
  border: '#E8E2DB',
  borderLight: '#F2EDE6',

  // Tab bar
  tabIconDefault: '#A69B8F',
  tabIconSelected: '#C67C4E',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Fonts = {
  serif: {
    regular: 'PlayfairDisplay_400Regular',
    medium: 'PlayfairDisplay_500Medium',
    semibold: 'PlayfairDisplay_600SemiBold',
    bold: 'PlayfairDisplay_700Bold',
  },
  sans: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
};

export const Typography = {
  displayLarge: {
    fontFamily: Fonts.serif.bold,
    fontSize: 32,
    lineHeight: 40,
  },
  displayMedium: {
    fontFamily: Fonts.serif.semibold,
    fontSize: 28,
    lineHeight: 36,
  },
  headlineLarge: {
    fontFamily: Fonts.serif.semibold,
    fontSize: 24,
    lineHeight: 32,
  },
  headlineMedium: {
    fontFamily: Fonts.serif.medium,
    fontSize: 20,
    lineHeight: 28,
  },
  titleLarge: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  titleMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  labelLarge: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  labelMedium: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  labelSmall: {
    fontSize: 10,
    fontWeight: '500' as const,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
};
