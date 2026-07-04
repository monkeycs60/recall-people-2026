const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PAST_DAYS = 30;
const MAX_FUTURE_YEARS = 2;

export function sanitizeEventDate(
	eventDate: string | null | undefined,
	now: Date
): string | undefined {
	if (!eventDate || !ISO_DATE_PATTERN.test(eventDate)) {
		return undefined;
	}

	const parsed = new Date(`${eventDate}T00:00:00Z`);
	if (Number.isNaN(parsed.getTime())) {
		return undefined;
	}
	if (parsed.toISOString().slice(0, 10) !== eventDate) {
		return undefined;
	}

	const pastLimit = new Date(now);
	pastLimit.setUTCDate(pastLimit.getUTCDate() - MAX_PAST_DAYS);
	const futureLimit = new Date(now);
	futureLimit.setUTCFullYear(futureLimit.getUTCFullYear() + MAX_FUTURE_YEARS);

	if (parsed.getTime() < pastLimit.getTime() || parsed.getTime() > futureLimit.getTime()) {
		return undefined;
	}

	return eventDate;
}
