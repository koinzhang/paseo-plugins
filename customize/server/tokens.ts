import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { Entry } from "../shared/contracts.ts";
import { isDir, readText } from "./scan-kit.ts";

/**
 * Script-aware token estimate for configuration content.
 *
 * `ceil(ascii / 4 + cjk / 1.5 + otherBytes / 3)` — close to BPE for prose and code
 * without shipping a tokenizer. CJK, kana, Hangul, fullwidth forms and CJK punctuation
 * tokenize far denser than ASCII, so a plain `bytes / 4` would undercount them.
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
  return Math.ceil(ascii / 4 + dense / 1.5 + otherBytes / 3);
}

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

function collectPromptFiles(dir: string, depth: number, out: string[]): void {
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
      collectPromptFiles(full, depth + 1, out);
    } else if (PROMPT_EXTENSIONS.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
      out.push(full);
    }
  }
}

/** Sum of the package's bundled component prompts (`skills`, `commands`, `agents`, `rules`, `instructions`). */
export function pluginTokens(root: string): number {
  const files: string[] = [];
  for (const component of COMPONENT_DIRS) {
    const dir = path.join(root, component);
    if (isDir(dir)) collectPromptFiles(dir, 1, files);
  }
  let total = 0;
  for (const file of files) total += fileTokens(file) ?? 0;
  return total;
}

/** Package root for a plugin row: a directory target, or the parent of a `*.json` manifest. */
function pluginRoot(file: string): string | undefined {
  if (isDir(file)) return file;
  if (!file.toLowerCase().endsWith(".json")) return undefined;
  const dir = path.dirname(file);
  return /^\..+-plugin$/.test(path.basename(dir)) ? path.dirname(dir) : dir;
}

/** Content tokens for one entry; MCP and non-package plugin rows have none. */
export function entryTokens(entry: Entry): number | undefined {
  if (entry.category === "mcp") return undefined;
  if (entry.category === "plugins") {
    const root = pluginRoot(entry.path);
    if (!root) return undefined;
    const tokens = pluginTokens(root);
    return tokens > 0 ? tokens : undefined;
  }
  return fileTokens(entry.path);
}

/** Attaches `tokens` to every countable entry. Runs after alias merging so a skill is counted once. */
export function withTokens(entries: readonly Entry[]): Entry[] {
  return entries.map((entry) => {
    const tokens = entryTokens(entry);
    return tokens ? { ...entry, tokens } : entry;
  });
}
