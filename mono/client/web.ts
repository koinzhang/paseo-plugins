import { Platform } from "react-native";
import { hiddenVoiceButtonSelectors } from "../shared/composer";
import { MONO_THEMES } from "../shared/palette";
import type { MonoSettings } from "../shared/settings";
import { getMonoSettings, subscribeMonoSettings } from "./settings-store";
import {
  BUILTIN_SIDEBAR_NAV_IDS,
  PLUGIN_SIDEBAR_NAV_PREFIX,
  isSidebarNavTestId,
} from "../shared/sidebar-nav";

interface DomElement {
  parentElement: DomElement | null;
  lastElementChild: DomElement | null;
  childElementCount: number;
  isConnected: boolean;
  textContent: string | null;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  getBoundingClientRect(): { width: number; height: number };
  contains(element: DomElement): boolean;
  remove(): void;
  querySelectorAll<T extends DomElement = DomElement>(selector: string): ArrayLike<T>;
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
declare function getComputedStyle(element: DomElement): {
  borderBottomWidth: string;
  borderRightWidth: string;
  borderTopWidth: string;
  borderTopLeftRadius: string;
  minHeight: string;
};
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
// Only selects Mono palette colors; every layout tweak is gated by its own setting instead.
const THEME_ATTRIBUTE = "data-mono-theme";
const CHROME_ATTRIBUTE = "data-mono-chrome";
const ACTIVE_ATTRIBUTE = "data-mono-nav-active";
const GROUP_ATTRIBUTE = "data-mono-nav-group";
const CELL_ATTRIBUTE = "data-mono-nav-cell";
const BUTTON_ATTRIBUTE = "data-mono-nav-button";
const SIDEBAR_HEADER_ATTRIBUTE = "data-mono-sidebar-header";
const SIDEBAR_FOOTER_ATTRIBUTE = "data-mono-sidebar-footer";
// First and last children of left-sidebar.tsx's SidebarFooter (styles.sidebarFooter).
const SIDEBAR_FOOTER_ANCHOR_IDS = ["sidebar-add-project", "sidebar-settings"] as const;
const EXPLORER_DIVIDER_ATTRIBUTE = "data-mono-explorer-divider";
const EXPLORER_SELECTOR = '[data-testid="workspace-explorer-sidebar"]';
const EXPLORER_TAB_RAIL_SELECTOR = `${EXPLORER_SELECTOR} [data-testid="explorer-sidebar-tab-rail"]`;
// PaneContentToolbar instances (ui/pane-content-toolbar.tsx) that draw a bottom border.
const EXPLORER_TOOLBAR_TEST_IDS = [
  "files-pane-header",
  "changes-header",
  "changes-repository-header",
  "pr-pane-toolbar",
  "commit-diff-header",
  "file-panel-bar",
] as const;
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
const HEADER_DIVIDER_ATTRIBUTE = "data-mono-header-divider";
const HEADER_SELECTOR = '[data-testid="composer-dock-header"]';
const TABS_ROW_SELECTOR = '[data-testid="workspace-tabs-row"]';
const SIDEBAR_EDGE_ATTRIBUTE = "data-mono-sidebar-edge";
// SidebarCallout root (components/sidebar-callout.tsx); children share the test ID prefix,
// and its outlined action buttons must keep their borders.
const WORKTREE_CALLOUT_SELECTOR = '[data-testid^="worktree-setup-callout-"][role="alert"]';
// model-browser.tsx renders `styles.separator` as an empty 1px sibling before each provider row.
const PROVIDER_ROW = '[data-testid^="model-provider-"]';
const PROVIDER_SEPARATOR_SELECTORS = [
  `:empty:has(+ ${PROVIDER_ROW})`,
  `:empty:has(+ * ${PROVIDER_ROW})`,
] as const;
// Profiles section container (styles.profilesContainer) and the model search row
// (adaptive-modal-sheet.tsx styles.inlineSearchRow) draw bottom lines.
const PROFILE_ROW = '[data-testid^="model-profile-row-"]';
const MODEL_SEARCH_INPUTS = '[data-testid="model-search-input"], [data-testid="model-search-all-input"]';
const MODEL_PICKER_BORDER_SELECTORS = [
  `:has(> ${PROFILE_ROW})`,
  `:has(> :is(${MODEL_SEARCH_INPUTS}))`,
] as const;
const PILL_ATTRIBUTE = "data-mono-pill";
// composerPillStyles.body (composer/pill-styles.ts): COMPOSER_PILL_MIN_HEIGHT, 1px border,
// borderRadius["2xl"]. Pills have no shared test ID, so match that signature.
const PILL_SIGNATURE = { minHeight: "32px", borderTopWidth: "1px", borderTopLeftRadius: "16px" };
// Combobox (ui/combobox.tsx styles.desktopContainer) and menu (ui/menu/menu-overlay.tsx
// styles.content, dataSet menuSurface) desktop popovers.
// Chrome renders sub-pixel borders as one device pixel (hairline on 2x displays, 1px on 1x).
const HAIRLINE_PX = 0.5;
const POPOVER_BORDER_OPACITY_PERCENT = 50;
const POPOVER_SELECTORS = [
  '[data-testid="combobox-desktop-container"]',
  '[data-menu-surface="true"]',
] as const;
// ResizeHandle (components/resize-handle.tsx) paints its 1px line as the root's background;
// the hit area and hover highlight are children, so they keep working.
const RESIZE_HANDLE_TEST_IDS = [
  "workspace-explorer-sidebar-resize-handle",
  "workspace-split-resize-handle",
] as const;

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
  style.setAttribute("data-mono-owned", "layout");
  style.textContent = LAYOUT_CSS;
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

