import { Platform } from 'react-native';

export const Colors = {
  // Backgrounds — Memory Pop
  background: '#F4F2FB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceAlt: '#EBE7F7',

  // Text — Ink hierarchy
  textPrimary: '#1D1A2E',
  textSecondary: '#524F66',
  textMuted: '#8E8AA3',
  textInverse: '#FFFFFF',

  // Primary — Indigo
  primary: '#5B3DF5',
  primaryLight: '#E8E2FE',
  primaryDark: '#4328D0',

  // Accent — Coral
  accent: '#FF6B4A',
  accentLight: '#FFE4DC',

  // Mint — Success / Confirm
  mint: '#2ECC8B',
  mintLight: '#D4F5E5',

  // Amber — Calendar / Events
  amber: '#F5A623',
  amberLight: '#FFF0D6',

  // Hairlines
  hairline: 'rgba(29,26,46,0.08)',
  hairlineStrong: 'rgba(29,26,46,0.16)',

  // Semantic (états)
  success: '#2ECC8B',
  successLight: '#D4F5E5',
  warning: '#F5A623',
  error: '#EF4444',
  info: '#5B3DF5',

  // Voice/Recording — kept for compatibility, now maps to primary
  voice: '#2ECC8B',
  voiceLight: '#D4F5E5',
  voiceDark: '#059669',

  // Calendar/Events — Amber
  calendar: '#F5A623',
  calendarLight: '#FFF0D6',
  calendarDark: '#D97706',

  // AI/Assistant — Violet (= primary)
  ai: '#5B3DF5',
  aiLight: '#E8E2FE',
  aiDark: '#4328D0',

  // Legacy color aliases — kept for backward compat
  jaune: '#FFF0D6',
  peche: '#FFE4DC',
  menthe: '#D4F5E5',
  lavande: '#E8E2FE',

  // Borders
  border: 'rgba(29,26,46,0.08)',
  borderLight: 'rgba(29,26,46,0.08)',

  // Tab bar
  tabIconDefault: '#8E8AA3',
  tabIconSelected: '#5B3DF5',
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
  xl: 20,
  '2xl': 28,
  full: 9999,
};

export const Shadows = {
  card: {
    shadowColor: '#1D1A2E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  elevated: {
    shadowColor: '#1D1A2E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  floating: {
    shadowColor: '#1D1A2E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 8,
  },
  fab: {
    shadowColor: '#5B3DF5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
  },
};

export const Fonts = {
  serif: {
    regular: 'PlayfairDisplay_400Regular',
    medium: 'PlayfairDisplay_500Medium',
    semibold: 'PlayfairDisplay_600SemiBold',
    bold: 'PlayfairDisplay_700Bold',
  },
  sans: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semibold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
  },
  system: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
};

export const Typography = {
  display: {
    fontFamily: Fonts.sans.bold,
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 33,
  },
  heroName: {
    fontFamily: Fonts.sans.bold,
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  title: {
    fontFamily: Fonts.sans.bold,
    fontSize: 18,
    letterSpacing: -0.3,
    lineHeight: 23,
  },
  titleLarge: {
    fontFamily: Fonts.sans.bold,
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 29,
  },
  titleMedium: {
    fontFamily: Fonts.sans.semibold,
    fontSize: 16,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  bodyLarge: {
    fontFamily: Fonts.sans.semibold,
    fontSize: 16,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: Fonts.sans.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  bodySmall: {
    fontFamily: Fonts.sans.medium,
    fontSize: 13,
    lineHeight: 20,
  },
  caption: {
    fontFamily: Fonts.sans.semibold,
    fontSize: 12,
    lineHeight: 17,
  },
  meta: {
    fontFamily: Fonts.sans.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
  },
  // Legacy aliases
  displayLarge: {
    fontFamily: Fonts.sans.bold,
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 33,
  },
  displayMedium: {
    fontFamily: Fonts.sans.bold,
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  headlineLarge: {
    fontFamily: Fonts.sans.bold,
    fontSize: 24,
    lineHeight: 31,
  },
  headlineMedium: {
    fontFamily: Fonts.sans.semibold,
    fontSize: 20,
    lineHeight: 28,
  },
  labelLarge: {
    fontFamily: Fonts.sans.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: Fonts.sans.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: Fonts.sans.bold,
    fontSize: 10.5,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
};
