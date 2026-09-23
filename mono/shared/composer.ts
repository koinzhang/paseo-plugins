export const DICTATION_ICON_PATH = "M19 10v2a7 7 0 0 1-14 0v-2";
export const VOICE_MODE_ICON_PATHS = ["M10 3v18", "M22 10v3"] as const;

export const DICTATION_BUTTON_SELECTOR = `[role="button"]:has(path[d="${DICTATION_ICON_PATH}"])`;
export const VOICE_MODE_BUTTON_SELECTOR = `[role="button"]${VOICE_MODE_ICON_PATHS.map(
  (d) => `:has(path[d="${d}"])`,
).join("")}`;

export function hiddenVoiceButtonSelectors(settings: {
  hideDictation: boolean;
  hideVoiceMode: boolean;
}): string[] {
  const selectors: string[] = [];
  if (settings.hideDictation) selectors.push(DICTATION_BUTTON_SELECTOR);
  if (settings.hideVoiceMode) selectors.push(VOICE_MODE_BUTTON_SELECTOR);
  return selectors;
}
