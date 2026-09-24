import { Platform, type TextStyle, type ViewStyle } from "react-native";

/**
 * Customize design tokens, shared with the Activity plugin
 * (`activity/client/design-tokens.ts`, `activity/docs/design-system.md`).
 * The host only supplies `theme.colors` and `layout.compact`.
 */

export const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

export const FONT_SIZE = {
  badge: 9,
  caption: 11,
  label: 12,
  small: 13,
  body: 14,
  title: 15,
  metric: 18,
  display: 19,
} as const;

export const FONT_WEIGHT = {
  regular: "normal",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const satisfies Record<string, TextStyle["fontWeight"]>;

const TABULAR: TextStyle["fontVariant"] = ["tabular-nums"];

/** Text roles without color; components add `color` from `theme.colors`. */
export const TEXT = {
  display: { fontSize: FONT_SIZE.display, fontWeight: FONT_WEIGHT.medium },
  rowTitle: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium },
  body: { fontSize: FONT_SIZE.body },
  small: { fontSize: FONT_SIZE.small },
  meta: { fontSize: FONT_SIZE.label },
  caption: { fontSize: FONT_SIZE.caption },
  count: { fontSize: FONT_SIZE.small, fontVariant: TABULAR },
  pillBadge: { fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.semibold, fontVariant: TABULAR },
  code: { fontSize: FONT_SIZE.small, lineHeight: 20, fontFamily: MONO },
  path: { fontSize: FONT_SIZE.label, fontFamily: MONO },
  menu: { fontSize: FONT_SIZE.body, lineHeight: 18, fontWeight: FONT_WEIGHT.regular },
} as const satisfies Record<string, TextStyle>;

export function sectionTitle(compact = false): TextStyle {
  return {
    fontSize: compact ? FONT_SIZE.body : FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: -0.3,
  };
}

/** Sidebar surface rhythm (Activity `pageLayout("surface")`). */
export function pageLayout(compact: boolean): { padding: number; gap: number } {
  return { padding: compact ? 16 : 24, gap: compact ? 24 : 32 };
}

export function titleGap(compact = false): number {
  return compact ? 10 : 12;
}

export const ROW_PADDING = { dense: 6, regular: 9 } as const;

export const RADIUS = {
  swatch: 3,
  control: 6,
  overlay: 8,
  block: 12,
  card: 20,
} as const;

export function pillRadius(height: number): number {
  return height / 2;
}

export const ICON_SIZE = {
  badge: 12,
  inline: 14,
  action: 16,
  leading: 18,
} as const;

export const CONTROL = {
  iconButton: 24,
  hitSlop: 8,
  pillBadgeHeight: 18,
  searchHeight: 30,
} as const;

export const iconButton: ViewStyle = {
  width: CONTROL.iconButton,
  height: CONTROL.iconButton,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: RADIUS.control,
  flexShrink: 0,
};

/** Floating menu surface (Activity `ProviderDropdown`). */
export const MENU = { minWidth: 200, maxWidth: 360, rowHeight: 28, visibleRows: 12 } as const;

/** Bottom preview pane height as a fraction of the panel. */
export const PREVIEW_FRACTION = { regular: 0.45, compact: 0.5 } as const;