  // Keyed by class so a restyled element is re-measured instead of trusting a stale miss.
  const pillCache = new WeakMap<DomElement, { className: string | null; pill: boolean }>();
  function isPill(element: DomElement): boolean {
    const className = element.getAttribute("class");
    const cached = pillCache.get(element);
    if (cached && cached.className === className) return cached.pill;
    const style = getComputedStyle(element);
    const pill =
      style.minHeight === PILL_SIGNATURE.minHeight &&
      style.borderTopWidth === PILL_SIGNATURE.borderTopWidth &&
      style.borderTopLeftRadius === PILL_SIGNATURE.borderTopLeftRadius;
    pillCache.set(element, { className, pill });
    return pill;
  }

  function findPills(): DomElement[] {
    return Array.from(document.querySelectorAll('[role="button"]')).filter(isPill);
  }

  // left-sidebar.tsx draws the right edge on styles.desktopSidebarBorder, an ancestor of the footer.
  function findSidebarEdge(footer: DomElement | null): DomElement | null {
    let node = footer?.parentElement ?? null;
    while (node && node !== document.documentElement) {
      if (getComputedStyle(node).borderRightWidth !== "0px") return node;
      node = node.parentElement;
    }
    return null;
  }

  // screen-header.tsx draws the divider on its inner row (styles.row), which has no test ID.
  function findHeaderDividers(): DomElement[] {
    const rows: DomElement[] = [];
    for (const header of Array.from(document.querySelectorAll(HEADER_SELECTOR))) {
      if (!visible(header)) continue;
      const width = header.getBoundingClientRect().width;
      const row = Array.from(header.querySelectorAll("*")).find(
        (element) =>
          getComputedStyle(element).borderBottomWidth !== "0px" &&
          element.getBoundingClientRect().width >= width - 1,
      );
      if (row) rows.push(row);
    }
    return rows;
  }

