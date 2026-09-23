import { Platform } from "react-native";
import { hiddenModelsCss, isModelHidden } from "../shared/models";
import {
  getHiddenModels,
  providerIdForTitle,
  refreshProviders,
  setModelVisible,
  subscribeModelVisibility,
} from "./model-visibility-store";

interface DomElement {
  parentElement: DomElement | null;
  textContent: string | null;
  style: { setProperty(name: string, value: string): void; removeProperty(name: string): void };
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
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
}

declare const document: DomDocument;
declare const window: object;
declare function getComputedStyle(element: DomElement): {
  color: string;
  backgroundColor: string;
};
declare class MutationObserver {
  constructor(callback: () => void);
  observe(target: DomElement, options: { childList?: boolean; subtree?: boolean }): void;
  disconnect(): void;
}

const DIALOG_SELECTOR = '[data-testid="provider-settings-sheet"] [role="dialog"]';
// CODE_SURFACE_DATASET on the model ID text in provider-diagnostic-sheet.tsx.
const MODEL_ID_SELECTOR = "[data-pmono]";
const TOGGLE_ATTRIBUTE = "data-mono-model-toggle";
const PROVIDER_ATTRIBUTE = "data-mono-provider";
const MODEL_ATTRIBUTE = "data-mono-model";
const FG_VAR = "--mono-model-toggle-fg";
const BG_VAR = "--mono-model-toggle-bg";
// Mirrors a compact switch: 28×16 track, 10px knob, 2px inset.
const TRACK_WIDTH_PX = 28;
const TRACK_HEIGHT_PX = 16;
const KNOB_PX = 10;
const KNOB_INSET_PX = 2;

export function installModelVisibilityWeb(): () => void {
  if (Platform.OS !== "web" || typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const style = document.createElement("style");
  style.setAttribute("data-mono-owned", "model-visibility");
  document.head.append(style);

  const toggles = new Set<DomElement>();
  let dialog: DomElement | null = null;
  let scheduled = false;
  let disposed = false;

  function findProviderId(root: DomElement): string | null {
    // RN Web renders <Text> with dir="auto"; the sheet title is the first one.
    for (const element of Array.from(root.querySelectorAll('[dir="auto"]'))) {
      const provider = providerIdForTitle(element.textContent ?? "");
      if (provider) return provider;
    }
    return null;
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

  function reconcile(): void {
    scheduled = false;
    if (disposed) return;

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
    let colorsSet = false;
    for (const idElement of Array.from(dialog.querySelectorAll(MODEL_ID_SELECTOR))) {
      const row = idElement.parentElement;
      const modelId = idElement.textContent?.trim();
      if (!row || !modelId) continue;

      if (!colorsSet) {
        const label = row.querySelector('[dir="auto"]') ?? idElement;
        dialog.style.setProperty(FG_VAR, getComputedStyle(label).color);
        dialog.style.setProperty(BG_VAR, getComputedStyle(dialog).backgroundColor);
        colorsSet = true;
      }

      let toggle = row.querySelector(`[${TOGGLE_ATTRIBUTE}]`);
      if (!toggle) {
        toggle = createToggle(provider, modelId);
        // Custom rows end with a delete button; keep it as the trailing control.
        row.insertBefore(toggle, row.querySelector('[role="button"]'));
      }
      setIfChanged(toggle, PROVIDER_ATTRIBUTE, provider);
      setIfChanged(toggle, MODEL_ATTRIBUTE, modelId);
      setIfChanged(toggle, "aria-checked", String(!isModelHidden(hidden, { provider, modelId })));
    }
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
  observer.observe(document.documentElement, { childList: true, subtree: true });
  reconcile();

  return () => {
    disposed = true;
    observer.disconnect();
    unsubscribe();
    for (const toggle of toggles) toggle.remove();
    toggles.clear();
    dialog?.style.removeProperty(FG_VAR);
    dialog?.style.removeProperty(BG_VAR);
    style.remove();
  };
}

const TOGGLE_CSS = `
[${TOGGLE_ATTRIBUTE}] {
  all: unset;
  box-sizing: border-box;
  position: relative;
  flex: 0 0 auto;
  margin-left: auto;
  width: ${TRACK_WIDTH_PX}px;
  height: ${TRACK_HEIGHT_PX}px;
  border-radius: ${TRACK_HEIGHT_PX / 2}px;
  border: 1px solid var(${FG_VAR}, currentColor);
  opacity: 0.45;
  cursor: pointer;
}
[${TOGGLE_ATTRIBUTE}]::after {
  content: "";
  position: absolute;
  top: ${KNOB_INSET_PX - 1}px;
  left: ${KNOB_INSET_PX - 1}px;
  width: ${KNOB_PX}px;
  height: ${KNOB_PX}px;
  border-radius: 50%;
  background: var(${FG_VAR}, currentColor);
  transition: transform 120ms ease;
}
[${TOGGLE_ATTRIBUTE}][aria-checked="true"] {
  background: var(${FG_VAR}, currentColor);
  opacity: 1;
}
[${TOGGLE_ATTRIBUTE}][aria-checked="true"]::after {
  transform: translateX(${TRACK_WIDTH_PX - KNOB_PX - KNOB_INSET_PX * 2}px);
  background: var(${BG_VAR}, Canvas);
}
[${TOGGLE_ATTRIBUTE}]:focus-visible {
  outline: 2px solid var(${FG_VAR}, currentColor);
  outline-offset: 2px;
}
`;
