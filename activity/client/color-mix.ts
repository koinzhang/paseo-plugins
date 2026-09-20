import { activityLevel } from "../shared/activity.ts";

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

/**
 * Accent intensity fill for a creations day bar (057) — same steps as the
 * Activity heatmap so Global charts share one hue family.
 */
export function creationBarColor(
  count: number,
  max: number,
  surface2: string,
  accent: string,
): string {
  const level = activityLevel(count, max);
  if (level <= 0) return surface2;
  const amount = ACTIVITY_MIX_STEPS[level - 1] ?? 1;
  return mixColor(surface2, accent, amount);
}
