export type ReviewRouteParam = string | string[] | undefined;

function getFirstNonEmptyRouteParam(value: ReviewRouteParam): string | undefined {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).find((item) => item.length > 0);
  }

  const trimmedValue = value?.trim();
  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : undefined;
}

export function resolveReviewContactId(
  routeContactId: ReviewRouteParam,
  extractedContactId: string | null | undefined
): string {
  const normalizedRouteContactId = getFirstNonEmptyRouteParam(routeContactId);
  if (normalizedRouteContactId) {
    return normalizedRouteContactId;
  }

  const normalizedExtractedContactId = extractedContactId?.trim();
  if (normalizedExtractedContactId) {
    return normalizedExtractedContactId;
  }

  return 'new';
}

export function resolveReviewStringParam(
  value: ReviewRouteParam,
  fallback = ''
): string {
  return getFirstNonEmptyRouteParam(value) ?? fallback;
}
