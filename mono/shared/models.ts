// A type alias (not an interface) so values stay assignable to the settings RPC's JSON input.
export type ModelRef = {
  provider: string;
  modelId: string;
};

export interface ProviderTitleSource {
  provider: string;
  label?: string;
}

function sameModel(a: ModelRef, b: ModelRef): boolean {
  return a.provider === b.provider && a.modelId === b.modelId;
}

export function isModelHidden(hidden: readonly ModelRef[], ref: ModelRef): boolean {
  return hidden.some((item) => sameModel(item, ref));
}

export function setModelHidden(
  hidden: readonly ModelRef[],
  ref: ModelRef,
  hide: boolean,
): ModelRef[] {
  const rest = hidden.filter((item) => !sameModel(item, ref));
  return hide ? [...rest, { provider: ref.provider, modelId: ref.modelId }] : rest;
}

/** Subtracts hidden models from a provider's picker count; `knownModelIds` drops stale entries when available. */
export function visibleModelCount(
  hidden: readonly ModelRef[],
  provider: string,
  total: number,
  knownModelIds?: ReadonlySet<string>,
): number {
  const hiddenCount = hidden.filter(
    (ref) => ref.provider === provider && (!knownModelIds || knownModelIds.has(ref.modelId)),
  ).length;
  return Math.max(0, total - hiddenCount);
}

/** Replaces the first number in a localized "N models" label; English plurals are adjusted. */
export function rewriteModelCount(text: string, count: number): string {
  const replaced = text.replace(/\d+/, String(count));
  return count === 1
    ? replaced.replace(/\bmodels\b/, "model")
    : replaced.replace(/\bmodel\b/, "models");
}

export function parseModelCount(text: string): number | null {
  const match = /\d+/.exec(text);
  return match ? Number(match[0]) : null;
}

function cssString(value: string): string {
  return `"${value.replace(/["\\]/g, "\\$&").replace(/\n/g, "\\a ")}"`;
}

export function modelRowSelector(ref: ModelRef): string {
  return `[data-testid=${cssString(`model-row-${ref.provider}-${ref.modelId}`)}]`;
}

/** Hides each picker row and its hover-boundary wrapper so the list leaves no gap. */
export function hiddenModelsCss(hidden: readonly ModelRef[]): string {
  if (hidden.length === 0) return "";
  const selectors = hidden.flatMap((ref) => {
    const row = modelRowSelector(ref);
    return [row, `:has(> ${row})`];
  });
  return `${selectors.join(",\n")} {
  display: none !important;
}
`;
}

/** Maps the provider sheet title (`label ?? provider`) to a provider ID; ambiguous titles are dropped. */
export function providerIdsByTitle(providers: readonly ProviderTitleSource[]): Map<string, string> {
  const result = new Map<string, string>();
  const ambiguous = new Set<string>();
  for (const { provider, label } of providers) {
    const title = (label ?? provider).trim();
    if (!title || ambiguous.has(title)) continue;
    const existing = result.get(title);
    if (existing !== undefined && existing !== provider) {
      result.delete(title);
      ambiguous.add(title);
      continue;
    }
    result.set(title, provider);
  }
  return result;
}
