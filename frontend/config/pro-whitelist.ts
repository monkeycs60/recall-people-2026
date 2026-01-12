/**
 * Check if the current user can manually activate Pro status.
 * This is available for:
 * - Admin email
 * - Development mode
 * - Users already marked as test Pro (via API whitelist check)
 */
export const canActivateTestPro = (
	email: string | undefined | null,
	isTestPro: boolean
): boolean => {
	if (__DEV__) return true;

	const adminEmail =
		process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'marc@mail.com' || '';
	if (
		email &&
		adminEmail &&
		email.toLowerCase() === adminEmail.toLowerCase()
	) {
		return true;
	}

	return isTestPro;
};
