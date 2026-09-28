import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { Category, Entry, TokenCost } from "../shared/contracts.ts";
import { fmString } from "./frontmatter.ts";
import { isDir, readMarkdown, readText } from "./scan-kit.ts";

/**
 * Script-aware token estimate for configuration content.
 *
 * `ceil(ascii / 4 + cjk * 1.05 + otherBytes / 3)` — calibrated against `o200k_base`
 * (GPT-4o / GPT-5 family) on 2168 local markdown / code / config files, including
 * Chinese `AGENTS.md` files: MAPE 10% overall and 9.7% on CJK content, with a slight
 * conservative bias. ASCII prose and code run 4.0–4.6 chars per token; CJK, kana,
 * Hangul, fullwidth forms and CJK punctuation cost about one token per character, so
 * a plain `bytes / 4` undercounts them by 1.5–2x. Claude-family tokenizers run another
 * 10–20% denser on CJK, which this estimate does not add.
 */
export function estimateTokens(text: string): number {
  let ascii = 0;
  let dense = 0;
  let otherBytes = 0;
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    if (cp <= 0x7f) ascii++;
    else if (isDense(cp)) dense++;
    else otherBytes += cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
  }
  return Math.ceil(ascii / 4 + dense * CJK_TOKENS_PER_CHAR + otherBytes / 3);
}

/** Fitted on `o200k_base`: one CJK character is about one token. */
const CJK_TOKENS_PER_CHAR = 1.05;

function isDense(cp: number): boolean {
  return (cp >= 0x2e80 && cp <= 0x303f) // CJK radicals, Kangxi, CJK symbols and punctuation
    || (cp >= 0x3040 && cp <= 0x30ff) // Hiragana, Katakana
    || (cp >= 0x3130 && cp <= 0x318f) // Hangul compatibility jamo
    || (cp >= 0x3400 && cp <= 0x4dbf) // CJK extension A
    || (cp >= 0x4e00 && cp <= 0x9fff) // CJK unified ideographs
    || (cp >= 0xa960 && cp <= 0xa97f) // Hangul jamo extended-A
    || (cp >= 0xac00 && cp <= 0xd7af) // Hangul syllables
    || (cp >= 0xf900 && cp <= 0xfaff) // CJK compatibility ideographs
    || (cp >= 0xff00 && cp <= 0xffef) // Halfwidth and fullwidth forms
    || (cp >= 0x20000 && cp <= 0x3ffff); // CJK extensions B+
}

/** Largest read for counting; longer files are counted from their first 4 MiB. */
const MAX_READ_BYTES = 4 * 1024 * 1024;
/** Prompt-bearing files inside a plugin package; code and packaging are not context. */
const PROMPT_EXTENSIONS = [".md", ".markdown", ".mdc", ".rules", ".txt"] as const;
/** Plugin component directories. A plugin root is never walked as a whole. */
const COMPONENT_DIRS = ["skills", "commands", "agents", "rules", "instructions"] as const;
const SKIP_DIRS = new Set(["node_modules", "dist", "build", "out", "coverage", "vendor", "target", "__pycache__"]);
const MAX_WALK_DEPTH = 6;
const MAX_WALK_FILES = 500;

const counts = new Map<string, number>();

/** Cached by path + mtime + size so repeated scans re-read nothing. */
export function fileTokens(file: string): number | undefined {
  let key: string;
  try {
    const stat = statSync(file);
    if (!stat.isFile()) return undefined;
    key = `${file}\u0000${stat.mtimeMs}\u0000${stat.size}`;
  } catch {
    return undefined;
  }
  const hit = counts.get(key);
  if (hit !== undefined) return hit;
  const text = readText(file, MAX_READ_BYTES);
  if (text == null) return undefined;
  const tokens = estimateTokens(text);
  if (counts.size >= 4096) counts.clear();
  counts.set(key, tokens);
  return tokens;
}

