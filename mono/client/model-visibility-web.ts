import { Platform } from "react-native";
import {
  hiddenModelsCss,
  isModelHidden,
  parseModelCount,
  rewriteModelCount,
  visibleModelCount,
} from "../shared/models";
import {
  getHiddenModels,
  knownModelIds,
  providerIdForTitle,
  refreshProviders,
  setModelVisible,
  subscribeModelVisibility,
} from "./model-visibility-store";

interface DomElement {
  parentElement: DomElement | null;
  firstElementChild: DomElement | null;
  textContent: string | null;
  getBoundingClientRect(): { width: number; height: number };
  style: { setProperty(name: string, value: string): void; removeProperty(name: string): void };
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  querySelector(selector: string): DomElement | null;
  querySelectorAll(selector: string): ArrayLike<DomElement>;
  insertBefore(element: DomElement, reference: DomElement | null): void;
  addEventListener(type: "click", listener: (event: { stopPropagation(): void }) => void): void;
  remove(): void;
}

interface DomDocument {
  documentElement: DomElement;
  head: DomElement & { append(element: DomElement): void };
  createElement(tag: string): DomElement;
  querySelector(selector: string): DomElement | null;
  querySelectorAll(selector: string): ArrayLike<DomElement>;
}

declare const document: DomDocument;
declare const window: object;
declare function getComputedStyle(element: DomElement): {
  color: string;
  backgroundColor: string;
};
declare class MutationObserver {
  constructor(callback: () => void);
  observe(
    target: DomElement,
    options: { childList?: boolean; subtree?: boolean; characterData?: boolean },
  ): void;
  disconnect(): void;
}

const DIALOG_SELECTOR = '[data-testid="provider-settings-sheet"] [role="dialog"]';
// CODE_SURFACE_DATASET on the model ID text in provider-diagnostic-sheet.tsx.
const MODEL_ID_SELECTOR = "[data-pmono]";
// RN Web renders <Text> as dir="auto".
const TEXT_SELECTOR = '[dir="auto"]';
const PROVIDER_ROW_PREFIX = "model-provider-";
const TOGGLE_ATTRIBUTE = "data-mono-model-toggle";
const HOST_SWITCH_SELECTOR = `[role="switch"]:not([${TOGGLE_ATTRIBUTE}])`;
const PROVIDER_ATTRIBUTE = "data-mono-provider";
const MODEL_ATTRIBUTE = "data-mono-model";
const COUNT_ORIGINAL_ATTRIBUTE = "data-mono-count-original";
const COUNT_SHOWN_ATTRIBUTE = "data-mono-count-shown";
// Paseo's switchGeometry (control-geometry.ts) and Switch timing (switch.tsx).
const TRACK_WIDTH_PX = 34;
const TRACK_HEIGHT_PX = 20;
const THUMB_PX = 16;
const THUMB_INSET_PX = (TRACK_HEIGHT_PX - THUMB_PX) / 2;
const THUMB_TRAVEL_PX = TRACK_WIDTH_PX - THUMB_PX - THUMB_INSET_PX * 2;
const TRANSITION = "180ms ease-in-out";

type SwitchColor = "trackOn" | "thumbOn" | "trackOff" | "thumbOff";
const COLOR_VARS: Record<SwitchColor, string> = {
  trackOn: "--mono-switch-track-on",
  thumbOn: "--mono-switch-thumb-on",
  trackOff: "--mono-switch-track-off",
  thumbOff: "--mono-switch-thumb-off",
};

