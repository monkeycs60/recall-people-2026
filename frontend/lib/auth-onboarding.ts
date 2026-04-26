export type AuthOnboardingResult = {
  isNewUser?: boolean;
};

type AuthOnboardingOptions = {
  assumeNewUserWhenMissing?: boolean;
};

export function shouldResetFirstRunSettings(
  result: AuthOnboardingResult,
  options: AuthOnboardingOptions = {},
) {
  return result.isNewUser ?? options.assumeNewUserWhenMissing ?? false;
}
