import { brandProviderId, normalizeProvider } from "../shared/classify.ts";

export type ChartColorScheme = "light" | "dark";

type Rgb = [number, number, number];

/**
 * Soft dashboard fills (Paseo identity-color family): low chroma, even luminance
 * so stacked bars identify without shouting. Light UI uses the brighter set;
 * dark UI uses the deeper set.
 */
const CHART_PALETTE: Record<ChartColorScheme, readonly string[]> = {
  // Soft fills swapped vs surface: light UI uses the brighter set, dark UI the deeper set.
  light: [
    "#a392d5", // violet
    "#6aa6ce", // sky
    "#6cae96", // emerald
    "#cc8f64", // orange
    "#d87da3", // pink
    "#9299d5", // indigo
    "#6cacab", // teal
    "#d88381", // red
    "#b29d64", // amber
    "#7ba1d5", // blue
    "#9ab87a", // olive
    "#b89ac8", // mauve
  ],
  dark: [
    "#6d49b5", // violet
    "#3d6985", // sky
    "#3e6e5d", // emerald
    "#845838", // orange
    "#974168", // pink
    "#5251c2", // indigo
    "#3e6d6c", // teal
    "#9c4243", // red
    "#716239", // amber
    "#39649e", // blue
    "#5a7a4a", // olive
    "#7a5a8a", // mauve
  ],
};

/**
 * Known Paseo provider ids (builtin + ACP catalog + normalize aliases).
 * Sources: `packages/protocol/src/provider-manifest.ts` builtins,
 * `packages/app/src/data/acp-provider-catalog.ts`, and `normalizeProvider`
 * aliases (`codebuddy-code` → `codebuddy`, `omp` → `pi`).
 */
const KNOWN_PROVIDER_IDS = [
  "agoragentic-acp",
  "amp-acp",
  "auggie",
  "autohand",
  "claude",
  "cline",
  "codebuddy",
  "codebuddy-code",
  "codewhale",
  "codex",
  "copilot",
  "cortex-code",
  "corust-agent",
  "crow-cli",
  "cursor",
  "deepagents",
  "devin",
  "dimcode",
  "dirac",
  "factory-droid",
  "fast-agent",
  "gemini",
  "gjc",
  "glm-acp-agent",
  "goose",
  "grok",
  "hermes",
  "junie",
  "kilo",
  "kimi",
  "kiro",
  "minimax",
  "minimax-code",
  "minion-code",
  "mistral-vibe",
  "nova",
  "omp",
  "opencode",
  "pi",
  "poolside",
  "qoder",
  "qwen-code",
  "sigit",
  "stakpak",
  "traecli",
  "vtcode",
] as const;

/** High-traffic providers get the first palette slots so stacks stay distinct. */
const PRIORITY_PROVIDERS = [
  "claude",
  "codex",
  "cursor",
  "opencode",
  "pi",
  "gemini",
  "copilot",
  "kiro",
  "kimi",
  "grok",
  "goose",
  "qwen-code",
] as const;

/**
 * Official-ish brand accents for the most common providers. Always preferred
 * over theme accent and the soft chart palette when present.
 */
const PROVIDER_BRAND: Record<string, Record<ChartColorScheme, string>> = {
  // Anthropic coral — dark is a step deeper than light
  claude: { light: "#d97757", dark: "#c46845" },
  // Codex brand blue
  codex: { light: "#4d9eef", dark: "#0169cc" },
  // Cursor orange — dark is a step deeper than light
  cursor: { light: "#f54e00", dark: "#b83900" },
  // OpenCode blue — dark is a step deeper than light
  opencode: { light: "#74a2ec", dark: "#5a86d4" },
  // Pi
  pi: { light: "#f1be58", dark: "#4d9abf" },
  // Oh My Pi — light is a step brighter than dark
  omp: { light: "#9a90f5", dark: "#7f73f2" },
  // GitHub Copilot
  copilot: { light: "#5fed83", dark: "#077124" },
};

/** Normalized id → palette slot (aliases that normalize together share a slot). */
const PROVIDER_SLOT = (() => {
  const slots = new Map<string, number>();
  let next = 0;
  const claim = (raw: string) => {
    const id = normalizeProvider(raw);
    if (slots.has(id)) return;
    slots.set(id, next);
    next += 1;
  };
  for (const id of PRIORITY_PROVIDERS) claim(id);
  for (const id of [...KNOWN_PROVIDER_IDS].sort()) claim(id);
  for (const raw of KNOWN_PROVIDER_IDS) {
    const id = normalizeProvider(raw);
    const slot = slots.get(id);
    if (slot != null) slots.set(raw, slot);
  }
  return slots;
})();

function parseHex(value: string): Rgb | null {
  const hex = value.trim().replace(/^#/, "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a hex surface (0 = black, 1 = white). */
function relativeLuminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/**
 * Infer light/dark chart palette from the theme surface.
 * PluginTheme does not expose `appearance` / `colorScheme` (only `colors`), so
 * luminance of `surface0` is the reliable signal.
 */
export function chartColorScheme(surface0: string): ChartColorScheme {
  const luminance = relativeLuminance(surface0);
  if (luminance == null) return "dark";
  return luminance > 0.45 ? "light" : "dark";
}

function hashKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function paletteColor(slot: number, scheme: ChartColorScheme): string {
  const palette = CHART_PALETTE[scheme];
  return palette[((slot % palette.length) + palette.length) % palette.length]!;
}

/**
 * Stable colour for a provider id: brand accents for Claude / Codex / Cursor /
 * OpenCode / Pi / Oh My Pi / Copilot; otherwise the soft chart palette
 * (known slot or hash).
 */
export function providerColor(provider: string, scheme: ChartColorScheme): string {
  const brand = brandColor(provider, scheme);
  if (brand) return brand;
  const id = normalizeProvider(provider);
  const known = PROVIDER_SLOT.get(id) ?? PROVIDER_SLOT.get(provider.toLowerCase());
  if (known != null) return paletteColor(known, scheme);
  return paletteColor(hashKey(id), scheme);
}

/** Brand fill for a known provider, or `null` when it falls back to the soft palette. */
export function brandColor(provider: string, scheme: ChartColorScheme): string | null {
  return PROVIDER_BRAND[brandProviderId(provider)]?.[scheme] ?? null;
}

/**
 * Histogram stack colours:
 * 1. Providers with a brand accent always keep that colour (incl. the leader).
 * 2. If the window leader has no brand colour, it uses theme `accent`.
 * 3. Everyone else uses the soft chart palette.
 */
export function creationProviderColors(
  rankedProviders: readonly string[],
  accent: string,
  scheme: ChartColorScheme,
): Map<string, string> {
  const colors = new Map<string, string>();
  for (const provider of rankedProviders) {
    const brand = brandColor(provider, scheme);
    if (brand) colors.set(provider, brand);
  }
  const leader = rankedProviders[0];
  if (leader != null && !colors.has(leader)) colors.set(leader, accent);
  for (const provider of rankedProviders) {
    if (colors.has(provider)) continue;
    colors.set(provider, providerColor(provider, scheme));
  }
  return colors;
}

/**
 * Soft colour for MCP servers / arbitrary keys — same palette as providers,
 * hash-mapped (no 1:1 name table).
 */
export function entityColor(key: string, scheme: ChartColorScheme): string {
  return paletteColor(hashKey(key), scheme);
}

/** Test / docs helper: how many unique normalized provider slots we reserve. */
export function knownProviderSlotCount(): number {
  return new Set(KNOWN_PROVIDER_IDS.map((id) => normalizeProvider(id))).size;
}
