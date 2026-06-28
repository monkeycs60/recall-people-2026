const PRODUCTION_API_HOST = 'api.recallpeople.com';

/**
 * Upgrade legacy cleartext avatar URLs to HTTPS for the production API host.
 *
 * Avatars generated/uploaded between the Workers→Node migration (2026-06-22) and
 * the backend fix were handed back as `http://api.recallpeople.com/...` (the Node
 * server sits behind a TLS-terminating proxy and saw plain HTTP). iOS ATS and
 * Android cleartext policy block those on release builds, so the `<Image>` fails
 * and the contact shows the initials placeholder. The image itself exists at the
 * same path over HTTPS, so upgrading the scheme repairs already-stored URLs with
 * no migration or re-generation.
 *
 * Only the production host is upgraded — local/dev hosts (`localhost`, `10.0.2.2`,
 * LAN IPs) are left as HTTP, since cleartext is allowed in dev builds and those
 * hosts have no HTTPS endpoint.
 */
export function normalizeAvatarUrl(url?: string | null): string | undefined {
  if (!url) {
    return undefined;
  }

  const cleartextPrefix = `http://${PRODUCTION_API_HOST}`;
  if (url === cleartextPrefix || url.startsWith(`${cleartextPrefix}/`)) {
    return `https://${PRODUCTION_API_HOST}${url.slice(cleartextPrefix.length)}`;
  }

  return url;
}
