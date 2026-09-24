const BASE64_PREFIX = "b64_";

function decodeBase64Url(value: string): string | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = globalThis.atob(padded);
    return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  } catch {
    return null;
  }
}

/**
 * Workspace id from a Paseo host route (`/h/<server>/workspace/<id>[/…]`), mirroring
 * `decodeWorkspaceIdFromPathSegment` in `packages/app/src/utils/host-routes.ts`.
 */
export function workspaceIdFromPath(pathname: string): string | null {
  const match = pathname.split(/[?#]/)[0]?.match(/^\/h\/[^/]+\/workspace\/([^/]+)/);
  if (!match?.[1]) return null;
  let segment: string;
  try {
    segment = decodeURIComponent(match[1]).trim();
  } catch {
    return null;
  }
  if (!segment) return null;
  if (segment.startsWith(BASE64_PREFIX)) return decodeBase64Url(segment.slice(BASE64_PREFIX.length))?.trim() || null;
  return segment;
}
