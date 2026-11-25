import { workspaceIdFromPath } from "./route.ts";

type BrowserEventTarget = {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};
const browser = globalThis as unknown as BrowserEventTarget & {
  location?: { pathname: string };
};

// The sidebar surface has no workspace context, and the SDK exposes no active
// workspace. Remember the last `/workspace/<id>` route the user was on so the
// board can default to that workspace's project.
const ROUTE_POLL_MS = 500;
let lastWorkspaceId: string | null = null;

function readRoute(): void {
  const id = browser.location ? workspaceIdFromPath(browser.location.pathname) : null;
  if (id) lastWorkspaceId = id;
}

export function readLastWorkspaceId(): string | null {
  readRoute();
  return lastWorkspaceId;
}

export function trackWorkspaceRoute(): () => void {
  readRoute();
  const timer = setInterval(readRoute, ROUTE_POLL_MS);
  browser.addEventListener?.("popstate", readRoute);
  return () => {
    clearInterval(timer);
    browser.removeEventListener?.("popstate", readRoute);
  };
}