  // explorer-sidebar.tsx renders `tabRailDivider` as an empty 1px last sibling after the rail.
  function findExplorerTabDivider(): DomElement | null {
    const rail = Array.from(document.querySelectorAll(EXPLORER_TAB_RAIL_SELECTOR)).find(visible);
    let node = rail ?? null;
    while (rail && node?.parentElement) {
      const parent: DomElement = node.parentElement;
      if (parent.getAttribute("data-testid") === "workspace-explorer-sidebar") return null;
      const last = parent.lastElementChild;
      if (
        last &&
        last !== node &&
        !last.contains(rail) &&
        last.childElementCount === 0 &&
        last.getBoundingClientRect().height <= 2
      ) {
        return last;
      }
      node = parent;
    }
    return null;
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
    const settings = getMonoSettings();
    const mode = selectedMonoTheme();
    if (mode) setDesired(desired, document.documentElement, THEME_ATTRIBUTE, mode);

    if (settings.minimalChrome) {
      setDesired(desired, document.documentElement, CHROME_ATTRIBUTE);
      const footer = findSidebarFooter();
      if (footer) setDesired(desired, footer, SIDEBAR_FOOTER_ATTRIBUTE);
      const sidebarEdge = findSidebarEdge(footer);
      if (sidebarEdge) setDesired(desired, sidebarEdge, SIDEBAR_EDGE_ATTRIBUTE);
      const explorerDivider = findExplorerTabDivider();
      if (explorerDivider) setDesired(desired, explorerDivider, EXPLORER_DIVIDER_ATTRIBUTE);
      for (const row of findHeaderDividers()) setDesired(desired, row, HEADER_DIVIDER_ATTRIBUTE);
      for (const pill of findPills()) setDesired(desired, pill, PILL_ATTRIBUTE);
    }

    const buttons = findNavButtons();

    // A lone item has no sibling to anchor the group; its wrapper is unverifiable.
    const group = buttons.length >= 2 ? lowestCommonAncestor(buttons) : null;
    if (!group || group === document.documentElement) {
      apply(desired);
      return;
    }
    if (settings.minimalChrome) setDesired(desired, group, SIDEBAR_HEADER_ATTRIBUTE);

    if (!settings.compactSidebarNav) {
      apply(desired);
      return;
    }

    const cells = buttons.map((button) => ({ button, cell: directChildContaining(group, button) }));
    if (cells.some((item) => !item.cell) || new Set(cells.map((item) => item.cell)).size !== cells.length) {
      apply(desired);
      return;
    }

    setDesired(desired, document.documentElement, ACTIVE_ATTRIBUTE);
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
    .map((selector) => `[data-testid="message-input-root"] ${selector}`)
    .join(",\n")} {
  display: none !important;
}
`;
}

const LAYOUT_CSS = `
html[${CHROME_ATTRIBUTE}] [${SIDEBAR_HEADER_ATTRIBUTE}] {
  border-bottom-color: transparent !important;
}
html[${CHROME_ATTRIBUTE}] [${SIDEBAR_FOOTER_ATTRIBUTE}],
html[${CHROME_ATTRIBUTE}] ${WORKTREE_CALLOUT_SELECTOR} {
  border-top-color: transparent !important;
}
html[${CHROME_ATTRIBUTE}] [data-testid="message-input-root"] > *,
html[${CHROME_ATTRIBUTE}] [${PILL_ATTRIBUTE}] {
  border-color: transparent !important;
}
${POPOVER_SELECTORS.map((selector) => `html[${CHROME_ATTRIBUTE}] ${selector}`).join(",\n")} {
  border-width: ${HAIRLINE_PX}px !important;
}
${MONO_THEMES.map(
  (theme) => `${POPOVER_SELECTORS.map(
    (selector) => `html[${CHROME_ATTRIBUTE}][${THEME_ATTRIBUTE}="${theme.appearance}"] ${selector}`,
  ).join(",\n")} {
  border-color: color-mix(in srgb, ${theme.colors.border} ${POPOVER_BORDER_OPACITY_PERCENT}%, transparent) !important;
}`,
).join("\n")}
html[${CHROME_ATTRIBUTE}] [${SIDEBAR_EDGE_ATTRIBUTE}] {
  border-right-color: transparent !important;
}
${RESIZE_HANDLE_TEST_IDS.map((id) => `html[${CHROME_ATTRIBUTE}] [data-testid="${id}"]`).join(",\n")} {
  background-color: transparent !important;
}
${MODEL_PICKER_BORDER_SELECTORS.map((selector) => `html[${CHROME_ATTRIBUTE}] ${selector}`).join(",\n")},
html[${CHROME_ATTRIBUTE}] [${HEADER_DIVIDER_ATTRIBUTE}],
html[${CHROME_ATTRIBUTE}] ${TABS_ROW_SELECTOR} {
  border-bottom-color: transparent !important;
}
${PROVIDER_SEPARATOR_SELECTORS.map((selector) => `html[${CHROME_ATTRIBUTE}] ${selector}`).join(",\n")},
html[${CHROME_ATTRIBUTE}] [${EXPLORER_DIVIDER_ATTRIBUTE}] {
  background-color: transparent !important;
}
${EXPLORER_TOOLBAR_TEST_IDS.map(
  (id) => `html[${CHROME_ATTRIBUTE}] ${EXPLORER_SELECTOR} [data-testid="${id}"]`,
).join(",\n")} {
  border-bottom-color: transparent !important;
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
