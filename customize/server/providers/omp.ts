import path from "node:path";
import { matchGlob } from "../glob.ts";
import { mcpEntry, serversOf } from "../mcp.ts";
import {
  EntrySink,
  findSkills,
  isFile,
  isRecord,
  listFiles,
  parentDirs,
  readJson,
  readMarkdown,
  readText,
  skillEntry,
  type EntryInput,
  type ScanContext,
} from "../scan-kit.ts";
import { parseToml } from "../toml.ts";
import { parseYaml } from "../yaml-lite.ts";
import type { Entry, Scope } from "../../shared/contracts.ts";
import { mdcRuleState } from "./cursor.ts";

interface OmpSettings {
  enableClaudeUser: boolean;
  enableCodexUser: boolean;
  enableClaudeProject: boolean;
  enableAgentsUser: boolean;
  enableAgentsProject: boolean;
  enablePiUser: boolean;
  enablePiProject: boolean;
  ignoredSkills: string[];
  disabledSkills: Set<string>;
}

/** Dotted (`skills.enableClaudeUser`) or nested (`skills:\n  enableClaudeUser`) keys. */
function setting(config: Record<string, unknown>, key: string): unknown {
  if (key in config) return config[key];
  const [head, ...rest] = key.split(".");
  const child = config[head!];
  return rest.length && isRecord(child) ? setting(child, rest.join(".")) : undefined;
}

function readSettings(agentDir: string, projectRoot: string | null): OmpSettings {
  const layers = [path.join(agentDir, "config.yml"), ...(projectRoot ? [path.join(projectRoot, ".omp", "config.yml")] : [])]
    .map((file) => readText(file))
    .filter((text): text is string => text != null)
    .map((text) => {
      try {
        return parseYaml(text);
      } catch {
        return {};
      }
    });
  const bool = (key: string, fallback: boolean) => {
    let value = fallback;
    for (const layer of layers) {
      const raw = setting(layer, key);
      if (typeof raw === "boolean") value = raw;
    }
    return value;
  };
  const list = (key: string) =>
    layers.flatMap((layer) => {
      const raw = setting(layer, key);
      return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : [];
    });
  return {
    enableClaudeUser: bool("skills.enableClaudeUser", false),
    enableCodexUser: bool("skills.enableCodexUser", false),
    enableClaudeProject: bool("skills.enableClaudeProject", true),
    enableAgentsUser: bool("skills.enableAgentsUser", true),
    enableAgentsProject: bool("skills.enableAgentsProject", true),
    enablePiUser: bool("skills.enablePiUser", true),
    enablePiProject: bool("skills.enablePiProject", true),
    ignoredSkills: list("skills.ignoredSkills"),
    disabledSkills: new Set(list("disabledExtensions").filter((id) => id.startsWith("skill:")).map((id) => id.slice(6))),
  };
}

