/**
 * The origin the browser actually used. `request.url` is not reliable behind a proxy
 * or in the standalone Docker server (it reports http://0.0.0.0:3000), so prefer the
 * forwarded / Host headers.
 */
export function publicOrigin(request: Request): string {
  const headers = request.headers;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) return new URL(request.url).origin;
  const proto = headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return `${proto.split(",")[0]?.trim() || "http"}://${host.split(",")[0]?.trim()}`;
}
