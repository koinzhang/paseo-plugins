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

// accessibilityLabel when ContextWindowMeter has no token data. Copied from
// Paseo i18n contextWindow.accessibilityNoData. French uses a nbsp before ":".
const NO_CONTEXT_METER_LABELS = new Set([
  "Context window: No context data",
  "上下文窗口：暂无上下文数据",
  "コンテキストウィンドウ：コンテキストデータがありません",
  "컨텍스트 창: 컨텍스트 데이터 없음",
  "Контекстное окно: нет данных о контексте",
  "Fenêtre de contexte\u00a0: aucune donnée de contexte",
  "Ventana de contexto: No hay datos de contexto",
  "نافذة السياق: لا توجد بيانات للسياق",
  "Janela de contexto: sem dados de contexto",
]);

/**
 * A track-only ring is one circle. Token data adds the progress circle, including at 0%.
 * If the SVG circles are not in the DOM, fall back to the no-data accessibility label.
 */
export function contextMeterIsEmpty(input: { circleCount: number; label: string | null }): boolean {
  if (input.circleCount >= 2) return false;
  if (input.circleCount === 1) return true;
  return input.label !== null && NO_CONTEXT_METER_LABELS.has(input.label);
}
