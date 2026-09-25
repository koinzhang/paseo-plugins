import path from "node:path";
import { matchGlob } from "../glob.ts";
import { parseJsonc } from "../jsonc.ts";
import { mcpEntry } from "../mcp.ts";
import {
  EntrySink,
  findSkills,
  isFile,
  isRecord,
  listFiles,
  nestedWith,
  readMarkdown,
  readText,
  skillEntry,
  type EntryInput,
  type ScanContext,
} from "../scan-kit.ts";
import type { Entry, Scope } from "../../shared/contracts.ts";
import { opencodeExternalSkillSwitch } from "../compatibility.ts";

function configDir(ctx: ScanContext): string {
  const xdg = ctx.env.XDG_CONFIG_HOME?.trim();
  return path.join(xdg || path.join(ctx.home, ".config"), "opencode");
}

function readConfig(file: string): Record<string, unknown> | null {
  const text = readText(file);
  if (text == null) return null;
  try {
    const value = parseJsonc(text);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function configFiles(dir: string): string[] {
  return ["opencode.json", "opencode.jsonc"].map((name) => path.join(dir, name)).filter(isFile);
}

const truthy = (value: string | undefined) => value != null && value !== "" && value !== "0" && value.toLowerCase() !== "false";

/** Last matching `permission.skill` pattern wins. */
function skillPermission(rules: Array<[string, string]>, name: string): string | undefined {
  let result: string | undefined;
  for (const [pattern, action] of rules) if (matchGlob(pattern, name)) result = action;
  return result;
}

export function scanOpencode(ctx: ScanContext): Entry[] {
  const sink = new EntrySink(ctx);
  const globalDir = configDir(ctx);
  const noClaude = truthy(ctx.env.OPENCODE_DISABLE_CLAUDE_CODE);
  const noClaudePrompt = noClaude || truthy(ctx.env.OPENCODE_DISABLE_CLAUDE_CODE_PROMPT);
  const noClaudeSkills = noClaude || truthy(ctx.env.OPENCODE_DISABLE_CLAUDE_CODE_SKILLS);
  const externalSkills = opencodeExternalSkillSwitch(ctx.env);

  const configs: Array<{ file: string; scope: Scope; data: Record<string, unknown> }> = [];
  for (const file of configFiles(globalDir)) {
    const data = readConfig(file);
    if (data) configs.push({ file, scope: "user", data });
  }
  if (ctx.projectRoot) {
    for (const file of [...configFiles(ctx.projectRoot), ...configFiles(path.join(ctx.projectRoot, ".opencode"))]) {
      const data = readConfig(file);
      if (data) configs.push({ file, scope: "project", data });
    }
  }

  // Instructions ------------------------------------------------------------
  const doc = (file: string, scope: Scope, state: Pick<EntryInput, "status" | "reason">, tags: Entry["tags"] = []) => {
    const md = readMarkdown(file);
    sink.add({
      category: "instructions",
      scope,
      name: path.basename(file),
      path: file,
      ...(md?.description ? { description: md.description } : {}),
      ...state,
      tags,
    });
  };
  const firstWins = (candidates: Array<{ file: string; disabledBy?: string }>, scope: Scope, tags: Entry["tags"] = []) => {
    let winner: string | null = null;
    for (const candidate of candidates) {
      if (!isFile(candidate.file)) continue;
      if (candidate.disabledBy) {
        doc(candidate.file, scope, { status: "disabled", reason: { code: "env", value: candidate.disabledBy } }, tags);
      } else if (winner) {
        doc(candidate.file, scope, { status: "inactive", reason: { code: "shadowedBy", value: path.basename(winner) } }, tags);
      } else {
        winner = candidate.file;
        doc(candidate.file, scope, { status: "auto" }, tags);
      }
    }
  };
  if (ctx.projectRoot) {
    firstWins(
      [
        { file: path.join(ctx.projectRoot, "AGENTS.md") },
        { file: path.join(ctx.projectRoot, "CLAUDE.md"), ...(noClaude ? { disabledBy: "OPENCODE_DISABLE_CLAUDE_CODE" } : {}) },
      ],
      "project",
    );
    for (const dir of nestedWith(ctx, "AGENTS.md")) {
      doc(path.join(dir, "AGENTS.md"), "project", { status: "conditional", reason: { code: "nestedDir", value: path.relative(ctx.projectRoot, dir) } }, ["nested"]);
    }
  }
  firstWins(
    [
      { file: path.join(globalDir, "AGENTS.md") },
      {
        file: path.join(ctx.home, ".claude", "CLAUDE.md"),
        ...(noClaudePrompt ? { disabledBy: noClaude ? "OPENCODE_DISABLE_CLAUDE_CODE" : "OPENCODE_DISABLE_CLAUDE_CODE_PROMPT" } : {}),
      },
    ],
    "user",
  );

  // Rules: `instructions` entries ------------------------------------------
  for (const { file, scope, data } of configs) {
    const list = Array.isArray(data.instructions) ? data.instructions.filter((item): item is string => typeof item === "string") : [];
    const base = scope === "project" && ctx.projectRoot ? ctx.projectRoot : path.dirname(file);
    for (const item of list) {
      if (/^https?:\/\//i.test(item)) {
        sink.add({ category: "rules", scope, name: item, path: item, source: path.basename(file), status: "auto", tags: ["url"] });
        continue;
      }
      const pattern = item.startsWith("~/") ? path.join(ctx.home, item.slice(2)) : path.resolve(base, item);
      const matches = /[*?[{]/.test(pattern) ? expandGlob(pattern) : isFile(pattern) ? [pattern] : [];
      for (const match of matches) {
        const md = readMarkdown(match);
        sink.add({
          category: "rules",
          scope,
          name: path.relative(base, match) || path.basename(match),
          path: match,
          source: `${path.basename(file)} → instructions`,
          ...(md?.description ? { description: md.description } : {}),
          status: "auto",
          reason: { code: "config", value: item },
        });
      }
    }
  }

  // Skills ------------------------------------------------------------------
  const permissions: Array<[string, string]> = [];
  for (const { data } of configs) {
    const skill = isRecord(data.permission) ? data.permission.skill : undefined;
    if (typeof skill === "string") permissions.push(["*", skill]);
    else if (isRecord(skill)) for (const [pattern, action] of Object.entries(skill)) if (typeof action === "string") permissions.push([pattern, action]);
  }
  const skills = (root: string, scope: Scope, external = false, claude = false) => {
    for (const skill of findSkills(root, { recursive: true, maxDepth: 6 })) {
      const base = skillEntry(skill, root, scope);
      const tags = [...(base.tags ?? []), ...(claude ? (["legacy"] as Entry["tags"]) : [])];
      const permission = skillPermission(permissions, skill.name);
      if (external && !externalSkills.enabled) {
        sink.add({ ...base, tags, status: "disabled", reason: { code: "env", value: externalSkills.disabledBy } });
      } else if (claude && noClaudeSkills) {
        sink.add({ ...base, tags, status: "disabled", reason: { code: "env", value: noClaude ? "OPENCODE_DISABLE_CLAUDE_CODE" : "OPENCODE_DISABLE_CLAUDE_CODE_SKILLS" } });
      } else if (permission === "deny") {
        sink.add({ ...base, tags, status: "disabled", reason: { code: "config", value: `permission.skill: deny` } });
      } else {
        // OpenCode 1.18 advertises discovered skills automatically. Claude/Cursor
        // `disable-model-invocation` does not make one manual-only here.
        sink.add({ ...base, tags: permission === "ask" ? [...tags, "ask"] : tags, status: "auto" });
      }
    }
  };
  if (ctx.projectRoot) {
    skills(path.join(ctx.projectRoot, ".opencode", "skills"), "project");
    skills(path.join(ctx.projectRoot, ".claude", "skills"), "project", true, true);
    skills(path.join(ctx.projectRoot, ".agents", "skills"), "project", true);
  }
  skills(path.join(globalDir, "skills"), "user");
  skills(path.join(ctx.home, ".claude", "skills"), "user", true, true);
  skills(path.join(ctx.home, ".agents", "skills"), "user", true);

  // MCP ---------------------------------------------------------------------
  for (const { file, scope, data } of configs) {
    const map = isRecord(data.mcp) ? data.mcp : {};
    for (const [name, server] of Object.entries(map)) {
      const off = isRecord(server) && server.enabled === false;
      sink.add(
        mcpEntry({
          name,
          config: server,
          file,
          source: `${scope === "user" ? "~/.config/opencode/" : ""}${path.relative(scope === "project" && ctx.projectRoot ? ctx.projectRoot : path.dirname(file), file) || path.basename(file)} → mcp`,
          scope,
          status: off ? "disabled" : "auto",
          ...(off ? { reason: { code: "config", value: "enabled: false" } } : {}),
        }),
      );
    }
  }

  return sink.entries;
}

/** Expands `dir/**\/*.md`-style patterns by listing the static prefix. */
function expandGlob(pattern: string): string[] {
  const parts = pattern.split(path.sep);
  const firstMagic = parts.findIndex((part) => /[*?[{]/.test(part));
  const baseDir = parts.slice(0, firstMagic).join(path.sep) || path.sep;
  const recursive = parts.slice(firstMagic).some((part) => part === "**") || parts.length - firstMagic > 1;
  const regex = pattern;
  return listFiles(baseDir, [""], recursive).filter((file) => matchGlobPath(regex, file));
}

function matchGlobPath(pattern: string, file: string): boolean {
  return matchGlob(pattern.split(path.sep).join("/"), file.split(path.sep).join("/"));
}
