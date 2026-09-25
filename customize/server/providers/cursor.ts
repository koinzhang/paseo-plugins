import path from "node:path";
import { fmList, fmString, type Frontmatter } from "../frontmatter.ts";
import { agentPluginManifest } from "../agent-plugins.ts";
import { mcpEntry, serversOf } from "../mcp.ts";
import {
  EntrySink,
  findSkills,
  isDir,
  isFile,
  listFiles,
  listNames,
  nestedWith,
  readJson,
  readMarkdown,
  skillEntry,
  skillInvocation,
  type EntryInput,
  type ScanContext,
} from "../scan-kit.ts";
import type { Entry, Scope } from "../../shared/contracts.ts";
import { cursorThirdPartySwitch } from "../compatibility.ts";

/** cursor-agent `workspace-paths` slug: non-alphanumerics → `-`, collapsed and trimmed. */
export function cursorProjectSlug(root: string): string {
  return root.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}

/** Cursor / OMP `.mdc` rule semantics from `alwaysApply` / `globs` / `description`. */
export function mdcRuleState(data: Frontmatter): Pick<EntryInput, "status" | "reason"> {
  if (data.alwaysApply === true || data.alwaysApply === "true") return { status: "auto", reason: { code: "always" } };
  const globs = fmList(data, "globs");
  if (globs) return { status: "conditional", reason: { code: "globs", value: `globs: ${globs}` } };
  if (fmString(data, "description")) return { status: "conditional", reason: { code: "agentDecides" } };
  return { status: "manual", reason: { code: "manualMention" } };
}