export function scanOmp(ctx: ScanContext): Entry[] {
  const sink = new EntrySink(ctx);
  const agentDir = path.join(ctx.home, ".omp", "agent");
  const settings = readSettings(agentDir, ctx.projectRoot);
  const chain = ctx.projectRoot ? [ctx.projectRoot, ...parentDirs(ctx.projectRoot)] : [];
  const nearestOmp = chain.find((dir) => dir !== ctx.home && isFile(path.join(dir, ".omp", "AGENTS.md")));
  const nearestRules = chain.find((dir) => dir !== ctx.home && isFile(path.join(dir, ".omp", "RULES.md")));

  // Instructions ------------------------------------------------------------
  const instruction = (file: string, scope: Scope, tags: Entry["tags"] = []) => {
    if (!isFile(file)) return;
    const doc = readMarkdown(file);
    sink.add({
      category: "instructions",
      scope,
      name: path.basename(file),
      path: file,
      ...(doc?.description ? { description: doc.description } : {}),
      status: "auto",
      tags,
    });
  };
  instruction(path.join(agentDir, "AGENTS.md"), "user");
  instruction(path.join(agentDir, "SYSTEM.md"), "user", ["systemPrompt"]);
  for (const base of [".agents", ".agent"]) instruction(path.join(ctx.home, base, "AGENTS.md"), "user");
  instruction(path.join(ctx.home, ".claude", "CLAUDE.md"), "user", ["legacy"]);
  instruction(path.join(ctx.home, ".codex", "AGENTS.md"), "user", ["legacy"]);
  instruction(path.join(ctx.home, ".config", "opencode", "AGENTS.md"), "user", ["legacy"]);
  if (ctx.projectRoot) {
    if (nearestOmp) instruction(path.join(nearestOmp, ".omp", "AGENTS.md"), "project", nearestOmp === ctx.projectRoot ? [] : ["parent"]);
    instruction(path.join(ctx.projectRoot, ".omp", "SYSTEM.md"), "project", ["systemPrompt"]);
    for (const dir of chain) {
      if (dir === ctx.home) continue;
      const tags: Entry["tags"] = dir === ctx.projectRoot ? [] : ["parent"];
      instruction(path.join(dir, "AGENTS.md"), "project", tags);
      instruction(path.join(dir, "CLAUDE.md"), "project", tags);
    }
    instruction(path.join(ctx.projectRoot, ".github", "copilot-instructions.md"), "project", ["legacy"]);
  }

  // Rules -------------------------------------------------------------------
  const rules = (root: string, scope: Scope, exts: readonly string[], tags: Entry["tags"] = []) => {
    for (const file of listFiles(root, exts, false)) {
      const doc = readMarkdown(file);
      sink.add({
        category: "rules",
        scope,
        name: path.basename(file),
        path: file,
        root,
        ...(doc?.description ? { description: doc.description } : {}),
        ...mdcRuleState(doc?.data ?? {}),
        tags,
      });
    }
  };
  const sticky = (file: string, scope: Scope) => {
    if (!isFile(file)) return;
    sink.add({ category: "rules", scope, name: "RULES.md", path: file, status: "auto", reason: { code: "always" }, tags: ["sticky"] });
  };
  sticky(path.join(agentDir, "RULES.md"), "user");
  rules(path.join(agentDir, "rules"), "user", [".md", ".mdc"]);
  for (const base of [".agents", ".agent"]) rules(path.join(ctx.home, base, "rules"), "user", [".md", ".mdc"]);
  rules(path.join(ctx.home, ".cursor", "rules"), "user", [".mdc"], ["legacy"]);
  if (ctx.projectRoot) {
    if (nearestRules) sticky(path.join(nearestRules, ".omp", "RULES.md"), "project");
    rules(path.join(ctx.projectRoot, ".omp", "rules"), "project", [".md", ".mdc"]);
    for (const base of [".agents", ".agent"]) rules(path.join(ctx.projectRoot, base, "rules"), "project", [".md", ".mdc"]);
    rules(path.join(ctx.projectRoot, ".cursor", "rules"), "project", [".mdc"], ["legacy"]);
    const instructionsDir = path.join(ctx.projectRoot, ".github", "instructions");
    for (const file of listFiles(instructionsDir, [".instructions.md"], true)) {
      const doc = readMarkdown(file);
      const applyTo = doc?.data.applyTo;
      sink.add({
        category: "rules",
        scope: "project",
        name: path.relative(instructionsDir, file),
        path: file,
        root: instructionsDir,
        ...(doc?.description ? { description: doc.description } : {}),
        ...(typeof applyTo === "string" && applyTo
          ? { status: "conditional" as const, reason: { code: "globs" as const, value: `applyTo: ${applyTo}` } }
          : { status: "auto" as const }),
        tags: ["legacy"],
      });
    }
  }

  // Skills ------------------------------------------------------------------
  const skills = (root: string, scope: Scope, gate: { enabled: boolean; key?: string }, tags: Entry["tags"] = []) => {
    for (const skill of findSkills(root, { recursive: false })) {
      if (!skill.doc.description) continue;
      const base = skillEntry(skill, root, scope);
      const allTags = [...(base.tags ?? []), ...tags];
      const data = skill.doc.data;
      let state: Pick<EntryInput, "status" | "reason">;
      if (data.enabled === false) state = { status: "disabled", reason: { code: "frontmatter", value: "enabled: false" } };
      else if (!gate.enabled) state = { status: "inactive", reason: { code: "offByDefault", value: gate.key } };
      else if (settings.disabledSkills.has(skill.name)) state = { status: "disabled", reason: { code: "config", value: `disabledExtensions: skill:${skill.name}` } };
      else if (settings.ignoredSkills.some((pattern) => matchGlob(pattern, skill.name))) {
        state = { status: "disabled", reason: { code: "config", value: "skills.ignoredSkills" } };
      } else if (data.hide === true) state = { status: "manual", reason: { code: "frontmatter", value: "hide: true" } };
      else if (data["disable-model-invocation"] === true) state = { status: "manual", reason: { code: "frontmatter", value: "disable-model-invocation: true" } };
      else state = { status: "auto" };
      sink.add({ ...base, tags: allTags, ...state });
    }
  };
  const on = { enabled: true };
  if (ctx.projectRoot) {
    for (const dir of chain.filter((dir) => dir !== ctx.home)) {
      const tags: Entry["tags"] = dir === ctx.projectRoot ? [] : ["parent"];
      skills(path.join(dir, ".omp", "skills"), "project", { enabled: settings.enablePiProject, key: "skills.enablePiProject" }, tags);
      for (const base of [".agents", ".agent"]) {
        skills(path.join(dir, base, "skills"), "project", { enabled: settings.enableAgentsProject, key: "skills.enableAgentsProject" }, tags);
      }
      skills(path.join(dir, ".claude", "skills"), "project", { enabled: settings.enableClaudeProject, key: "skills.enableClaudeProject" }, [...tags, "legacy"]);
    }
    skills(path.join(ctx.projectRoot, ".codex", "skills"), "project", on, ["legacy"]);
  }
  skills(path.join(agentDir, "skills"), "user", { enabled: settings.enablePiUser, key: "skills.enablePiUser" });
  skills(path.join(agentDir, "managed-skills"), "user", on, ["autolearn"]);
  for (const base of [".agents", ".agent"]) {
    skills(path.join(ctx.home, base, "skills"), "user", { enabled: settings.enableAgentsUser, key: "skills.enableAgentsUser" });
  }
  skills(path.join(ctx.home, ".claude", "skills"), "user", { enabled: settings.enableClaudeUser, key: "skills.enableClaudeUser" }, ["legacy"]);
  skills(path.join(ctx.home, ".codex", "skills"), "user", { enabled: settings.enableCodexUser, key: "skills.enableCodexUser" }, ["legacy"]);

  // MCP ---------------------------------------------------------------------
  const jsonServers = (file: string, scope: Scope, source: string, tags: Entry["tags"] = []) => {
    for (const [name, config] of serversOf(readJson(file))) {
      const off = isRecord(config) && config.enabled === false;
      sink.add(
        mcpEntry({
          name,
          config,
          file,
          source,
          scope,
          status: off ? "disabled" : "auto",
          ...(off ? { reason: { code: "config", value: "enabled: false" } } : {}),
          tags,
        }),
      );
    }
  };
  const tomlServers = (file: string, scope: Scope, source: string) => {
    const text = readText(file);
    if (text == null) return;
    let config: Record<string, unknown> = {};
    try {
      config = parseToml(text);
    } catch {
      return;
    }
    for (const [name, server] of Object.entries(isRecord(config.mcp_servers) ? config.mcp_servers : {})) {
      const off = isRecord(server) && server.enabled === false;
      sink.add(
        mcpEntry({
          name,
          config: server,
          file,
          source,
          scope,
          status: off ? "disabled" : "auto",
          ...(off ? { reason: { code: "config", value: "enabled = false" } } : {}),
          tags: ["legacy"],
        }),
      );
    }
  };
  for (const name of ["mcp.json", ".mcp.json"]) jsonServers(path.join(agentDir, name), "user", `~/.omp/agent/${name}`);
  jsonServers(path.join(ctx.home, ".cursor", "mcp.json"), "user", "~/.cursor/mcp.json", ["legacy"]);
  tomlServers(path.join(ctx.home, ".codex", "config.toml"), "user", "~/.codex/config.toml");
  if (ctx.projectRoot) {
    for (const name of ["mcp.json", ".mcp.json"]) {
      jsonServers(path.join(ctx.projectRoot, ".omp", name), "project", `.omp/${name}`);
      jsonServers(path.join(ctx.projectRoot, name), "project", name);
    }
    jsonServers(path.join(ctx.projectRoot, ".cursor", "mcp.json"), "project", ".cursor/mcp.json", ["legacy"]);
    tomlServers(path.join(ctx.projectRoot, ".codex", "config.toml"), "project", ".codex/config.toml");
  }

  return sink.entries;
}
