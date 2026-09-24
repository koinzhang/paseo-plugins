import type { PluginThemeContribution } from "@getpaseo/plugin";

// Neutral gray scale; semantic status colors are derived by the Paseo host.
export const MONO_THEMES: readonly PluginThemeContribution[] = [
  {
    id: "mono-dark",
    name: "Mono Dark",
    appearance: "dark",
    colors: {
      background: "#0a0a0a",
      foreground: "#ededed",
      raised: "#111111",
      control: "#171717",
      border: "#262626",
      accent: "#ededed",
      mutedForeground: "#a3a3a3",
      ring: "#404040",
    },
  },
  {
    id: "mono-light",
    name: "Mono Light",
    appearance: "light",
    colors: {
      background: "#ffffff",
      foreground: "#171717",
      raised: "#fafafa",
      control: "#f5f5f5",
      border: "#e5e5e5",
      accent: "#171717",
      mutedForeground: "#737373",
      ring: "#d4d4d4",
    },
  },
];
