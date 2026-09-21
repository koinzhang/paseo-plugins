import { useCallback, useLayoutEffect, useRef, useState, type Ref } from "react";
import type { LayoutChangeEvent, View } from "react-native";

/**
 * Measured container width for a section that has to know its pixel width (062).
 *
 * Two host behaviours make the naive `useState(0)` + `onLayout` version flash:
 *
 * 1. A surface stays mounted when the user switches pages — the host hides it
 *    (0-width container), which reports `width: 0` to `onLayout`. Coming back
 *    reports the real width again, so the section collapses to nothing and
 *    re-expands: the visible "re-layout" on every switch back.
 * 2. While the app window is hidden or occluded the renderer runs no rendering
 *    updates, so `onLayout` (a ResizeObserver) never fires at all — the first
 *    frame after the window reappears is the one that finally measures.
 *
 * So: never accept a zero width (keep the last real one), seed a remount from
 * the last measured value, and re-measure synchronously from the DOM node when
 * the window becomes visible or resizes, which lands before the next paint.
 */
const widths = new Map<string, number>();

/** react-native-web forwards refs to the host DOM node; other hosts have no DOM. */
type MeasurableElement = { getBoundingClientRect?: () => { width: number } };

type ResizableWindow = {
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
  document?: {
    addEventListener?: (type: string, listener: () => void) => void;
    removeEventListener?: (type: string, listener: () => void) => void;
  };
};

/** `[width, ref, onLayout]` — width starts at the last measured value for `key`. */
export function useMeasuredWidth(key: string): [number, Ref<View>, (event: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(() => widths.get(key) ?? 0);
  const ref = useRef<MeasurableElement | null>(null);

  const apply = useCallback((next: number) => {
    // Hidden containers and not-yet-laid-out frames report 0; keeping the last
    // real width is what stops the collapse-and-re-expand.
    if (!(next > 0)) return;
    widths.set(key, next);
    setWidth(next);
  }, [key]);

  const measure = useCallback(() => {
    const rect = ref.current?.getBoundingClientRect?.();
    if (rect) apply(rect.width);
  }, [apply]);

  useLayoutEffect(() => {
    measure();
    const win = globalThis as unknown as ResizableWindow;
    win.addEventListener?.("resize", measure);
    win.document?.addEventListener?.("visibilitychange", measure);
    return () => {
      win.removeEventListener?.("resize", measure);
      win.document?.removeEventListener?.("visibilitychange", measure);
    };
  }, [measure]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => apply(event.nativeEvent.layout.width),
    [apply],
  );

  // The DOM node is the real measuring target on web; the RN `View` ref type
  // describes the native component, which has no getBoundingClientRect.
  return [width, ref as unknown as Ref<View>, onLayout];
}
