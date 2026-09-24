import { Platform, type TextStyle, type ViewStyle } from "react-native";

/**
 * Activity design tokens (065). The host only supplies `theme.colors` and
 * `layout.compact`; type scale, spacing, radii and sizes live here so the
 * Global / Workspace / Agent scopes and the composer popovers share one
 * visual language. Rules and rationale: `docs/design-system.md`.
 */

export const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

export const FONT_SIZE = {
  /** Icon corner counters. */
  badge: 9,
  /** Pill badges, dense chart ticks, terminal output. */
  caption: 11,
  /** Row meta, axis labels, legends, tooltips, in-chart tabs. */
  label: 12,
  /** Inline empty / error / loading, row counts, search input, code body. */
  small: 13,
  /** Row titles, insights / rank rows, filter tabs, menu items. */
  body: 14,
  /** Section title (regular); compact uses `body`. */
  title: 15,
  /** KPI value (FitText base, shrinks to fit). */
  metric: 18,
  /** Full-page empty state title. */
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
  tabularMeta: { fontSize: FONT_SIZE.label, fontVariant: TABULAR },
  pillBadge: { fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.semibold, fontVariant: TABULAR },
  iconBadge: { fontSize: FONT_SIZE.badge, fontWeight: FONT_WEIGHT.bold, fontVariant: TABULAR, lineHeight: 11 },
  back: { fontSize: FONT_SIZE.small, fontWeight: FONT_WEIGHT.medium },
  code: { fontSize: FONT_SIZE.small, lineHeight: 22, fontFamily: MONO },
  terminal: { fontSize: FONT_SIZE.caption, lineHeight: 15, fontFamily: MONO },
  tooltip: { fontSize: FONT_SIZE.label, lineHeight: 16 },
  menu: { fontSize: FONT_SIZE.body, lineHeight: 18, fontWeight: FONT_WEIGHT.regular },
} as const satisfies Record<string, TextStyle>;

/** One section-title style for every scope and popover. */
export function sectionTitle(compact = false): TextStyle {
  return {
    fontSize: compact ? FONT_SIZE.body : FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: -0.3,
  };
}

export type PageKind = "surface" | "panel";

/**
 * Page container rhythm. `surface` = Global sidebar page (charts, wide);
 * `panel` = Workspace / Agent workspace panels.
 */
export function pageLayout(kind: PageKind, compact: boolean): { padding: number; gap: number } {
  return {
    padding: compact ? 16 : 24,
    gap: kind === "surface" ? (compact ? 24 : 32) : compact ? 20 : 28,
  };
}

/** Section title → first content row. */
export function titleGap(compact = false): number {
  return compact ? 10 : 12;
}

/** List row vertical padding: `dense` for operational lists and popovers. */
export const ROW_PADDING = { dense: 6, regular: 9 } as const;

export const RADIUS = {
  /** Chart bars, legend swatches. */
  swatch: 3,
  /** Icon buttons, menu rows, terminal preview. */
  control: 6,
  /** Menus, tooltips. */
  overlay: 8,
  /** Code body. */
  block: 12,
  /** KPI card. */
  card: 20,
} as const;

/** Fully rounded ends for a box of the given height (badges, search field, dots). */
export function pillRadius(height: number): number {
  return height / 2;
}

export const ICON_SIZE = {
  /** Inside a pill badge. */
  badge: 12,
  /** Inline glyphs: search field, menu chevron, row close. */
  inline: 14,
  /** Header / back / toggle icon buttons. */
  action: 16,
  /** Leading icon of a list row. */
  leading: 18,
} as const;

export const CONTROL = {
  iconButton: 24,
  hitSlop: 8,
  pillBadgeHeight: 18,
} as const;

export const iconButton: ViewStyle = {
  width: CONTROL.iconButton,
  height: CONTROL.iconButton,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: RADIUS.control,
  flexShrink: 0,
};

/**
 * Global chart motion (081): `grow` for bars reaching a new value, `reveal` /
 * `refresh` for the heatmap's first column sweep and later metric / range
 * switches. `refreshFloor` is the lowest column opacity during a refresh.
 * `disclose` is the ranking Show more / Show less height transition.
 * `step` / `stepOffset` slide the metric switch label in from the pressed side.
 */
export const CHART_MOTION = {
  grow: 400,
  disclose: 250,
  step: 200,
  stepOffset: 12,
  reveal: 700,
  refresh: 450,
  refreshFloor: 0.3,
  columnSpan: 0.35,
} as const;

/** Composer popover content frame, shared by the Activity and Attention pills. */
export const POPOVER_WIDTH = { min: 300, max: 380 } as const;

export function popoverFrame(compact: boolean): ViewStyle {
  return compact ? {} : { minWidth: POPOVER_WIDTH.min, maxWidth: POPOVER_WIDTH.max };
}

/** Floating chart tooltip container (heatmap, creations histogram). */
export function tooltipSurface(colors: { surface2: string; border: string }): ViewStyle {
  return {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.overlay,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  };
}
