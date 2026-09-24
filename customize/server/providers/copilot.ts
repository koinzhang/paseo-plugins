import path from "node:path";
import { fmList } from "../frontmatter.ts";
import { mcpEntry, serversOf } from "../mcp.ts";
import {
  EntrySink,
  findSkills,
  isFile,
  listFiles,
  parentDirs,
  readJson,
  readMarkdown,
  skillEntry,
  skillInvocation,
  type ScanContext,
} from "../scan-kit.ts";
import type { Entry, Scope } from "../../shared/contracts.ts";

export function scanCopilot(ctx: ScanContext): Entry[] {
  const sink = new EntrySink(ctx);
  const home = ctx.env.COPILOT_HOME?.trim() || path.join(ctx.home, ".copilot");

  // Instructions ------------------------------------------------------------
  const instruction = (file: string, scope: Scope) => {
    if (!isFile(file)) return;
    const doc = readMarkdown(file);
    sink.add({
      category: "instructions",
      scope,
      name: path.relative(scope === "project" && ctx.projectRoot ? ctx.projectRoot : home, file),
      path: file,
      ...(doc?.description ? { description: doc.description } : {}),
      status: "auto",
    });
  };
  if (ctx.projectRoot) {
    for (const name of ["AGENTS.md", "CLAUDE.md", "GEMINI.md", path.join(".github", "copilot-instructions.md")]) {
      instruction(path.join(ctx.projectRoot, name), "project");
    }
  }
  instruction(path.join(home, "copilot-instructions.md"), "user");

  // Rules -------------------------------------------------------------------
  const rules = (root: string, scope: Scope) => {
    for (const file of listFiles(root, [".instructions.md"], true)) {
      const doc = readMarkdown(file);
      const applyTo = doc ? fmList(doc.data, "applyTo") : undefined;
      sink.add({
        category: "rules",
        scope,
        name: path.relative(root, file),
        path: file,
        root,
        ...(doc?.description ? { description: doc.description } : {}),
        status: applyTo && applyTo !== "**" ? "conditional" : "auto",
        reason: applyTo ? { code: "globs", value: `applyTo: ${applyTo}` } : { code: "always" },
      });
    }
  };
  if (ctx.projectRoot) rules(path.join(ctx.projectRoot, ".github", "instructions"), "project");
  rules(path.join(home, "instructions"), "user");

  // Skills ------------------------------------------------------------------
  const skills = (root: string, scope: Scope, tags: Entry["tags"] = []) => {
    for (const skill of findSkills(root, { recursive: false })) {
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
  if (ctx.projectRoot) {
    skills(path.join(ctx.projectRoot, ".github", "skills"), "project");
    skills(path.join(ctx.projectRoot, ".agents", "skills"), "project");
    skills(path.join(ctx.projectRoot, ".claude", "skills"), "project", ["legacy"]);
    for (const dir of parentDirs(ctx.projectRoot)) skills(path.join(dir, ".github", "skills"), "project", ["parent"]);
    for (const file of listFiles(path.join(ctx.projectRoot, ".claude", "commands"), [".md"], false)) {
      const doc = readMarkdown(file);
      const manual = doc?.data["disable-model-invocation"] === true;
      sink.add({
        category: "skills",
        scope: "project",
        name: `/${path.basename(file, ".md")}`,
        path: file,
        ...(doc?.description ? { description: doc.description } : {}),
        status: manual ? "manual" : "auto",
        ...(manual ? { reason: { code: "frontmatter" as const, value: "disable-model-invocation: true" } } : {}),
        tags: ["command"],
      });
    }
  }
  skills(path.join(home, "skills"), "user");
  skills(path.join(ctx.home, ".agents", "skills"), "user");
  for (const dir of (ctx.env.COPILOT_SKILLS_DIRS ?? "").split(",").map((item) => item.trim()).filter(Boolean)) {
    skills(path.resolve(dir), "user");
  }

  // MCP ---------------------------------------------------------------------
  if (ctx.projectRoot) {
    for (const rel of [".mcp.json", path.join(".github", "mcp.json")]) {
      const file = path.join(ctx.projectRoot, rel);
      for (const [name, config] of serversOf(readJson(file))) {
        sink.add(mcpEntry({ name, config, file, source: rel, scope: "project", status: "auto", tags: ["trust"] }));
      }
    }
  }
  const userMcp = path.join(home, "mcp-config.json");
  for (const [name, config] of serversOf(readJson(userMcp))) {
    sink.add(mcpEntry({ name, config, file: userMcp, source: "~/.copilot/mcp-config.json", scope: "user", status: "auto" }));
  }

  return sink.entries;
}
