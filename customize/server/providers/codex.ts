import path from "node:path";
import { mcpEntry } from "../mcp.ts";
import { agentPluginManifest } from "../agent-plugins.ts";
import {
  EntrySink,
  ancestors,
  fileSize,
  findSkills,
  isDir,
  isFile,
  isRecord,
  listFiles,
  listNames,
  nestedWith,
  readMarkdown,
  readText,
  skillEntry,
  type ScanContext,
} from "../scan-kit.ts";
import { parseToml } from "../toml.ts";
import type { Entry, Scope } from "../../shared/contracts.ts";

const DEFAULT_DOC_MAX_BYTES = 32 * 1024;

function readToml(file: string): Record<string, unknown> {
  const text = readText(file);
  if (text == null) return {};
  try {
    return parseToml(text);
  } catch {
    return {};
  }
}

export function codexHome(ctx: ScanContext): string {
  return ctx.env.CODEX_HOME?.trim() || path.join(ctx.home, ".codex");
}

function isTrusted(config: Record<string, unknown>, projectRoot: string): boolean {
  const projects = isRecord(config.projects) ? config.projects : {};
  return ancestors(projectRoot).some((dir) => {
    const entry = projects[dir];
    return isRecord(entry) && entry.trust_level === "trusted";
  });
}

/** `agents/openai.yaml` → `policy.allow_implicit_invocation: false`. */
function implicitInvocationOff(skillDir: string): boolean {
  const text = readText(path.join(skillDir, "agents", "openai.yaml"), 16 * 1024);
  if (!text) return false;
  return /^\s*allow_implicit_invocation\s*:\s*false\b/m.test(text);
}

