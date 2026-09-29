export interface ProjectRef {
  key: string;
  label: string;
}

/**
 * Normalize a git remote URL to `host/owner/repo` so SSH, HTTPS, and scp-style
 * remotes of the same repository share one key. Returns null for local paths.
 */
export function normalizeRemoteUrl(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;
  if (value.startsWith("/") || value.startsWith("file://") || /^[A-Za-z]:[\\/]/.test(value)) {
    return null;
  }

  let host: string;
  let path: string;
  const scheme = /^[a-z][a-z0-9+.-]*:\/\//i.exec(value);
  if (scheme) {
    value = value.slice(scheme[0].length);
    const slash = value.indexOf("/");
    host = slash === -1 ? value : value.slice(0, slash);
    path = slash === -1 ? "" : value.slice(slash + 1);
  } else {
    // scp-like: [user@]host:owner/repo
    const colon = value.indexOf(":");
    if (colon === -1) return null;
    host = value.slice(0, colon);
    path = value.slice(colon + 1);
  }

  host = host.replace(/^[^@]*@/, "").replace(/:\d+$/, "").toLowerCase();
  path = path
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+/, "");
  if (!host || !path) return null;
  return `${host}/${path}`;
}

function lastSegment(value: string): string {
  const parts = value.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? value;
}

export function remoteProject(normalized: string): ProjectRef {
  return { key: `remote:${normalized}`, label: lastSegment(normalized) };
}

export function pathProject(absolutePath: string): ProjectRef {
  const trimmed = absolutePath.length > 1 ? absolutePath.replace(/[\\/]+$/, "") : absolutePath;
  return { key: `path:${trimmed}`, label: lastSegment(trimmed) || trimmed };
}