function collectComponentFiles(dir: string, component: string, depth: number, out: Array<{ file: string; component: string }>): void {
  if (depth > MAX_WALK_DEPTH || out.length >= MAX_WALK_FILES) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (out.length >= MAX_WALK_FILES) return;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() || (entry.isSymbolicLink() && isDir(full))) {
      if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
      collectComponentFiles(full, component, depth + 1, out);
    } else if (PROMPT_EXTENSIONS.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
      out.push({ file: full, component });
    }
  }
}

/** `name` + `description` as a provider advertises them before the body loads. */
function advertisedTokens(file: string): number {
  const doc = readMarkdown(file);
  const name = (doc ? fmString(doc.data, "name") : undefined) ?? path.basename(file, path.extname(file));
  return estimateTokens(`${name}\n${doc?.description ?? ""}`);
}

/** Component kinds that load on demand; everything else in a package is always-on content. */
const ON_DEMAND_COMPONENTS: ReadonlySet<string> = new Set(["skills", "commands", "agents"]);

/** Skills, commands, and agents are advertised by name + description; the body arrives on invoke. */
function isAdvertisedFile(component: string, file: string): boolean {
  if (component === "skills") return path.basename(file) === "SKILL.md";
  return component === "commands" || component === "agents";
}

/** Split of a plugin package's bundled component prompts (`skills`, `commands`, `agents`, `rules`, `instructions`). */
export function pluginTokens(root: string): TokenCost {
  const files: Array<{ file: string; component: string }> = [];
  for (const component of COMPONENT_DIRS) {
    const dir = path.join(root, component);
    if (isDir(dir)) collectComponentFiles(dir, component, 1, files);
  }
  let atRest = 0;
  let onInvoke = 0;
  for (const { file, component } of files) {
    const full = fileTokens(file) ?? 0;
    if (!full) continue;
    if (!ON_DEMAND_COMPONENTS.has(component)) {
      atRest += full;
      continue;
    }
    if (!isAdvertisedFile(component, file)) {
      onInvoke += full;
      continue;
    }
    const advertised = Math.min(advertisedTokens(file), full);
    atRest += advertised;
    onInvoke += full - advertised;
  }
  return { atRest, onInvoke };
}

/** Package root for a plugin row: a directory target, or the parent of a `*.json` manifest. */
function pluginRoot(file: string): string | undefined {
  if (isDir(file)) return file;
  if (!file.toLowerCase().endsWith(".json")) return undefined;
  const dir = path.dirname(file);
  return /^\..+-plugin$/.test(path.basename(dir)) ? path.dirname(dir) : dir;
}

/** Categories whose body is loaded on demand: the provider advertises name + description first. */
const ON_DEMAND: ReadonlySet<Category> = new Set<Category>(["skills", "commands", "subagents"]);

/** Context cost of one entry; MCP, disabled, and non-package plugin rows have none. */
export function entryTokens(entry: Entry): TokenCost | undefined {
  if (entry.category === "mcp") return undefined;
  if (entry.status === "disabled" || entry.status === "inactive") return undefined;
  if (entry.category === "plugins") {
    const root = pluginRoot(entry.path);
    if (!root) return undefined;
    const cost = pluginTokens(root);
    return cost.atRest || cost.onInvoke ? cost : undefined;
  }
  const full = fileTokens(entry.path);
  if (!full) return undefined;
  if (!ON_DEMAND.has(entry.category)) return { atRest: full, onInvoke: 0 };
  // Manual-only entries are not advertised, so the whole file arrives on invoke.
  if (entry.status === "manual") return { atRest: 0, onInvoke: full };
  const advertised = Math.min(estimateTokens(`${entry.name}\n${entry.description ?? ""}`), full);
  return { atRest: advertised, onInvoke: full - advertised };
}

/** Attaches `tokens` to every countable entry. Runs after alias merging so a skill is counted once. */
export function withTokens(entries: readonly Entry[]): Entry[] {
  return entries.map((entry) => {
    const tokens = entryTokens(entry);
    return tokens ? { ...entry, tokens } : entry;
  });
}