export function installModelVisibilityWeb(): () => void {
  if (Platform.OS !== "web" || typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const style = document.createElement("style");
  style.setAttribute("data-mono-owned", "model-visibility");
  document.head.append(style);

  const toggles = new Set<DomElement>();
  const counts = new Set<DomElement>();
  // Host switch colors persist across dialogs so a sheet opened without host switches still matches.
  const sampled: Partial<Record<SwitchColor, string>> = {};
  let dialog: DomElement | null = null;
  let scheduled = false;
  let disposed = false;

  function findProviderId(root: DomElement): string | null {
    for (const element of Array.from(root.querySelectorAll(TEXT_SELECTOR))) {
      const provider = providerIdForTitle(element.textContent ?? "");
      if (provider) return provider;
    }
    return null;
  }

  function sampleHostSwitches(): void {
    for (const hostSwitch of Array.from(document.querySelectorAll(HOST_SWITCH_SELECTOR))) {
      // Match by Paseo's switch geometry: wrapper depth differs across hosts.
      const parts = Array.from(hostSwitch.querySelectorAll("*"));
      const track = parts.find((part) => hasSize(part, TRACK_WIDTH_PX, TRACK_HEIGHT_PX));
      const thumb = parts.find((part) => hasSize(part, THUMB_PX, THUMB_PX));
      const trackColor = track && opaqueColor(getComputedStyle(track).backgroundColor);
      const thumbColor = thumb && opaqueColor(getComputedStyle(thumb).backgroundColor);
      if (!trackColor || !thumbColor) continue;
      const on = hostSwitch.getAttribute("aria-checked") === "true";
      sampled[on ? "trackOn" : "trackOff"] = trackColor;
      sampled[on ? "thumbOn" : "thumbOff"] = thumbColor;
    }
  }

  function applySwitchColors(root: DomElement, row: DomElement): void {
    sampleHostSwitches();
    const label = row.querySelector(TEXT_SELECTOR) ?? row;
    const foreground = getComputedStyle(label).color;
    const background = getComputedStyle(root).backgroundColor;
    const colors: Record<SwitchColor, string> = {
      trackOn: sampled.trackOn ?? foreground,
      thumbOn: sampled.thumbOn ?? background,
      trackOff: sampled.trackOff ?? `color-mix(in srgb, ${foreground} 18%, ${background})`,
      thumbOff: sampled.thumbOff ?? "#ffffff",
    };
    for (const key of Object.keys(COLOR_VARS) as SwitchColor[]) {
      root.style.setProperty(COLOR_VARS[key], colors[key]);
    }
  }

  function createToggle(provider: string, modelId: string): DomElement {
    const toggle = document.createElement("button");
    toggle.setAttribute("type", "button");
    toggle.setAttribute("role", "switch");
    toggle.setAttribute(TOGGLE_ATTRIBUTE, "");
    toggle.setAttribute("title", "Show in model picker");
    toggle.setAttribute("aria-label", `Show ${modelId} in model picker`);
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const ref = {
        provider: toggle.getAttribute(PROVIDER_ATTRIBUTE) ?? provider,
        modelId: toggle.getAttribute(MODEL_ATTRIBUTE) ?? modelId,
      };
      setModelVisible(ref, isModelHidden(getHiddenModels(), ref));
    });
    toggles.add(toggle);
    return toggle;
  }

  function setIfChanged(element: DomElement, name: string, value: string): void {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }

  function syncDialog(): void {
    const nextDialog = document.querySelector(DIALOG_SELECTOR);
    if (nextDialog !== dialog) {
      dialog = nextDialog;
      if (dialog) refreshProviders();
    }
    for (const toggle of toggles) {
      if (!dialog || !toggle.parentElement) toggles.delete(toggle);
    }
    if (!dialog) return;

    const provider = findProviderId(dialog);
    if (!provider) return;

    const hidden = getHiddenModels();
    let colorsApplied = false;
    for (const idElement of Array.from(dialog.querySelectorAll(MODEL_ID_SELECTOR))) {
      const row = idElement.parentElement;
      const modelId = idElement.textContent?.trim();
      if (!row || !modelId) continue;

      if (!colorsApplied) {
        applySwitchColors(dialog, row);
        colorsApplied = true;
      }

      let toggle = row.querySelector(`[${TOGGLE_ATTRIBUTE}]`);
      if (!toggle) {
        toggle = createToggle(provider, modelId);
        // Always last so switches line up across discovered and custom (delete button) rows.
        row.insertBefore(toggle, null);
      }
      setIfChanged(toggle, PROVIDER_ATTRIBUTE, provider);
      setIfChanged(toggle, MODEL_ATTRIBUTE, modelId);
      setIfChanged(toggle, "aria-checked", String(!isModelHidden(hidden, { provider, modelId })));
    }
  }

  function syncProviderCounts(): void {
    for (const element of counts) {
      if (!element.parentElement) counts.delete(element);
    }
    const hidden = getHiddenModels();
    const rows = document.querySelectorAll(`[data-testid^="${PROVIDER_ROW_PREFIX}"]`);
    for (const row of Array.from(rows)) {
      const provider = row.getAttribute("data-testid")!.slice(PROVIDER_ROW_PREFIX.length);
      const texts = Array.from(row.querySelectorAll(TEXT_SELECTOR));
      // First text is the provider label; the trailing one is the count.
      const countElement = texts.length > 1 ? texts[texts.length - 1] : null;
      if (!countElement) continue;

      const current = countElement.textContent ?? "";
      let original = countElement.getAttribute(COUNT_ORIGINAL_ATTRIBUTE);
      if (original === null || current !== countElement.getAttribute(COUNT_SHOWN_ATTRIBUTE)) {
        original = current;
        countElement.setAttribute(COUNT_ORIGINAL_ATTRIBUTE, original);
      }
      const total = parseModelCount(original);
      const visible =
        total === null ? null : visibleModelCount(hidden, provider, total, knownModelIds(provider));
      const desired =
        total === null || visible === total ? original : rewriteModelCount(original, visible!);
      if (current !== desired) countElement.textContent = desired;
      setIfChanged(countElement, COUNT_SHOWN_ATTRIBUTE, desired);
      counts.add(countElement);
    }
  }

  function reconcile(): void {
    scheduled = false;
    if (disposed) return;
    syncDialog();
    syncProviderCounts();
  }

  function schedule(): void {
    if (scheduled || disposed) return;
    scheduled = true;
    queueMicrotask(reconcile);
  }

  function renderCss(): void {
    style.textContent = `${TOGGLE_CSS}${hiddenModelsCss(getHiddenModels())}`;
  }

  renderCss();
  const unsubscribe = subscribeModelVisibility(() => {
    renderCss();
    schedule();
  });
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  reconcile();

  return () => {
    disposed = true;
    observer.disconnect();
    unsubscribe();
    for (const toggle of toggles) toggle.remove();
    toggles.clear();
    for (const element of counts) {
      const original = element.getAttribute(COUNT_ORIGINAL_ATTRIBUTE);
      if (original !== null && element.textContent === element.getAttribute(COUNT_SHOWN_ATTRIBUTE)) {
        element.textContent = original;
      }
      element.removeAttribute(COUNT_ORIGINAL_ATTRIBUTE);
      element.removeAttribute(COUNT_SHOWN_ATTRIBUTE);
    }
    counts.clear();
    for (const name of Object.values(COLOR_VARS)) dialog?.style.removeProperty(name);
    style.remove();
  };
}

