/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
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

        // Accent - Terracotta/Amber
        primary: '#C67C4E',
        primaryLight: '#E8D5C4',
        primaryDark: '#A65D2E',

        // Semantic
        success: '#5D8C5A',
        warning: '#D4A34A',
        error: '#C45C4A',
        info: '#5C7A8C',

        // Borders
        border: '#E8E2DB',
        borderLight: '#F2EDE6',
      },
      fontFamily: {
        serif: ['PlayfairDisplay_400Regular', 'Georgia', 'serif'],
        'serif-medium': ['PlayfairDisplay_500Medium', 'Georgia', 'serif'],
        'serif-semibold': ['PlayfairDisplay_600SemiBold', 'Georgia', 'serif'],
        'serif-bold': ['PlayfairDisplay_700Bold', 'Georgia', 'serif'],
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(26, 22, 18, 0.05)',
        'md': '0 4px 12px rgba(26, 22, 18, 0.08)',
        'lg': '0 8px 24px rgba(26, 22, 18, 0.12)',
        'xl': '0 16px 48px rgba(26, 22, 18, 0.16)',
      },
    },
  },
  plugins: [],
};
