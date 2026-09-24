// Browser-only bridge: the SDK does not expose the app language, and the host
// leaves `<html lang="en">` static. The Paseo `language` setting lives in the
// app settings blob in localStorage; keep DOM / storage access here and call it
// only on the web platform.
import { resolveAppLanguage, type AppLanguage } from "../shared/i18n.ts";
import { workspaceIdFromPath } from "./route.ts";

const APP_SETTINGS_KEY = "@paseo:app-settings";
/** Same-window writes do not fire `storage`; poll the (small) settings string. */
const POLL_MS = 1_500;

type BrowserEventTarget = {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};
const browser = globalThis as unknown as BrowserEventTarget & {
  location?: { pathname: string };
  localStorage?: { getItem(key: string): string | null };
  navigator?: { languages?: readonly string[]; language?: string };
  document?: BrowserEventTarget;
};

function readLanguageSetting(): string | null {
  try {
    const raw = browser.localStorage?.getItem(APP_SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { language?: unknown };
    return typeof parsed.language === "string" ? parsed.language : null;
  } catch {
    return null;
  }
}

function systemLanguages(): readonly string[] {
  const nav = browser.navigator;
  if (!nav) return [];
  if (nav.languages && nav.languages.length > 0) return nav.languages;
  return nav.language ? [nav.language] : [];
}

let current: AppLanguage = "en";
let initialized = false;
const listeners = new Set<() => void>();
let stopWatching: (() => void) | null = null;

function refresh(): void {
  const next = resolveAppLanguage(readLanguageSetting(), systemLanguages());
  if (next === current) return;
  current = next;
  for (const listener of [...listeners]) listener();
}

export function readAppLanguage(): AppLanguage {
  if (!initialized) {
    initialized = true;
    current = resolveAppLanguage(readLanguageSetting(), systemLanguages());
  }
  return current;
}

export function subscribeAppLanguage(onChange: () => void): () => void {
  listeners.add(onChange);
  if (!stopWatching) {
    readAppLanguage();
    const timer = setInterval(refresh, POLL_MS);
    browser.addEventListener?.("storage", refresh);
    browser.addEventListener?.("focus", refresh);
    browser.addEventListener?.("languagechange", refresh);
    browser.document?.addEventListener?.("visibilitychange", refresh);
    stopWatching = () => {
      clearInterval(timer);
      browser.removeEventListener?.("storage", refresh);
      browser.removeEventListener?.("focus", refresh);
      browser.removeEventListener?.("languagechange", refresh);
      browser.document?.removeEventListener?.("visibilitychange", refresh);
    };
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && stopWatching) {
      stopWatching();
      stopWatching = null;
    }
  };
}

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
