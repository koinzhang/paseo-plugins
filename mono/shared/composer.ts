// Neither composer voice button has a test ID, and their labels are localized,
// so match the Lucide glyphs (lucide-react-native 0.546) Paseo renders in them.
export const DICTATION_ICON_PATH = "M19 10v2a7 7 0 0 1-14 0v-2";
export const VOICE_MODE_ICON_PATHS = ["M10 3v18", "M22 10v3"] as const;

export const VOICE_BUTTON_SELECTORS = [
  `[role="button"]:has(path[d="${DICTATION_ICON_PATH}"])`,
  `[role="button"]${VOICE_MODE_ICON_PATHS.map((d) => `:has(path[d="${d}"])`).join("")}`,
] as const;
