// Browser-only bridge: the SDK currently does not expose the app locale.
// Keep DOM access here and call it only on the web platform.
type LanguageElement = { lang: string };
type LanguageObserver = {
  observe(target: LanguageElement, options: { attributes: boolean; attributeFilter: string[] }): void;
  disconnect(): void;
};
const browser = globalThis as unknown as {
  document?: { documentElement: LanguageElement };
  MutationObserver?: new (callback: () => void) => LanguageObserver;
};

export function readAppLanguage(): string {
  const language = browser.document?.documentElement.lang.trim() || "en";
  try {
    return Intl.getCanonicalLocales(language)[0] ?? "en";
  } catch {
    return "en";
  }
}

export function subscribeAppLanguage(onChange: () => void): () => void {
  const root = browser.document?.documentElement;
  if (!root || !browser.MutationObserver) return () => {};
  const observer = new browser.MutationObserver(onChange);
  observer.observe(root, { attributes: true, attributeFilter: ["lang"] });
  return () => observer.disconnect();
}