export function scanCursor(ctx: ScanContext): Entry[] {
  const sink = new EntrySink(ctx);
  const cursorHome = ctx.env.CURSOR_CONFIG_DIR?.trim() || path.join(ctx.home, ".cursor");
  const thirdParty = cursorThirdPartySwitch(ctx);

  // Instructions ------------------------------------------------------------
  const instruction = (file: string, extra: Partial<EntryInput> = {}) => {
    if (!isFile(file)) return;
    const doc = readMarkdown(file);
    sink.add({
      category: "instructions",
      scope: "project",
      name: path.basename(file),
      path: file,
      ...(doc?.description ? { description: doc.description } : {}),
      status: "auto",
      ...extra,
    });
  };
  if (ctx.projectRoot) {
    for (const name of ["AGENTS.md", "CLAUDE.md", "CLAUDE.local.md"]) instruction(path.join(ctx.projectRoot, name));
    instruction(path.join(ctx.projectRoot, ".cursorrules"), { tags: ["legacy"] });
    for (const dir of nestedWith(ctx, "AGENTS.md")) {
      instruction(path.join(dir, "AGENTS.md"), {
        status: "conditional",
        reason: { code: "nestedDir", value: path.relative(ctx.projectRoot, dir) },
        tags: ["nested"],
      });
    }
  }

  // Rules -------------------------------------------------------------------
  const rules = (root: string, scope: Scope, nestedDir?: string) => {
    for (const file of listFiles(root, [".mdc", ".md"], true)) {
      const doc = readMarkdown(file);
      const base = {
        category: "rules" as const,
        scope,
        name: path.relative(root, file),
        path: file,
        root,
        ...(doc?.description ? { description: doc.description } : {}),
        tags: nestedDir ? (["nested"] as Entry["tags"]) : [],
      };
      if (!file.toLowerCase().endsWith(".mdc")) {
        sink.add({ ...base, status: "inactive", reason: { code: "ignoredExt", value: ".md" } });
        continue;
      }
      const state = mdcRuleState(doc?.data ?? {});
      if (nestedDir && state.status === "auto") {
        sink.add({ ...base, status: "conditional", reason: { code: "nestedDir", value: nestedDir } });
      } else {
        sink.add({ ...base, ...state });
      }
    }
  };
  if (ctx.projectRoot) {
    rules(path.join(ctx.projectRoot, ".cursor", "rules"), "project");
    for (const dir of nestedWith(ctx, ".cursor")) {
      const root = path.join(dir, ".cursor", "rules");
      if (isDir(root)) rules(root, "project", path.relative(ctx.projectRoot, dir));
    }
  }

  // Skills ------------------------------------------------------------------
  const skills = (root: string, scope: Scope, tags: Entry["tags"] = [], nestedDir?: string, external = false) => {
    for (const skill of findSkills(root, { recursive: true, maxDepth: 6 })) {
      const base = skillEntry(skill, root, scope);
      const invocation = skillInvocation(skill.doc);
      const allTags = [...(base.tags ?? []), ...invocation.tags, ...tags];
      const paths = fmList(skill.doc.data, "paths") ?? fmList(skill.doc.data, "globs");
      if (external && thirdParty.enabled === false) {
        sink.add({ ...base, tags: allTags, status: "disabled", reason: { code: "config", value: "thirdPartyExtensibilityEnabled: false" } });
      } else if (invocation.status === "manual") {
        sink.add({ ...base, tags: allTags, status: "manual", ...(invocation.reason ? { reason: invocation.reason } : {}) });
      } else if (paths) {
        sink.add({ ...base, tags: allTags, status: "conditional", reason: { code: "globs", value: `paths: ${paths}` } });
      } else if (nestedDir) {
        sink.add({ ...base, tags: allTags, status: "conditional", reason: { code: "nestedDir", value: nestedDir } });
      } else {
        sink.add({ ...base, tags: allTags, status: "auto" });
      }
    }
  };
  const PROJECT_SKILL_DIRS = [".agents", ".cursor", ".claude", ".codex"] as const;
  if (ctx.projectRoot) {
    for (const base of PROJECT_SKILL_DIRS) {
      skills(path.join(ctx.projectRoot, base, "skills"), "project", base === ".claude" || base === ".codex" ? ["legacy"] : [], undefined, base === ".claude" || base === ".codex");
    }
    for (const base of PROJECT_SKILL_DIRS) {
      for (const dir of nestedWith(ctx, base)) {
        const root = path.join(dir, base, "skills");
        if (isDir(root)) skills(root, "project", ["nested"], path.relative(ctx.projectRoot, dir), base === ".claude" || base === ".codex");
      }
    }
  }
  skills(path.join(ctx.home, ".agents", "skills"), "user");
  skills(path.join(cursorHome, "skills"), "user");
  skills(path.join(ctx.home, ".claude", "skills"), "user", ["legacy"], undefined, true);
  skills(path.join(ctx.home, ".codex", "skills"), "user", ["legacy"], undefined, true);
  skills(path.join(cursorHome, "skills-cursor"), "user", ["builtin"]);

  // MCP ---------------------------------------------------------------------
  const disabledFile = ctx.projectRoot ? path.join(cursorHome, "projects", cursorProjectSlug(ctx.projectRoot), "mcp-disabled.json") : null;
  const disabledRaw = disabledFile ? readJson(disabledFile) : undefined;
  const disabled = new Set(Array.isArray(disabledRaw) ? disabledRaw.filter((name): name is string => typeof name === "string") : []);
  const servers = (file: string, scope: Scope, source: string) => {
    for (const [name, config] of serversOf(readJson(file))) {
      const off = disabled.has(name);
      sink.add(
        mcpEntry({
          name,
          config,
          file,
          source,
          scope,
          status: off ? "disabled" : "auto",
          ...(off ? { reason: { code: "config", value: "mcp-disabled.json" } } : {}),
        }),
      );
    }
  };
  if (ctx.projectRoot) servers(path.join(ctx.projectRoot, ".cursor", "mcp.json"), "project", ".cursor/mcp.json");
  servers(path.join(cursorHome, "mcp.json"), "user", "~/.cursor/mcp.json");

  const extraFiles = (category: "commands" | "subagents", root: string, scope: Scope, tags: Entry["tags"] = []) => {
      for (const file of listFiles(root, [".md"], true)) {
        const doc = readMarkdown(file);
        const off = category === "subagents" && tags.includes("legacy") && thirdParty.enabled === false;
        sink.add({ category, scope, name: path.relative(root, file), path: file, root, status: off ? "disabled" : "auto", ...(off ? { reason: { code: "config", value: "thirdPartyExtensibilityEnabled: false" } } : {}), tags, ...(doc?.description ? { description: doc.description } : {}) });
      }
  };
  if (ctx.projectRoot) {
    extraFiles("commands", path.join(ctx.projectRoot, ".cursor", "commands"), "project");
    for (const base of [".cursor", ".claude", ".codex"]) extraFiles("subagents", path.join(ctx.projectRoot, base, "agents"), "project", base === ".cursor" ? [] : ["legacy"]);
    const standardManifest = path.join(ctx.projectRoot, "plugin.json");
    const manifest = isFile(standardManifest) ? standardManifest : path.join(ctx.projectRoot, ".cursor-plugin", "plugin.json");
    if (isFile(manifest)) {
      sink.add({ category: "plugins", scope: "project", name: path.basename(ctx.projectRoot), path: manifest, status: "conditional", reason: { code: "config", value: "Activation is not verified" }, agentPlugin: agentPluginManifest(standardManifest) ?? undefined });
      extraFiles("commands", path.join(ctx.projectRoot, "commands"), "project");
      extraFiles("subagents", path.join(ctx.projectRoot, "agents"), "project");
    }
  }
  extraFiles("commands", path.join(cursorHome, "commands"), "user");
  for (const base of [cursorHome, path.join(ctx.home, ".claude"), path.join(ctx.home, ".codex")]) extraFiles("subagents", path.join(base, "agents"), "user", base === cursorHome ? [] : ["legacy"]);

  const localPlugins = path.join(cursorHome, "plugins", "local");
  for (const name of listNames(localPlugins)) {
    const root = path.join(localPlugins, name);
    if (!isDir(root)) continue;
    const standardManifest = path.join(root, "plugin.json");
    const manifest = isFile(standardManifest) ? standardManifest : path.join(root, ".cursor-plugin", "plugin.json");
    if (!isFile(manifest)) continue;
    sink.add({ category: "plugins", scope: "user", name, path: manifest, root: localPlugins, status: "conditional", reason: { code: "config", value: "Activation is not verified" }, agentPlugin: agentPluginManifest(standardManifest) ?? undefined });
  }

  return sink.entries;
}