export function scanCodex(ctx: ScanContext): Entry[] {
  const sink = new EntrySink(ctx);
  const home = codexHome(ctx);
  const userConfigPath = path.join(home, "config.toml");
  const userConfig = readToml(userConfigPath);
  const projectConfigPath = ctx.projectRoot ? path.join(ctx.projectRoot, ".codex", "config.toml") : null;
  const trusted = ctx.projectRoot ? isTrusted(userConfig, ctx.projectRoot) : false;
  const projectConfig = projectConfigPath && trusted ? readToml(projectConfigPath) : {};
  const merged = { ...userConfig, ...projectConfig };
  const fallbacks = Array.isArray(merged.project_doc_fallback_filenames)
    ? merged.project_doc_fallback_filenames.filter((name): name is string => typeof name === "string")
    : [];
  const maxBytes = typeof merged.project_doc_max_bytes === "number" ? merged.project_doc_max_bytes : DEFAULT_DOC_MAX_BYTES;

  const disabledSkills = new Set<string>();
  const skillsTable = isRecord(userConfig.skills) ? userConfig.skills : {};
  if (Array.isArray(skillsTable.config)) {
    for (const item of skillsTable.config) {
      if (isRecord(item) && typeof item.path === "string" && item.enabled === false) disabledSkills.add(path.resolve(item.path));
    }
  }

  // Instructions ------------------------------------------------------------
  const pickDoc = (dir: string, names: readonly string[]) => names.map((name) => path.join(dir, name)).filter((file) => isFile(file) && fileSize(file) > 0);
  const addDocs = (dir: string, scope: Scope, names: readonly string[], extra: Partial<Pick<Entry, "status" | "reason" | "tags">> = {}) => {
    const found = pickDoc(dir, names);
    found.forEach((file, index) => {
      const doc = readMarkdown(file);
      const oversize = fileSize(file) > maxBytes;
      const shadowed = index > 0;
      sink.add({
        category: "instructions",
        scope,
        name: path.basename(file),
        path: file,
        ...(doc?.description ? { description: doc.description } : {}),
        status: shadowed ? "inactive" : extra.status ?? "auto",
        ...(shadowed
          ? { reason: { code: "shadowedBy" as const, value: path.basename(found[0]!) } }
          : oversize
            ? { reason: { code: "oversize" as const, value: `project_doc_max_bytes = ${maxBytes}` } }
            : extra.reason
              ? { reason: extra.reason }
              : {}),
        tags: extra.tags ?? [],
      });
    });
  };
  addDocs(home, "user", ["AGENTS.override.md", "AGENTS.md"]);
  if (ctx.projectRoot) {
    const docNames = ["AGENTS.override.md", "AGENTS.md", ...fallbacks];
    addDocs(ctx.projectRoot, "project", docNames);
    const nestedDirs = new Set(docNames.flatMap((name) => nestedWith(ctx, name)));
    for (const dir of [...nestedDirs].sort()) {
      addDocs(dir, "project", docNames, {
        status: "conditional",
        reason: { code: "nestedDir", value: path.relative(ctx.projectRoot, dir) },
        tags: ["nested"],
      });
    }
  }

  // Rules -------------------------------------------------------------------
  const rules = (root: string, scope: Scope, active: boolean) => {
    for (const file of listFiles(root, [".rules"], false)) {
      const text = readText(file, 256 * 1024) ?? "";
      const count = (text.match(/\bprefix_rule\s*\(/g) ?? []).length;
      sink.add({
        category: "rules",
        scope,
        name: path.basename(file),
        path: file,
        root,
        description: `${count} prefix_rule`,
        status: active ? "auto" : "inactive",
        ...(active ? {} : { reason: { code: "untrusted" as const } }),
        tags: scope === "project" ? ["trust"] : [],
      });
    }
  };
  rules(path.join(home, "rules"), "user", true);
  if (ctx.projectRoot) rules(path.join(ctx.projectRoot, ".codex", "rules"), "project", trusted);

  // Skills ------------------------------------------------------------------
  const skills = (root: string, scope: Scope, tags: Entry["tags"] = [], gate?: Pick<Entry, "status" | "reason">) => {
    for (const skill of findSkills(root, { recursive: true, maxDepth: 6 })) {
      const base = skillEntry(skill, root, scope);
      const allTags = [...(base.tags ?? []), ...tags];
      if (disabledSkills.has(path.resolve(skill.file))) {
        sink.add({ ...base, tags: allTags, status: "disabled", reason: { code: "config", value: "[[skills.config]] enabled = false" } });
      } else if (gate) {
        sink.add({ ...base, tags: allTags, status: gate.status, ...(gate.reason ? { reason: gate.reason } : {}) });
      } else if (implicitInvocationOff(skill.dir)) {
        sink.add({ ...base, tags: allTags, status: "manual", reason: { code: "config", value: "agents/openai.yaml allow_implicit_invocation: false" } });
      } else {
        sink.add({ ...base, tags: allTags, status: "auto" });
      }
    }
  };
  if (ctx.projectRoot) {
    skills(path.join(ctx.projectRoot, ".agents", "skills"), "project");
    skills(path.join(ctx.projectRoot, ".codex", "skills"), "project", ["trust"], trusted ? undefined : { status: "inactive", reason: { code: "untrusted" } });
    for (const dir of nestedWith(ctx, ".agents")) {
      const root = path.join(dir, ".agents", "skills");
      if (isDir(root)) {
        skills(root, "project", ["nested"], { status: "conditional", reason: { code: "nestedDir", value: path.relative(ctx.projectRoot, dir) } });
      }
    }
  }
  skills(path.join(ctx.home, ".agents", "skills"), "user");
  skills(path.join(home, "skills"), "user", ["deprecated"]);
  skills(path.join(home, "skills", ".system"), "user", ["system"]);
  skills("/etc/codex/skills", "user", ["managed"]);

  // MCP ---------------------------------------------------------------------
  const servers = (config: Record<string, unknown>, file: string, scope: Scope, active: boolean) => {
    const map = isRecord(config.mcp_servers) ? config.mcp_servers : {};
    for (const [name, server] of Object.entries(map)) {
      const off = isRecord(server) && server.enabled === false;
      sink.add(
        mcpEntry({
          name,
          config: server,
          file,
          source: `${scope === "user" ? "$CODEX_HOME" : ".codex"}/config.toml → mcp_servers`,
          scope,
          status: !active ? "inactive" : off ? "disabled" : "auto",
          ...(!active ? { reason: { code: "untrusted" } } : off ? { reason: { code: "config", value: "enabled = false" } } : {}),
          tags: scope === "project" ? ["trust"] : [],
        }),
      );
    }
  };
  servers(userConfig, userConfigPath, "user", true);
  if (projectConfigPath && isFile(projectConfigPath)) servers(readToml(projectConfigPath), projectConfigPath, "project", trusted);

  // Plugins ---------------------------------------------------------------
  const addPlugin = (root: string, scope: Scope, source?: string, name = path.basename(root)) => {
    const manifest = path.join(root, "plugin.json");
    const fallback = path.join(root, ".codex-plugin", "plugin.json");
    const file = isFile(manifest) ? manifest : fallback;
    if (!isFile(file)) return;
    sink.add({ category: "plugins", scope, name, path: file, ...(source ? { root: source } : {}), status: "conditional", reason: { code: "config", value: "Activation is not verified" }, agentPlugin: agentPluginManifest(manifest) ?? undefined });
  };
  if (ctx.projectRoot) addPlugin(ctx.projectRoot, "project");
  const pluginsRoot = path.join(home, "plugins");
  for (const name of listNames(pluginsRoot)) {
    const dir = path.join(pluginsRoot, name);
    if (isDir(dir)) addPlugin(dir, "user", pluginsRoot);
  }
  const cacheRoot = path.join(pluginsRoot, "cache");
  for (const source of listNames(cacheRoot)) {
    const sourceDir = path.join(cacheRoot, source);
    if (!isDir(sourceDir)) continue;
    for (const name of listNames(sourceDir)) {
      const pluginDir = path.join(sourceDir, name);
      if (!isDir(pluginDir)) continue;
      for (const version of listNames(pluginDir)) {
        const versionDir = path.join(pluginDir, version);
        if (isDir(versionDir)) addPlugin(versionDir, "user", sourceDir, name);
      }
    }
  }

  return sink.entries;
}
