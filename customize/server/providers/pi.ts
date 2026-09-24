import path from "node:path";
import {
  EntrySink,
  findSkills,
  isFile,
  isRecord,
  parentDirs,
  readJson,
  readMarkdown,
  skillEntry,
  skillInvocation,
  type ScanContext,
} from "../scan-kit.ts";
import type { Entry, Scope } from "../../shared/contracts.ts";

/** Per-directory context file order; `AGENTS.override.md` replaces the rest in the same directory. */
const CONTEXT_FILES = ["AGENTS.override.md", "AGENTS.md", "AGENTS.MD", "CLAUDE.md", "CLAUDE.MD"] as const;

export function scanPi(ctx: ScanContext): Entry[] {
  const sink = new EntrySink(ctx);
  const agentDir = ctx.env.PI_CODING_AGENT_DIR?.trim() || path.join(ctx.home, ".pi", "agent");

  // Instructions ------------------------------------------------------------
  const contextDir = (dir: string, scope: Scope, tags: Entry["tags"] = []) => {
    // Case-insensitive filesystems report both spellings; keep one per real file.
    const found: string[] = [];
    for (const name of CONTEXT_FILES) {
      const file = path.join(dir, name);
      if (isFile(file) && !found.some((existing) => existing.toLowerCase() === file.toLowerCase())) found.push(file);
    }
    found.forEach((file, index) => {
      const doc = readMarkdown(file);
      sink.add({
        category: "instructions",
        scope,
        name: path.basename(file),
        path: file,
        ...(doc?.description ? { description: doc.description } : {}),
        status: index === 0 ? "auto" : "inactive",
        ...(index > 0 ? { reason: { code: "shadowedBy" as const, value: path.basename(found[0]!) } } : {}),
        tags,
      });
    });
  };
  const systemFiles = (dir: string, scope: Scope) => {
    for (const [name, tag] of [["SYSTEM.md", "systemPrompt"], ["APPEND_SYSTEM.md", "appendPrompt"]] as const) {
      const file = path.join(dir, name);
      if (!isFile(file)) continue;
      const doc = readMarkdown(file);
      sink.add({
        category: "instructions",
        scope,
        name,
        path: file,
        ...(doc?.description ? { description: doc.description } : {}),
        status: "auto",
        tags: [tag, ...(scope === "project" ? (["trust"] as Entry["tags"]) : [])],
      });
    }
  };
  contextDir(agentDir, "user");
  systemFiles(agentDir, "user");
  if (ctx.projectRoot) {
    contextDir(ctx.projectRoot, "project");
    for (const dir of parentDirs(ctx.projectRoot)) contextDir(dir, "project", ["parent"]);
    systemFiles(path.join(ctx.projectRoot, ".pi"), "project");
  }

  // Skills ------------------------------------------------------------------
  const skills = (root: string, scope: Scope, loose: boolean, tags: Entry["tags"] = []) => {
    for (const skill of findSkills(root, { recursive: true, maxDepth: 8, looseMarkdown: loose })) {
      const base = skillEntry(skill, root, scope);
      const invocation = skillInvocation(skill.doc);
      sink.add({
        ...base,
        tags: [...(base.tags ?? []), ...invocation.tags, ...tags],
        status: invocation.status,
        ...(invocation.reason ? { reason: invocation.reason } : {}),
      });
    }
  };
  skills(path.join(agentDir, "skills"), "user", true);
  skills(path.join(ctx.home, ".agents", "skills"), "user", false);
  const settingsSkills = (file: string, base: string, scope: Scope) => {
    const settings = readJson(file);
    const list = isRecord(settings) && Array.isArray(settings.skills) ? settings.skills : [];
    for (const item of list) {
      if (typeof item !== "string" || item.startsWith("!") || item.startsWith("-")) continue;
      const raw = item.replace(/^\+/, "");
      const resolved = raw.startsWith("~/") ? path.join(ctx.home, raw.slice(2)) : path.resolve(base, raw);
      skills(resolved, scope, true);
    }
  };
  settingsSkills(path.join(agentDir, "settings.json"), agentDir, "user");
  if (ctx.projectRoot) {
    skills(path.join(ctx.projectRoot, ".pi", "skills"), "project", true, ["trust"]);
    skills(path.join(ctx.projectRoot, ".agents", "skills"), "project", false);
    settingsSkills(path.join(ctx.projectRoot, ".pi", "settings.json"), path.join(ctx.projectRoot, ".pi"), "project");
  }

  return sink.entries;
}