function hasSize(element: DomElement, width: number, height: number): boolean {
  const rect = element.getBoundingClientRect();
  return Math.abs(rect.width - width) < 1 && Math.abs(rect.height - height) < 1;
}

function opaqueColor(color: string): string | null {
  if (!color || color === "transparent") return null;
  const alpha = /rgba?\([^)]*[,/]\s*([\d.]+)\s*\)$/.exec(color)?.[1];
  return alpha !== undefined && Number(alpha) === 0 ? null : color;
}

const TOGGLE_CSS = `
[${TOGGLE_ATTRIBUTE}] {
  all: unset;
  box-sizing: border-box;
  display: block;
  position: relative;
  flex: 0 0 auto;
  align-self: center;
  margin-left: auto;
  width: ${TRACK_WIDTH_PX}px;
  height: ${TRACK_HEIGHT_PX}px;
  border-radius: ${TRACK_HEIGHT_PX / 2}px;
  background-color: var(${COLOR_VARS.trackOff});
  cursor: pointer;
  transition: background-color ${TRANSITION};
}
[${TOGGLE_ATTRIBUTE}]::after {
  content: "";
  position: absolute;
  top: ${THUMB_INSET_PX}px;
  left: ${THUMB_INSET_PX}px;
  width: ${THUMB_PX}px;
  height: ${THUMB_PX}px;
  border-radius: 50%;
  background-color: var(${COLOR_VARS.thumbOff});
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  transition: transform ${TRANSITION}, background-color ${TRANSITION};
}
[${TOGGLE_ATTRIBUTE}][aria-checked="true"] {
  background-color: var(${COLOR_VARS.trackOn});
}
[${TOGGLE_ATTRIBUTE}][aria-checked="true"]::after {
  transform: translateX(${THUMB_TRAVEL_PX}px);
  background-color: var(${COLOR_VARS.thumbOn});
}
[${TOGGLE_ATTRIBUTE}]:focus-visible {
  outline: 2px solid var(${COLOR_VARS.trackOn});
  outline-offset: 2px;
}
`;
