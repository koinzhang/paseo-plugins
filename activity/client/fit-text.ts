/**
 * Single-line text sizing (051).
 *
 * KPI tiles are ~130px wide at 18px values ("Cursor · 61%"), so values used to
 * wrap onto two lines and push the labels out of line. The text is measured
 * once at a known size, and the size that fits `available` is derived from that
 * measurement alone: width scales linearly with font size, so the target does
 * not depend on the size currently rendered — measure, fit, converge, and grow
 * back to `base` when the tile widens.
 */

export type TextMeasurement = {
  /** Font size the text was measured at. */
  size: number;
  /** Rendered width of the text at `size`. */
  width: number;
};

/** Font size that fits `available`, clamped to `[min, base]`. */
export function fitFontSize(
  measured: TextMeasurement,
  available: number,
  options: { base: number; min?: number },
): number {
  const { base } = options;
  const min = options.min ?? Math.max(8, base - 6);
  if (!(measured.width > 0) || !(measured.size > 0) || !(available > 0)) return base;
  const exact = (measured.size * available) / measured.width;
  if (exact >= base) return base;
  // 1% headroom on the shrink so sub-pixel rounding cannot trip the ellipsis.
  const target = Math.min(base, Math.max(min, Math.round(exact * 0.99 * 10) / 10));
  return target;
}
