/**
 * Configuration for test users who should have automatic Pro access.
 * This whitelist is used to grant Pro status to specific email addresses
 * for testing purposes without requiring a real subscription.
 */

const PRO_WHITELIST_ENV = process.env.EXPO_PUBLIC_PRO_WHITELIST || '';

/**
 * Parse the comma-separated whitelist from environment variable.
 * Returns a Set for O(1) lookup performance.
 */
const parseWhitelist = (): Set<string> => {
  if (!PRO_WHITELIST_ENV.trim()) {
    return new Set();
  }

  const emails = PRO_WHITELIST_ENV
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);

  return new Set(emails);
};

const whitelistedEmails = parseWhitelist();

/**
 * Check if an email is in the Pro whitelist.
 * @param email - The email address to check
 * @returns true if the email is whitelisted for Pro access
 */
export const isEmailWhitelisted = (email: string | undefined | null): boolean => {
  if (!email) return false;
  return whitelistedEmails.has(email.toLowerCase().trim());
};

/**
 * Check if the current user can manually activate Pro status.
 * This is available for:
 * - Emails in the whitelist
 * - Admin email
 * - Development mode
 */
export const canActivateTestPro = (email: string | undefined | null): boolean => {
  if (__DEV__) return true;

  const adminEmail = process.env.EXPO_PUBLIC_ADMIN_EMAIL || '';
  if (email && adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) {
    return true;
  }

  return isEmailWhitelisted(email);
};
