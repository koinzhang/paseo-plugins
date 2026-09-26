export interface ResolvableOption {
  id: string;
  label?: string;
  aliases?: readonly string[];
}

export type ResolveResult<T extends ResolvableOption> =
  | { kind: "match"; option: T }
  | { kind: "ambiguous"; candidates: T[] }
  | { kind: "not-found" };

export interface ResolveOptionConfig {
  /** Substring matching is off for large catalogs of similar IDs such as models. */
  substring?: boolean;
}

/** Case-insensitive, and treats runs of spaces, `_` and `-` as one separator. */
export function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "-");
}

function keysOf(option: ResolvableOption): string[] {
  const keys = [option.id];
  if (option.label) keys.push(option.label);
  if (option.aliases) keys.push(...option.aliases);
  return keys;
}

/**
 * Matches in order: exact, case-insensitive exact, unique prefix, then unique
 * substring. The first stage with any hit decides; several hits are ambiguous.
 */
export function resolveOption<T extends ResolvableOption>(
  input: string,
  options: readonly T[],
  config: ResolveOptionConfig = {},
): ResolveResult<T> {
  const raw = input.trim();
  if (!raw) return { kind: "not-found" };
  const query = normalizeKey(raw);
  const stages: Array<(key: string) => boolean> = [
    (key) => key === raw,
    (key) => normalizeKey(key) === query,
    (key) => normalizeKey(key).startsWith(query),
  ];
  if (config.substring !== false) stages.push((key) => normalizeKey(key).includes(query));

  for (const test of stages) {
    const hits = options.filter((option) => keysOf(option).some(test));
    if (hits.length === 1) return { kind: "match", option: hits[0] as T };
    if (hits.length > 1) return { kind: "ambiguous", candidates: hits };
  }
  return { kind: "not-found" };
}

const LIST_LIMIT = 12;

export function formatList(values: readonly string[]): string {
  if (values.length <= LIST_LIMIT) return values.join(", ");
  return `${values.slice(0, LIST_LIMIT).join(", ")}, … (+${values.length - LIST_LIMIT})`;
}

/** Returns the option or throws a short, user-facing error. */
export function requireOption<T extends ResolvableOption>(
  noun: string,
  input: string,
  options: readonly T[],
  config?: ResolveOptionConfig,
): T {
  const result = resolveOption(input, options, config);
  if (result.kind === "match") return result.option;
  if (result.kind === "ambiguous") {
    throw new Error(
      `Ambiguous ${noun} "${input.trim()}".\nCandidates: ${formatList(result.candidates.map((option) => option.id))}`,
    );
  }
  throw new Error(
    `Unknown ${noun} "${input.trim()}".\nAvailable: ${formatList(options.map((option) => option.id))}`,
  );
}
