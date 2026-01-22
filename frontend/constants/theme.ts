import { Platform } from 'react-native';

export const Colors = {
  // Backgrounds - Pop Style
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceHover: '#FFF9F5', // crème

  // Text - Bold & Clear
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Primary - Corail (brand principal)
  primary: '#FF7F6B', // corail
  primaryLight: '#FFDAB3', // pêche
  primaryDark: '#E86B58', // corail hover

  // Pastels secondaires
  rose: '#FFB5C5', // rose bonbon
  menthe: '#7DDEC3', // menthe
  bleuCiel: '#7EC8E8', // bleu ciel
  peche: '#FFDAB3', // pêche clair

  // Accent secondaire (keep for compatibility)
  secondary: '#7EC8E8', // bleu ciel
  secondaryLight: '#E8F4F8',

  // Semantic
  success: '#7DDEC3', // menthe
  successLight: '#E5F7F2',
  warning: '#FFDAB3', // pêche
  error: '#E86B58', // corail dark
  info: '#7EC8E8', // bleu ciel

  // Borders - Flat & Bold style
  border: '#1A1A1A', // noir pour style flat & bold
  borderLight: '#E5E5E5',

  // Tab bar
  tabIconDefault: '#9CA3AF',
  tabIconSelected: '#FF7F6B', // corail
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
  // Will be replaced by Plus Jakarta Sans (requires expo font installation)
  serif: {
    regular: 'PlayfairDisplay_400Regular',
    medium: 'PlayfairDisplay_500Medium',
    semibold: 'PlayfairDisplay_600SemiBold',
    bold: 'PlayfairDisplay_700Bold',
  },
  // TODO: Install Plus Jakarta Sans via expo-google-fonts
  // import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
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
