export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Placement = "top" | "bottom";

/** Gap kept between the surface and the window edge, as in Paseo's menus. */
const EDGE_PADDING = 8;

/** Paseo composer pill geometry: 12px horizontal padding, 1px border, 32px minimum height. */
const PILL_INSET_X = 13;
const PILL_HEIGHT = 32;

/** The pill's box, derived from its centred icon since only the icon is plugin-owned. */
export function pillRectFromIcon(icon: Rect): Rect {
  return {
    x: icon.x - PILL_INSET_X,
    y: icon.y + icon.height / 2 - PILL_HEIGHT / 2,
    width: icon.width + PILL_INSET_X * 2,
    height: PILL_HEIGHT,
  };
}

/**
 * Start-aligned placement with Paseo's flip rule: leave the requested side only when the
 * surface does not fit there and the other side has more room; then clamp inside the window.
 */
export function placePopover(input: {
  trigger: Rect;
  content: Size;
  window: Size;
  side: Placement;
  offset: number;
}): { x: number; y: number; placement: Placement } {
  const { trigger, content, window, offset } = input;
  const spaceTop = trigger.y;
  const spaceBottom = window.height - (trigger.y + trigger.height);
  let placement = input.side;
  if (placement === "top" && spaceTop < content.height && spaceBottom > spaceTop) {
    placement = "bottom";
  } else if (placement === "bottom" && spaceBottom < content.height && spaceTop > spaceBottom) {
    placement = "top";
  }
  const y =
    placement === "top"
      ? trigger.y - content.height - offset
      : trigger.y + trigger.height + offset;
  return {
    x: Math.max(EDGE_PADDING, Math.min(window.width - content.width - EDGE_PADDING, trigger.x)),
    y: Math.max(EDGE_PADDING, Math.min(window.height - content.height - EDGE_PADDING, y)),
    placement,
  };
}

/** Scrollable surfaces never exceed their max height or the window less both edge gaps. */
export function visibleHeight(contentHeight: number, maxHeight: number, windowHeight: number) {
  return Math.min(contentHeight, maxHeight, Math.max(windowHeight - EDGE_PADDING * 2, 0));
}
