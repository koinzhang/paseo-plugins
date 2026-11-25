import assert from "node:assert/strict";
import { test } from "node:test";
import { openPickerPopover } from "./popover-lifecycle.ts";

function fakePopover() {
  const attributes = new Map<string, string>();
  const listeners = new Set<(event: { newState?: string }) => void>();
  let visible = false;
  return {
    attributes,
    get visible() {
      return visible;
    },
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    },
    addEventListener(_type: "toggle", listener: (event: { newState?: string }) => void) {
      listeners.add(listener);
    },
    removeEventListener(_type: "toggle", listener: (event: { newState?: string }) => void) {
      listeners.delete(listener);
    },
    showPopover() {
      visible = true;
    },
    hidePopover() {
      visible = false;
    },
    toggle(newState: "open" | "closed") {
      visible = newState === "open";
      for (const listener of listeners) listener({ newState });
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

function fakeHost(activeElement: { focus(): void; isConnected?: boolean }) {
  const listeners = new Set<(event: {
    key?: string;
    preventDefault(): void;
    stopImmediatePropagation(): void;
  }) => void>();
  const host = globalThis as { document?: unknown; window?: unknown };
  const originalDocument = host.document;
  const originalWindow = host.window;
  host.document = { activeElement };
  host.window = {
    addEventListener(_type: "keydown", listener: (event: { key?: string }) => void) {
      listeners.add(listener);
    },
    removeEventListener(_type: "keydown", listener: (event: { key?: string }) => void) {
      listeners.delete(listener);
    },
  };
  return {
    listeners,
    restore() {
      host.document = originalDocument;
      host.window = originalWindow;
    },
  };
}

test("native popover close cleans up the plugin picker", () => {
  let focuses = 0;
  const host = fakeHost({ focus: () => focuses++ });
  const element = fakePopover();
  let closes = 0;
  const dispose = openPickerPopover(element, () => closes++);
  assert.ok(dispose);
  assert.equal(element.attributes.get("popover"), "auto");
  assert.equal(element.visible, true);
  element.toggle("closed");
  assert.equal(closes, 1);
  assert.equal(focuses, 1);
  dispose();
  assert.equal(element.listenerCount, 0);
  host.restore();
});

test("unmount hides the popover and removes its listener", () => {
  let focuses = 0;
  const host = fakeHost({ focus: () => focuses++ });
  const element = fakePopover();
  const dispose = openPickerPopover(element, () => {});
  assert.ok(dispose);
  dispose();
  assert.equal(element.visible, false);
  assert.equal(element.listenerCount, 0);
  assert.equal(focuses, 1);
  host.restore();
});

test("unsupported or failed popovers preserve the fallback without leaking listeners", () => {
  let focuses = 0;
  const host = fakeHost({ focus: () => focuses++ });
  let closes = 0;
  const dispose = openPickerPopover(null, () => closes++);
  assert.ok(dispose);
  assert.equal(host.listeners.size, 1);
  const calls: string[] = [];
  for (const listener of host.listeners) {
    listener({
      key: "Escape",
      preventDefault: () => calls.push("preventDefault"),
      stopImmediatePropagation: () => calls.push("stopImmediatePropagation"),
    });
  }
  assert.equal(closes, 1);
  assert.equal(focuses, 1);
  assert.deepEqual(calls, ["preventDefault", "stopImmediatePropagation"]);
  dispose();
  assert.equal(host.listeners.size, 0);
  const element = fakePopover();
  element.showPopover = () => {
    throw new Error("Unsupported");
  };
  const failedDispose = openPickerPopover(element, () => {});
  assert.ok(failedDispose);
  assert.equal(element.listenerCount, 0);
  assert.equal(host.listeners.size, 1);
  failedDispose();
  assert.equal(host.listeners.size, 0);
  host.restore();
});
