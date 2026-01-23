import { Platform } from 'react-native';

export const Colors = {
  // Backgrounds - Pop Friendly
  background: '#F8F7F4', // crème chaud
  surface: '#FFFFFF', // cards, modals
  surfaceElevated: '#FFFFFF',
  surfaceAlt: '#F1F0ED', // zones secondaires, séparateurs

  // Text - Bold & Clear
  textPrimary: '#1A1A1A',
  textSecondary: '#57534E',
  textMuted: '#A8A29E',
  textInverse: '#FFFFFF',

  // Primary - Teal (brand principal)
  primary: '#14B8A6', // teal
  primaryLight: '#CCFBF1', // teal light
  primaryDark: '#0D9488', // teal dark (hover)

  // Pastels Avatars
  jaune: '#FEF3C7', // background avatar, tags
  peche: '#FFEDD5', // background avatar, tags
  menthe: '#D1FAE5', // background avatar, success
  lavande: '#EDE9FE', // background avatar, tags

  // Accent secondaire (keep for compatibility)
  secondary: '#14B8A6', // aligned with primary teal
  secondaryLight: '#CCFBF1',

  // Semantic
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#14B8A6', // = teal (cohérence)

  // Borders - Flat & Bold style
  border: '#1A1A1A', // noir pour style flat & bold
  borderLight: '#E7E5E4',

  // Tab bar
  tabIconDefault: '#A8A29E',
  tabIconSelected: '#14B8A6', // teal
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
  // @deprecated - Playfair Display is being phased out for Pop art direction
  serif: {
    regular: 'PlayfairDisplay_400Regular',
    medium: 'PlayfairDisplay_500Medium',
    semibold: 'PlayfairDisplay_600SemiBold',
    bold: 'PlayfairDisplay_700Bold',
  },
  // Plus Jakarta Sans - Primary font for Pop art direction
  sans: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semibold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
  },
  // System font fallback
  system: Platform.select({
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
