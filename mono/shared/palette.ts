import type { PluginThemeContribution } from "@getpaseo/plugin";

// Cool paper / ink: slight blue chroma (B ≥ G ≥ R). Accent equals foreground — no hue on chrome.
export const MONO_THEMES: readonly PluginThemeContribution[] = [
  {
    id: "mono-dark",
    name: "Mono Dark",
    appearance: "dark",
    colors: {
      background: "#16181c",
      foreground: "#eaedf0",
      raised: "#1e2126",
      control: "#272b31",
      border: "#32363d",
      accent: "#eaedf0",
      mutedForeground: "#8b939e",
      ring: "#6d7580",
    },
  },
  {
    id: "mono-light",
    name: "Mono Light",
    appearance: "light",
    colors: {
      background: "#f3f5f7",
      foreground: "#1a1d21",
      raised: "#eaedf0",
      control: "#e1e5ea",
      border: "#d0d6dd",
      accent: "#1a1d21",
      mutedForeground: "#6d7580",
      ring: "#8b939e",
    },
  },
];
