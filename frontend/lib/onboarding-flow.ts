export const ONBOARDING_SLIDES = [
  { id: 0, key: 'language', type: 'language' },
] as const;

export type OnboardingSlide = (typeof ONBOARDING_SLIDES)[number];
