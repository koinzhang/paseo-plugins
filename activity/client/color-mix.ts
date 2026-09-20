/** Derive a palette colour by mixing `base` toward `accent` (hex themes only). */
export function mixColor(base: string, accent: string, amount: number): string {
  const parse = (value: string): number[] | null => {
    const hex = value.replace("#", "").trim();
    const expanded = hex.length === 3 || hex.length === 4
      ? hex.split("").map((c) => c + c).join("")
      : hex;
    // Use first 6 digits only — ignore trailing alpha on 8-digit hex.
    const rgb = expanded.slice(0, 6);
    if (!/^[0-9a-fA-F]{6}$/.test(rgb)) return null;
    return [0, 2, 4].map((i) => parseInt(rgb.slice(i, i + 2), 16));
  };
  const a = parse(base);
  const b = parse(accent);
  if (!a || !b) return base;
  return `rgb(${a.map((v, i) => Math.round(v + (b[i]! - v) * amount)).join(",")})`;
}

/** Intensity steps for activity visuals, indexed by `activityLevel` - 1. */
export const ACTIVITY_MIX_STEPS = [0.22, 0.43, 0.68, 1] as const;

/** Drop slices below this share of the day so they cannot notch the gradient (055). */
export const CREATION_GRADIENT_MIN_SHARE = 0.15;

/** Soft gradients stay readable with at most this many colours. */
export const CREATION_GRADIENT_MAX_COLORS = 3;

/** Fill descriptor for one Agents histogram day bar (055). */
export type CreationDayFill =
  | { type: "empty" }
  | { type: "solid"; color: string }
  | { type: "gradient"; image: string };

/**
 * Providers worth painting into the day-bar gradient: keep stack order, drop
 * tiny shares (they only create a hard seam between larger neighbours), and
 * cap how many hues participate. The day's largest slice is always kept.
 */
export function significantCreationSlices<T extends { provider: string; count: number }>(
  slices: readonly T[],
  options?: { minShare?: number; maxColors?: number },
): T[] {
  if (slices.length === 0) return [];
  const minShare = options?.minShare ?? CREATION_GRADIENT_MIN_SHARE;
  const maxColors = options?.maxColors ?? CREATION_GRADIENT_MAX_COLORS;
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  if (total <= 0) return [];
  const peak = Math.max(...slices.map((slice) => slice.count));
  const kept = slices.filter(
    (slice) => slice.count === peak || slice.count / total >= minShare,
  );
  if (kept.length <= maxColors) return kept;
  const top = new Set(
    [...kept]
      .sort((a, b) => b.count - a.count || a.provider.localeCompare(b.provider))
      .slice(0, maxColors)
      .map((slice) => slice.provider),
  );
  // Preserve original top→bottom order among the survivors.
  return kept.filter((slice) => top.has(slice.provider));
}

/**
 * Soft top→bottom fill for a day's creations. Tiny middle providers are omitted
 * from the paint (still listed in the tooltip) so they cannot split the bar;
 * remaining colours blend evenly. Empty → caller paints the gutter.
 */
export function creationDayFill(
  slices: readonly { provider: string; count: number }[],
  colorOf: (provider: string) => string,
  fallback: string,
): CreationDayFill {
  const significant = significantCreationSlices(slices);
  if (significant.length === 0) return { type: "empty" };
  const colors = significant.map((slice) => colorOf(slice.provider) || fallback);
  if (colors.length === 1) return { type: "solid", color: colors[0]! };
  // Equal stops — count already decided membership; weighting here would recreate
  // thin bands between large neighbours.
  return {
    type: "gradient",
    image: `linear-gradient(to bottom, ${colors.join(", ")})`,
  };
}
