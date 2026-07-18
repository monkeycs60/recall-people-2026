/**
 * Resolve the public base URL (`scheme://host`) to embed in URLs we hand back to
 * clients (e.g. avatar image URLs).
 *
 * The API runs behind Coolify's TLS-terminating reverse proxy (Traefik), which forwards
 * plain HTTP to Node, so `new URL(c.req.url).protocol` is `http:`. Building an
 * absolute URL from that yields `http://api.recallpeople.com/...`, which iOS ATS
 * and Android cleartext policy block on release builds → the image silently fails
 * to load and the app falls back to the initials placeholder.
 *
 * The proxy exposes the real client scheme via `X-Forwarded-Proto` (the same
 * header `httpsEnforcement` already relies on), so we honor it here.
 *
 * Precedence: explicit `configuredBaseUrl` (AVATARS_PUBLIC_URL) > X-Forwarded-Proto
 * > the request's own protocol (correct in local dev, where there is no proxy).
 */
export function resolvePublicBaseUrl(args: {
  requestUrl: string;
  forwardedProto?: string | null;
  configuredBaseUrl?: string | null;
}): string {
  const configured = args.configuredBaseUrl?.trim().replace(/\/+$/, '');
  if (configured) {
    return configured;
  }

  const url = new URL(args.requestUrl);
  const forwarded = args.forwardedProto?.split(',')[0]?.trim();
  const protocol = (forwarded || url.protocol.replace(/:$/, '')).toLowerCase();

  return `${protocol}://${url.host}`;
}
