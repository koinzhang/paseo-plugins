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
