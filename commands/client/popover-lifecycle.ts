interface PopoverToggleEvent {
  newState?: string;
}

interface FocusableElement {
  focus(): void;
  isConnected?: boolean;
}

interface PickerDocument {
  activeElement?: unknown;
}

interface PickerKeyboardEvent {
  key?: string;
  preventDefault(): void;
  stopImmediatePropagation(): void;
}

interface PickerWindow {
  addEventListener(type: "keydown", listener: (event: PickerKeyboardEvent) => void, capture?: boolean): void;
  removeEventListener(type: "keydown", listener: (event: PickerKeyboardEvent) => void, capture?: boolean): void;
}

interface PopoverElement {
  setAttribute(name: string, value: string): void;
  addEventListener(type: "toggle", listener: (event: PopoverToggleEvent) => void): void;
  removeEventListener(type: "toggle", listener: (event: PopoverToggleEvent) => void): void;
  showPopover(): void;
  hidePopover(): void;
}

function focusable(value: unknown): FocusableElement | null {
  return typeof value === "object" && value !== null && "focus" in value && typeof value.focus === "function"
    ? (value as FocusableElement)
    : null;
}

function closePicker(close: () => void, previousFocus: FocusableElement | null) {
  close();
  if (previousFocus?.isConnected !== false) previousFocus?.focus();
}

function escapeFallback(close: () => void, previousFocus: FocusableElement | null): () => void {
  const host = globalThis as { window?: PickerWindow };
  const target = host.window;
  if (!target) return () => {};
  const onKeyDown = (event: PickerKeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closePicker(close, previousFocus);
  };
  target.addEventListener("keydown", onKeyDown, true);
  return () => target.removeEventListener("keydown", onKeyDown, true);
}

function isPopoverElement(value: unknown): value is PopoverElement {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PopoverElement>;
  return (
    typeof candidate.setAttribute === "function" &&
    typeof candidate.addEventListener === "function" &&
    typeof candidate.removeEventListener === "function" &&
    typeof candidate.showPopover === "function" &&
    typeof candidate.hidePopover === "function"
  );
}

export function openPickerPopover(element: unknown, close: () => void): (() => void) | null {
  const host = globalThis as { document?: PickerDocument };
  const previousFocus = focusable(host.document?.activeElement);
  if (!isPopoverElement(element)) return escapeFallback(close, previousFocus);
  const onToggle = (event: PopoverToggleEvent) => {
    if (event.newState === "closed") closePicker(close, previousFocus);
  };
  element.setAttribute("popover", "auto");
  element.addEventListener("toggle", onToggle);
  try {
    element.showPopover();
  } catch {
    element.removeEventListener("toggle", onToggle);
    return escapeFallback(close, previousFocus);
  }
  return () => {
    element.removeEventListener("toggle", onToggle);
    element.hidePopover();
    if (previousFocus?.isConnected !== false) previousFocus?.focus();
  };
}
