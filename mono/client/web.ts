import { Platform } from "react-native";
import { hiddenVoiceButtonSelectors } from "../shared/composer";
import type { MonoSettings } from "../shared/settings";
import { getMonoSettings, subscribeMonoSettings } from "./settings-store";
import {
  BUILTIN_SIDEBAR_NAV_IDS,
  PLUGIN_SIDEBAR_NAV_PREFIX,
  isSidebarNavTestId,
} from "../shared/sidebar-nav";

interface DomElement {
  parentElement: DomElement | null;
  isConnected: boolean;
  textContent: string | null;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  getBoundingClientRect(): { width: number; height: number };
  contains(element: DomElement): boolean;
  remove(): void;
}

interface DomParent {
  /** A NodeList, not an array: convert before using array methods. */
  querySelectorAll<T extends DomElement = DomElement>(selector: string): ArrayLike<T>;
}

interface DomDocument extends DomParent {
  documentElement: DomElement;
  head: DomElement & { append(element: DomElement): void };
  createElement(tag: string): DomElement;
}

declare const document: DomDocument;
declare const window: object;
declare const localStorage: { getItem(key: string): string | null };
declare class MutationObserver {
  constructor(callback: () => void);
  observe(
    target: DomElement,
    options: {
      childList?: boolean;
      subtree?: boolean;
      attributes?: boolean;
      attributeFilter?: string[];
    },
  ): void;
  disconnect(): void;
}

const SETTINGS_KEY = "@paseo:app-settings";
const THEME_ATTRIBUTE = "data-mono-theme";
const ACTIVE_ATTRIBUTE = "data-mono-nav-active";
const GROUP_ATTRIBUTE = "data-mono-nav-group";
const CELL_ATTRIBUTE = "data-mono-nav-cell";
const BUTTON_ATTRIBUTE = "data-mono-nav-button";
const SIDEBAR_HEADER_ATTRIBUTE = "data-mono-sidebar-header";
const SIDEBAR_FOOTER_ATTRIBUTE = "data-mono-sidebar-footer";
// First and last children of left-sidebar.tsx's SidebarFooter (styles.sidebarFooter).
const SIDEBAR_FOOTER_ANCHOR_IDS = ["sidebar-add-project", "sidebar-settings"] as const;
const THEME_SUFFIXES = ["/theme/mono-light", "/theme/mono-dark"] as const;
// Paseo's HEADER_INNER_HEIGHT and Unistyles `md` breakpoint; below md the header is 56px.
const HEADER_HEIGHT_PX = 36;
const DESKTOP_BREAKPOINT_PX = 720;
// Mirrors the Explorer Files / Changes tabs (explorer-sidebar-tab-rail.tsx):
// HEADER_CONTROL_HEIGHT, spacing[2] padding, borderRadius.md, TAB_GAP, inset 4 + TAB_GAP / 2.
const CONTROL_HEIGHT_PX = 26;
const CONTROL_PADDING_X_PX = 8;
const CONTROL_RADIUS_PX = 6;
const CONTROL_GAP_PX = 4;
const RAIL_INSET_PX = 6;
const NAV_SELECTOR = [
  ...BUILTIN_SIDEBAR_NAV_IDS.map((id) => `[data-testid="${id}"]`),
  `[data-testid^="${PLUGIN_SIDEBAR_NAV_PREFIX}"]`,
].join(",");

type DesiredAttributes = Map<DomElement, Map<string, string>>;

