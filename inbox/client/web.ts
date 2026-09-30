/**
 * Browser-only helpers. Callers must check `Platform.OS === "web"` first.
 */

interface DragEvent {
  pageX: number;
  preventDefault(): void;
}
interface DomWindow {
  addEventListener(type: string, listener: (event: DragEvent) => void): void;
  removeEventListener(type: string, listener: (event: DragEvent) => void): void;
}
declare const window: DomWindow;
declare const document: { body: { style: { cursor: string; userSelect: string } } };
declare function requestAnimationFrame(callback: () => void): number;
declare function cancelAnimationFrame(handle: number): void;

/**
 * Follows a horizontal drag on `window`, so it keeps tracking after the pointer
 * leaves the handle. `onMove` receives the offset from `startX`, at most once per frame.
 */
export function trackHorizontalDrag(
  startX: number,
  onMove: (dx: number) => void,
): void {
  const body = document.body.style;
  const previous = { cursor: body.cursor, userSelect: body.userSelect };
  body.cursor = "col-resize";
  body.userSelect = "none";

  let frame = 0;
  let lastX = startX;
  const move = (event: DragEvent) => {
    event.preventDefault();
    lastX = event.pageX;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      onMove(lastX - startX);
    });
  };
  const end = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", end);
    window.removeEventListener("blur", end);
    if (frame) cancelAnimationFrame(frame);
    onMove(lastX - startX);
    body.cursor = previous.cursor;
    body.userSelect = previous.userSelect;
  };
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);
  window.addEventListener("blur", end);
}

interface WheelEvent {
  deltaX: number;
  deltaY: number;
  preventDefault(): void;
}
export interface HorizontalScrollNode {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
  addEventListener(type: "wheel", listener: (event: WheelEvent) => void, options: { passive: boolean }): void;
  removeEventListener(type: "wheel", listener: (event: WheelEvent) => void): void;
}

/**
 * Lets a vertical mouse wheel scroll a horizontal strip. At either end the
 * event is left alone so the surrounding page keeps scrolling. Returns cleanup.
 */
export function wheelScrollsHorizontally(node: HorizontalScrollNode): () => void {
  const onWheel = (event: WheelEvent) => {
    if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const max = node.scrollWidth - node.clientWidth;
    const next = Math.max(0, Math.min(max, node.scrollLeft + event.deltaY));
    if (next === node.scrollLeft) return;
    event.preventDefault();
    node.scrollLeft = next;
  };
  node.addEventListener("wheel", onWheel, { passive: false });
  return () => node.removeEventListener("wheel", onWheel);
}
