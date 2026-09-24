import path from "node:path";
import { ACP_CONFIGS, type AcpConfig, type AcpProviderId } from "../../shared/acp-configs.ts";
import { CATEGORIES, type Category, type Entry, type Scope } from "../../shared/contracts.ts";
import { fmList } from "../frontmatter.ts";
import { agentPluginManifest } from "../agent-plugins.ts";
import { mcpEntry, serversOf } from "../mcp.ts";
import { parseJsonc } from "../jsonc.ts";
import { parseToml } from "../toml.ts";
import { parseYaml } from "../yaml-lite.ts";
import {
  EntrySink, findSkills, isDir, isFile, isRecord, listFiles, listNames, nestedWith, readMarkdown, readText, skillEntry, skillInvocation,
  type ScanContext,
} from "../scan-kit.ts";

function configValue(file: string): unknown {
  const text = readText(file);
  if (!text) return undefined;
  try { return file.endsWith(".toml") ? parseToml(text) : file.endsWith(".yaml") ? parseYaml(text) : parseJsonc(text); } catch { return undefined; }
}

function mcpServers(value: unknown, provider: AcpProviderId): Array<[string, unknown]> {
  if (provider === "grok") return serversOf(value, "mcp_servers");
  if (provider === "kilo") return serversOf(value, "mcp");
  if (provider === "goose") return serversOf(value, "extensions").filter(([, server]) => isRecord(server) && ["stdio", "streamable_http"].includes(String(server.type)));
  if (provider === "traecli" && isRecord(value) && Array.isArray(value.mcp_servers)) {
    return value.mcp_servers.filter((entry): entry is Record<string, unknown> => isRecord(entry) && typeof entry.name === "string").map((entry) => [entry.name as string, entry]);
  }
  return serversOf(value);
}

function rootFor(ctx: ScanContext, provider: AcpProviderId, scope: Scope): string | null {
  if (scope === "project") return ctx.projectRoot;
  if (provider === "kimi" && ctx.env.KIMI_CODE_HOME?.trim()) return ctx.env.KIMI_CODE_HOME.trim();
  return ctx.home;
}

function resolveLocation(ctx: ScanContext, provider: AcpProviderId, scope: Scope, relative: string): string | null {
  const root = rootFor(ctx, provider, scope);
  if (!root) return null;
  if (provider === "kimi" && scope === "user" && relative.startsWith(".kimi-code/") && ctx.env.KIMI_CODE_HOME?.trim()) {
    return path.join(root, relative.slice(".kimi-code/".length));
  }
  if (provider === "kimi" && scope === "user" && relative.startsWith(".agents/")) return path.join(ctx.home, relative);
  if (provider === "traecli" && scope === "user" && relative.endsWith("trae_cli.yaml")) {
    if (ctx.platform === "win32") return path.join(ctx.home, "AppData", "Roaming", "trae_cli", "trae_cli.yaml");
    if (ctx.platform === "linux") return path.join(ctx.env.XDG_CONFIG_HOME?.trim() || path.join(ctx.home, ".config"), "trae_cli", "trae_cli.yaml");
  }
  return path.join(root, relative);
}

