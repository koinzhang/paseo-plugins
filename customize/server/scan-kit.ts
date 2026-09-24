import { closeSync, lstatSync, openSync, readdirSync, readSync, statSync } from "node:fs";
import path from "node:path";
import type { Category, Entry, ReasonCode, Scope, Status, Tag } from "../shared/contracts.ts";
import { firstLine, fmString, parseFrontmatter, type Frontmatter } from "./frontmatter.ts";

export interface ScanEnv {
  home: string;
  env: Record<string, string | undefined>;
  platform: NodeJS.Platform;
}

export interface ScanContext extends ScanEnv {
  projectRoot: string | null;
  nested: NestedIndex | null;
}

// ---------------------------------------------------------------------------
// Filesystem

export function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

export function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function isSymlink(p: string): boolean {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

export function fileSize(p: string): number {
  try {
    return statSync(p).size;
  } catch {
    return 0;
  }
}

/** Reads at most `maxBytes` (UTF-8, may cut a trailing code point). */
export function readText(p: string, maxBytes = 1024 * 1024): string | null {
  let fd: number | null = null;
  try {
    fd = openSync(p, "r");
    const size = Math.min(statSync(p).size, maxBytes);
    const buf = Buffer.alloc(size);
    const read = readSync(fd, buf, 0, size, 0);
    return buf.subarray(0, read).toString("utf8");
  } catch {
    return null;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

export function readJson(p: string): unknown {
  const text = readText(p);
  if (text == null) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function listNames(dir: string): string[] {
  try {
    return readdirSync(dir).sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `dir`, its parent, … up to and including the filesystem root. */
export function ancestors(dir: string): string[] {
  const out: string[] = [];
  let current = path.resolve(dir);
  for (;;) {
    out.push(current);
    const parent = path.dirname(current);
    if (parent === current) return out;
    current = parent;
  }
}

/** Parents of `dir`, excluding itself, up to the filesystem root. */
export function parentDirs(dir: string): string[] {
  return ancestors(dir).slice(1);
}

// ---------------------------------------------------------------------------
// Nested project index

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "target",
  "vendor",
  "Pods",
  "venv",
  "__pycache__",
  "coverage",
  "DerivedData",
  "bower_components",
]);

export interface NestedIndex {
  root: string;
  /** Directory (absolute, excluding the root) → entry names. */
  dirs: Map<string, Set<string>>;
  truncated: boolean;
}

const NESTED_MAX_DEPTH = 6;
const NESTED_MAX_DIRS = 4000;

/** Breadth-first directory index below `root`; hidden folders are recorded but not entered. */
export function buildNestedIndex(root: string): NestedIndex {
  const dirs = new Map<string, Set<string>>();
  let truncated = false;
  let frontier = [root];
  for (let depth = 0; depth <= NESTED_MAX_DEPTH && frontier.length; depth++) {
    const next: string[] = [];
    for (const dir of frontier) {
      let entries;
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      if (dir !== root) dirs.set(dir, new Set(entries.map((entry) => entry.name)));
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
        if (dirs.size + next.length >= NESTED_MAX_DIRS) {
          truncated = true;
          break;
        }
        next.push(path.join(dir, entry.name));
      }
    }
    frontier = next;
  }
  return { root, dirs, truncated };
}

/** Nested directories (below the project root) that contain `name`. */
export function nestedWith(ctx: ScanContext, name: string): string[] {
  if (!ctx.nested) return [];
  const out: string[] = [];
  for (const [dir, names] of ctx.nested.dirs) if (names.has(name)) out.push(dir);
  return out.sort((a, b) => a.localeCompare(b));
}

// ---------------------------------------------------------------------------
// Display helpers

export function displayPath(ctx: ScanEnv & { projectRoot: string | null }, p: string): string {
  const abs = path.resolve(p);
  if (ctx.projectRoot) {
    const rel = path.relative(ctx.projectRoot, abs);
    if (!rel) return "./";
    if (!rel.startsWith("..") && !path.isAbsolute(rel)) return rel;
  }
  const relHome = path.relative(ctx.home, abs);
  if (!relHome) return "~";
  if (!relHome.startsWith("..") && !path.isAbsolute(relHome)) return `~/${relHome}`;
  return abs;
}

// ---------------------------------------------------------------------------
// Entries

export interface EntryInput {
  category: Category;
  scope: Scope;
  name: string;
  path: string;
  /** Root the entry was discovered under (display source). Defaults to its directory. */
  root?: string;
  /** Overrides the display source (e.g. `~/.claude.json → mcpServers`). */
  source?: string;
  description?: string;
  status: Status;
  reason?: { code: ReasonCode; value?: string };
  tags?: Tag[];
  agentPlugin?: Entry["agentPlugin"];
  mcp?: Entry["mcp"];
}

export class EntrySink {
  readonly entries: Entry[] = [];
  private readonly seen = new Set<string>();
  private readonly ctx: ScanContext;

  constructor(ctx: ScanContext) {
    this.ctx = ctx;
  }

  add(input: EntryInput): Entry | null {
    const id = `${input.category}|${input.scope}|${input.path}|${input.name}`;
    if (this.seen.has(id)) return null;
    this.seen.add(id);
    const dirPath = input.mcp ? input.path : path.dirname(input.path);
    const entry: Entry = {
      id,
      category: input.category,
      scope: input.scope,
      name: input.name,
      ...(input.description ? { description: input.description } : {}),
      path: input.path,
      dir: displayPath(this.ctx, dirPath),
      source: input.source ?? displayPath(this.ctx, input.root ?? path.dirname(input.path)),
      status: input.status,
      ...(input.reason ? { reason: input.reason } : {}),
      tags: [...new Set(input.tags ?? [])],
      ...(input.agentPlugin ? { agentPlugin: input.agentPlugin } : {}),
      ...(input.mcp ? { mcp: input.mcp } : {}),
    };
    this.entries.push(entry);
    return entry;
  }
}

/** Project scope for files under the project root, user scope otherwise. */
export function scopeOf(ctx: ScanContext, p: string): Scope {
  if (!ctx.projectRoot) return "user";
  const rel = path.relative(ctx.projectRoot, p);
  return !rel.startsWith("..") && !path.isAbsolute(rel) ? "project" : "user";
}

// ---------------------------------------------------------------------------
// Markdown files with frontmatter

export interface MarkdownDoc {
  path: string;
  data: Frontmatter;
  body: string;
  description?: string;
}

export function readMarkdown(p: string): MarkdownDoc | null {
  const text = readText(p, 64 * 1024);
  if (text == null) return null;
  const { data, body } = parseFrontmatter(text);
  const description = fmString(data, "description") ?? firstLine(body);
  return { path: p, data, body, ...(description ? { description } : {}) };
}

/** Files under `dir` with one of `exts`; `recursive` descends into non-hidden subfolders. */
export function listFiles(dir: string, exts: readonly string[], recursive: boolean, depth = 0): string[] {
  if (depth > 8) return [];
  const out: string[] = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const directory = entry.isDirectory() || (entry.isSymbolicLink() && isDir(full));
    if (directory) {
      if (recursive && !entry.name.startsWith(".")) out.push(...listFiles(full, exts, true, depth + 1));
    } else if (exts.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Skills

export interface SkillFile {
  /** `SKILL.md` or a loose `.md` skill. */
  file: string;
  /** Skill folder (or the loose file itself). */
  dir: string;
  doc: MarkdownDoc;
  name: string;
  symlink: boolean;
}

export interface SkillScanOptions {
  /** `false` = only `<root>/<name>/SKILL.md`; `true` = any depth up to `maxDepth`. */
  recursive: boolean;
  maxDepth?: number;
  /** Pi: loose `<root>/*.md` files are skills too. */
  looseMarkdown?: boolean;
  /** Directory names to skip at the first level (e.g. Claude `synced`, `.trash`). */
  skip?: readonly string[];
}

export function findSkills(root: string, options: SkillScanOptions): SkillFile[] {
  const out: SkillFile[] = [];
  const maxDepth = options.recursive ? options.maxDepth ?? 6 : 1;
  const visit = (dir: string, depth: number) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (depth === 1 && options.skip?.includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const symlink = entry.isSymbolicLink();
      const directory = entry.isDirectory() || (symlink && isDir(full));
      if (directory) {
        const skillFile = path.join(full, "SKILL.md");
        if (isFile(skillFile)) {
          const doc = readMarkdown(skillFile);
          if (doc) out.push({ file: skillFile, dir: full, doc, name: fmString(doc.data, "name") ?? entry.name, symlink });
          continue;
        }
        if (depth < maxDepth) visit(full, depth + 1);
      } else if (depth === 1 && options.looseMarkdown && entry.name.toLowerCase().endsWith(".md")) {
        const doc = readMarkdown(full);
        if (doc) out.push({ file: full, dir: full, doc, name: fmString(doc.data, "name") ?? entry.name.replace(/\.md$/i, ""), symlink });
      }
    }
  };
  visit(root, 1);
  return out;
}

/** Standard frontmatter switches shared by Claude / Cursor / Copilot / Pi / OMP skills. */
export function skillInvocation(doc: MarkdownDoc): { status: Status; reason?: EntryInput["reason"]; tags: Tag[] } {
  const tags: Tag[] = [];
  if (doc.data["user-invocable"] === false) tags.push("userInvocableOff");
  if (doc.data["disable-model-invocation"] === true) {
    return { status: "manual", reason: { code: "frontmatter", value: "disable-model-invocation: true" }, tags };
  }
  return { status: "auto", tags };
}

export function skillEntry(skill: SkillFile, root: string, scope: Scope): Omit<EntryInput, "status"> {
  return {
    category: "skills",
    scope,
    name: skill.name,
    path: skill.file,
    root,
    ...(skill.doc.description ? { description: skill.doc.description } : {}),
    tags: skill.symlink ? ["symlink"] : [],
  };
}