export function installMonoWeb(): () => void {
  if (
    Platform.OS !== "web" ||
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    return () => {};
  }

  const style = document.createElement("style");
  style.setAttribute("data-mono-owned", "compact-sidebar-nav");
  style.textContent = COMPACT_NAV_CSS;
  document.head.append(style);

  const voiceStyle = document.createElement("style");
  voiceStyle.setAttribute("data-mono-owned", "composer-voice");
  voiceStyle.textContent = voiceCss(getMonoSettings());
  document.head.append(voiceStyle);
  const unsubscribeSettings = subscribeMonoSettings((settings) => {
    voiceStyle.textContent = voiceCss(settings);
    schedule();
  });

  const originals = new Map<DomElement, Map<string, string | null>>();
  let scheduled = false;
  let disposed = false;

  function setDesired(
    desired: DesiredAttributes,
    element: DomElement,
    name: string,
    value = "",
  ): void {
    let attributes = desired.get(element);
    if (!attributes) {
      attributes = new Map();
      desired.set(element, attributes);
    }
    attributes.set(name, value);
  }

  function apply(desired: DesiredAttributes): void {
    for (const [element, attributes] of originals) {
      for (const [name, original] of attributes) {
        if (element.isConnected && desired.get(element)?.has(name)) continue;
        if (original === null) element.removeAttribute(name);
        else element.setAttribute(name, original);
        attributes.delete(name);
      }
      if (attributes.size === 0) originals.delete(element);
    }

    for (const [element, attributes] of desired) {
      let saved = originals.get(element);
      if (!saved) {
        saved = new Map();
        originals.set(element, saved);
      }
      for (const [name, value] of attributes) {
        if (!saved.has(name)) saved.set(name, element.getAttribute(name));
        if (element.getAttribute(name) !== value) element.setAttribute(name, value);
      }
    }
  }

  function selectedMonoTheme(): "light" | "dark" | null {
    try {
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as {
        theme?: unknown;
        pluginThemeId?: unknown;
      };
      if (settings.theme !== "plugin" || typeof settings.pluginThemeId !== "string") return null;
      const themeId = settings.pluginThemeId;
      if (!THEME_SUFFIXES.some((suffix) => themeId.endsWith(suffix))) return null;
      return themeId.endsWith("/mono-dark") ? "dark" : "light";
    } catch {
      return null;
    }
  }

  function visible(element: DomElement): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findNavButtons(): DomElement[] {
    return Array.from(document.querySelectorAll(NAV_SELECTOR)).filter(
      (element) => visible(element) && isSidebarNavTestId(element.getAttribute("data-testid")),
    );
  }

  function findSidebarFooter(): DomElement | null {
    const anchors: DomElement[] = [];
    for (const id of SIDEBAR_FOOTER_ANCHOR_IDS) {
      const anchor = Array.from(document.querySelectorAll(`[data-testid="${id}"]`)).find(visible);
      if (!anchor) return null;
      anchors.push(anchor);
    }
    const footer = lowestCommonAncestor(anchors);
    return footer && footer !== document.documentElement ? footer : null;
  }

  function lowestCommonAncestor(elements: DomElement[]): DomElement | null {
    let candidate = elements[0]?.parentElement ?? null;
    while (candidate && !elements.every((element) => candidate?.contains(element))) {
      candidate = candidate.parentElement;
    }
    return candidate;
  }

  function directChildContaining(parent: DomElement, element: DomElement): DomElement | null {
    let child: DomElement | null = element;
    while (child?.parentElement && child.parentElement !== parent) child = child.parentElement;
    return child?.parentElement === parent ? child : null;
  }

  function reconcile(): void {
    scheduled = false;
    if (disposed) return;

    const desired: DesiredAttributes = new Map();
    const mode = selectedMonoTheme();
    if (!mode) {
      apply(desired);
      return;
    }

    setDesired(desired, document.documentElement, THEME_ATTRIBUTE, mode);

    const footer = findSidebarFooter();
    if (footer) setDesired(desired, footer, SIDEBAR_FOOTER_ATTRIBUTE);

    const buttons = findNavButtons();

    // A lone item has no sibling to anchor the group; its wrapper is unverifiable.
    const group = buttons.length >= 2 ? lowestCommonAncestor(buttons) : null;
    if (!group || group === document.documentElement) {
      apply(desired);
      return;
    }
    setDesired(desired, group, SIDEBAR_HEADER_ATTRIBUTE);

    if (!getMonoSettings().compactSidebarNav) {
      apply(desired);
      return;
    }

    const cells = buttons.map((button) => ({ button, cell: directChildContaining(group, button) }));
    if (cells.some((item) => !item.cell) || new Set(cells.map((item) => item.cell)).size !== cells.length) {
      apply(desired);
      return;
    }

    setDesired(desired, document.documentElement, ACTIVE_ATTRIBUTE, mode);
    setDesired(desired, group, GROUP_ATTRIBUTE);
    for (const { button, cell } of cells) {
      setDesired(desired, cell!, CELL_ATTRIBUTE);
      setDesired(desired, button, BUTTON_ATTRIBUTE);
      // Labels are hidden, so surface the accessible name as a hover tooltip.
      const label = button.getAttribute("aria-label");
      if (label) setDesired(desired, button, "title", label);
    }
    apply(desired);
  }

  function schedule(): void {
    if (scheduled || disposed) return;
    scheduled = true;
    queueMicrotask(reconcile);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  const interval = setInterval(schedule, 750);
  reconcile();

  return () => {
    disposed = true;
    observer.disconnect();
    clearInterval(interval);
    unsubscribeSettings();
    apply(new Map());
    style.remove();
    voiceStyle.remove();
  };
}

function voiceCss(settings: MonoSettings): string {
  const selectors = hiddenVoiceButtonSelectors(settings);
  if (selectors.length === 0) return "";
  return `${selectors
    .map((selector) => `html[${THEME_ATTRIBUTE}] [data-testid="message-input-root"] ${selector}`)
    .join(",\n")} {
  display: none !important;
}
`;
}

const COMPACT_NAV_CSS = `
html[${THEME_ATTRIBUTE}] [${SIDEBAR_HEADER_ATTRIBUTE}] {
  border-bottom-color: transparent !important;
}
html[${THEME_ATTRIBUTE}] [${SIDEBAR_FOOTER_ATTRIBUTE}] {
  border-top-color: transparent !important;
}
html[${ACTIVE_ATTRIBUTE}] [${GROUP_ATTRIBUTE}] {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  justify-content: flex-start !important;
  align-items: center !important;
  gap: ${CONTROL_GAP_PX}px !important;
  padding-left: ${RAIL_INSET_PX}px !important;
  padding-right: ${RAIL_INSET_PX}px !important;
}
@media (min-width: ${DESKTOP_BREAKPOINT_PX}px) {
  html[${ACTIVE_ATTRIBUTE}] [${GROUP_ATTRIBUTE}] {
    box-sizing: border-box !important;
    min-height: ${HEADER_HEIGHT_PX}px !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    align-content: center !important;
  }
}
html[${ACTIVE_ATTRIBUTE}] [${GROUP_ATTRIBUTE}] > [${CELL_ATTRIBUTE}] {
  flex: 0 0 auto !important;
  min-width: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}
html[${ACTIVE_ATTRIBUTE}] [${GROUP_ATTRIBUTE}] > :not([${CELL_ATTRIBUTE}]) {
  flex-basis: 100% !important;
}
html[${ACTIVE_ATTRIBUTE}] [${BUTTON_ATTRIBUTE}] {
  box-sizing: border-box !important;
  height: ${CONTROL_HEIGHT_PX}px !important;
  min-height: ${CONTROL_HEIGHT_PX}px !important;
  padding: 0 ${CONTROL_PADDING_X_PX}px !important;
  border-radius: ${CONTROL_RADIUS_PX}px !important;
  justify-content: center !important;
  gap: 0 !important;
}
html[${ACTIVE_ATTRIBUTE}] [${BUTTON_ATTRIBUTE}] > :not(:first-child) {
  display: none !important;
}
`;