/** File-system evidence only; runtime selection, trust, and plugin enablement may differ. */
export function scanAcp(provider: AcpProviderId, ctx: ScanContext): Entry[] {
  const config: AcpConfig = ACP_CONFIGS[provider];
  const sink = new EntrySink(ctx);
  if (provider === "gemini" && ctx.projectRoot) {
    const manifest = path.join(ctx.projectRoot, "plugin.json");
    const agentPlugin = agentPluginManifest(manifest);
    if (agentPlugin) sink.add({ category: "plugins", scope: "project", name: path.basename(ctx.projectRoot), path: manifest, status: "conditional", reason: { code: "config", value: "Activation is not verified" }, agentPlugin });
  }
  for (const category of CATEGORIES) {
    for (const scope of ["project", "user"] as const) {
      const locations = config[category][scope] ?? [];
      for (const relative of locations) {
        const location = resolveLocation(ctx, provider, scope, relative);
        if (!location) continue;
        if (provider === "kimi" && category === "commands") continue; // Plugin manifests declare command roots.
        if (category === "instructions") {
          if (!isFile(location)) continue;
          const doc = readMarkdown(location);
          sink.add({ category, scope, name: path.basename(location), path: location, status: "auto", tags: [], ...(doc?.description ? { description: doc.description } : {}) });
        } else if (category === "mcp") {
          const value = configValue(location);
          for (const [name, server] of mcpServers(value, provider)) {
            const off = isRecord(server) && server.enabled === false;
            sink.add(mcpEntry({ name, config: server, file: location, source: relative, scope, status: off ? "disabled" : "auto" }));
          }
        } else if (provider === "goose" && (category === "commands" || category === "plugins") && isFile(location)) {
          const value = configValue(location);
          if (isRecord(value)) {
            const items = category === "commands" ? (Array.isArray(value.slash_commands) ? value.slash_commands : []) : Object.entries(isRecord(value.extensions) ? value.extensions : {}).map(([name, settings]) => ({ name, settings }));
            for (const item of items) {
              if (!isRecord(item)) continue;
              const name = category === "commands" ? item.command : item.name;
              if (typeof name !== "string") continue;
              sink.add({ category, scope, name, path: location, source: relative, status: category === "plugins" && isRecord(item.settings) && item.settings.enabled === false ? "disabled" : "auto", tags: [] });
            }
          }
        } else if (category === "skills") {
          for (const skill of findSkills(location, { recursive: provider === "gemini" || provider === "grok" || provider === "qwen-code", maxDepth: 6, looseMarkdown: provider === "kimi" })) {
            const invocation = skillInvocation(skill.doc);
            sink.add({ ...skillEntry(skill, location, scope), status: invocation.status, ...(invocation.reason ? { reason: invocation.reason } : {}), tags: [...(skill.symlink ? ["symlink" as const] : []), ...invocation.tags] });
          }
        } else if (category === "plugins") {
          if (isFile(location)) {
            sink.add({ category, scope, name: path.basename(location), path: location, status: "conditional", reason: { code: "config", value: "Check installed and enabled state" }, tags: [] });
          } else if (isDir(location)) {
            if (provider === "codebuddy-code") {
              let visited = 0;
              const walk = (dir: string, depth: number) => {
                if (depth > 4 || visited++ > 500) return;
                const manifest = config.pluginManifests?.map((candidate) => path.join(dir, candidate)).find(isFile);
                if (manifest) {
                  sink.add({ category, scope, name: path.basename(path.dirname(dir)), path: manifest, root: location, status: "conditional", reason: { code: "config", value: "Check enabledPlugins in settings" }, tags: [] });
                  return;
                }
                for (const child of listNames(dir)) if (isDir(path.join(dir, child))) walk(path.join(dir, child), depth + 1);
              };
              walk(location, 0);
              continue;
            }
            for (const name of listNames(location)) {
              const dir = path.join(location, name);
              if (provider === "cline" && isFile(dir) && /\.[cm]?[jt]s$/.test(name)) {
                sink.add({ category, scope, name, path: dir, root: location, status: "conditional", reason: { code: "config", value: "Activation is not verified" }, tags: [] });
                continue;
              }
              if (!isDir(dir)) continue;
              const standardManifest = path.join(dir, "plugin.json");
              const agentPlugin = provider === "gemini" ? agentPluginManifest(standardManifest) : null;
              const manifest = agentPlugin ? standardManifest : config.pluginManifests?.map((candidate) => path.join(dir, candidate)).find(isFile);
              if (!manifest && provider !== "kiro") continue;
              const target = manifest ?? dir;
              sink.add({ category, scope, name, path: target, root: location, status: "conditional", reason: { code: "config", value: "Activation is not verified" }, ...(agentPlugin ? { agentPlugin } : {}) });
            }
          }
        } else {
          const extensions = category === "subagents" && (provider === "kiro" || provider === "qwen-code") ? [".md", ".json", ".yaml"] : category === "commands" && provider === "gemini" ? [".toml"] : category === "commands" && provider === "qwen-code" ? [".md", ".toml"] : [".md", ".mdc"];
          const files = isFile(location) ? [location] : listFiles(location, extensions, true);
          for (const file of files) {
            if (category === "rules" && provider === "kiro" && path.basename(file) === "AGENTS.md") continue;
            const doc = readMarkdown(file);
            const paths = category === "rules" && doc ? fmList(doc.data, "paths") : null;
            sink.add({ category: category as Category, scope, name: path.relative(location, file) || path.basename(file), path: file, root: location, status: paths ? "conditional" : "auto", ...(paths ? { reason: { code: "globs" as const, value: `paths: ${paths}` } } : {}), tags: [], ...(doc?.description ? { description: doc.description } : {}) });
          }
        }
      }
    }
  }
  if (ctx.projectRoot) {
    const nestedInstructions = provider === "gemini" ? ["GEMINI.md"]
      : provider === "codebuddy-code" ? ["CODEBUDDY.md"]
      : provider === "qwen-code" ? ["QWEN.md"]
      : provider === "goose" ? ["AGENTS.md", ".goosehints"]
      : ["grok", "kilo", "kiro", "kimi", "traecli"].includes(provider) ? ["AGENTS.md"] : [];
    for (const name of nestedInstructions) for (const dir of nestedWith(ctx, name)) {
      const file = path.join(dir, name);
      if (isFile(file)) sink.add({ category: "instructions", scope: "project", name: path.relative(ctx.projectRoot, file), path: file, status: "conditional", reason: { code: "nestedDir", value: path.relative(ctx.projectRoot, dir) }, tags: ["nested"] });
    }
    if (provider === "gemini") {
      const settings = [path.join(ctx.projectRoot, ".gemini", "settings.json"), path.join(ctx.home, ".gemini", "settings.json")].map(configValue);
      const names = settings.flatMap((value) => {
        const context = isRecord(value) && isRecord(value.context) ? value.context : null;
        const filenames = context?.fileName;
        return typeof filenames === "string" ? [filenames] : Array.isArray(filenames) ? filenames.filter((name): name is string => typeof name === "string") : [];
      });
      if (names.includes("AGENTS.md")) {
        const file = path.join(ctx.projectRoot, "AGENTS.md");
        if (isFile(file)) sink.add({ category: "instructions", scope: "project", name: "AGENTS.md", path: file, status: "auto", reason: { code: "config", value: "context.fileName" }, tags: [] });
      }
    }
  }
  if (provider === "kimi") {
    const managed = resolveLocation(ctx, provider, "user", ".kimi-code/plugins/managed");
    if (managed) for (const name of listNames(managed)) {
      const root = path.join(managed, name);
      const manifest = configValue(path.join(root, "kimi.plugin.json"));
      if (!isRecord(manifest)) continue;
      for (const [category, key, fallback] of [["commands", "commands", null], ["subagents", "agents", "agents"], ["skills", "skills", "skills"]] as const) {
        const declared = manifest[key];
        const paths = typeof declared === "string" ? [declared] : Array.isArray(declared) ? declared.filter((item): item is string => typeof item === "string") : fallback ? [fallback] : [];
        for (const relative of paths) {
          const target = path.resolve(root, relative);
          if (target !== root && !target.startsWith(`${root}${path.sep}`)) continue;
          if (category === "skills") {
            for (const skill of findSkills(target, { recursive: true })) sink.add({ ...skillEntry(skill, target, "user"), status: "conditional", reason: { code: "config", value: "Plugin activation" }, tags: [] });
          } else {
            for (const file of isFile(target) ? [target] : listFiles(target, [".md"], true)) {
              sink.add({ category, scope: "user", name: `${name}:${path.basename(file, ".md")}`, path: file, root: target, status: "conditional", reason: { code: "config", value: "Plugin activation" }, tags: [] });
            }
          }
        }
      }
    }
  }
  return sink.entries;
}
