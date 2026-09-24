import path from "node:path";
import { fmList } from "../frontmatter.ts";
import { matchGlob } from "../glob.ts";
import { mcpEntry, serversOf } from "../mcp.ts";
import {
  EntrySink,
  findSkills,
  isDir,
  isFile,
  isRecord,
  listFiles,
  nestedWith,
  parentDirs,
  readJson,
  readMarkdown,
  skillEntry,
  skillInvocation,
  type ScanContext,
} from "../scan-kit.ts";
import type { Entry, Scope } from "../../shared/contracts.ts";

function managedDir(ctx: ScanContext): string {
  if (ctx.platform === "darwin") return "/Library/Application Support/ClaudeCode";
  if (ctx.platform === "win32") return "C:\\Program Files\\ClaudeCode";
  return "/etc/claude-code";
}

interface ClaudeSettings {
  claudeMdExcludes: string[];
  skillOverrides: Record<string, string>;
  enabledMcpjsonServers: string[];
  disabledMcpjsonServers: string[];
  enableAllProjectMcpServers: boolean;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** User → project → local settings merged (arrays concatenate, later scalars win). */
function readSettings(ctx: ScanContext, claudeJsonProject: Record<string, unknown> | undefined): ClaudeSettings {
  const files = [path.join(ctx.home, ".claude", "settings.json")];
  if (ctx.projectRoot) {
    files.push(path.join(ctx.projectRoot, ".claude", "settings.json"), path.join(ctx.projectRoot, ".claude", "settings.local.json"));
  }
  files.push(path.join(managedDir(ctx), "managed-settings.json"));
  const out: ClaudeSettings = {
    claudeMdExcludes: [],
    skillOverrides: {},
    enabledMcpjsonServers: [],
    disabledMcpjsonServers: [],
    enableAllProjectMcpServers: false,
  };
  const layers = files.map(readJson).filter(isRecord);
  if (claudeJsonProject) layers.unshift(claudeJsonProject);
  for (const layer of layers) {
    out.claudeMdExcludes.push(...strings(layer.claudeMdExcludes));
    out.enabledMcpjsonServers.push(...strings(layer.enabledMcpjsonServers));
    out.disabledMcpjsonServers.push(...strings(layer.disabledMcpjsonServers));
    if (layer.enableAllProjectMcpServers === true) out.enableAllProjectMcpServers = true;
    if (isRecord(layer.skillOverrides)) {
      for (const [name, state] of Object.entries(layer.skillOverrides)) if (typeof state === "string") out.skillOverrides[name] = state;
    }
  }
  return out;
}

function excluded(settings: ClaudeSettings, file: string): string | undefined {
  return settings.claudeMdExcludes.find((pattern) => matchGlob(pattern, file));
}

export function scanClaude(ctx: ScanContext): Entry[] {
  const sink = new EntrySink(ctx);
  const claudeJsonPath = path.join(ctx.home, ".claude.json");
  const claudeJson = readJson(claudeJsonPath);
  const projects = isRecord(claudeJson) && isRecord(claudeJson.projects) ? claudeJson.projects : {};
  const projectState = ctx.projectRoot && isRecord(projects[ctx.projectRoot]) ? (projects[ctx.projectRoot] as Record<string, unknown>) : undefined;
  const settings = readSettings(ctx, projectState);
  const userDir = path.join(ctx.home, ".claude");

  // Instructions ------------------------------------------------------------
  const instruction = (file: string, scope: Scope, tags: Entry["tags"] = [], nestedDir?: string) => {
    if (!isFile(file)) return false;
    const doc = readMarkdown(file);
    const skip = excluded(settings, file);
    sink.add({
      category: "instructions",
      scope,
      name: path.basename(file),
      path: file,
      ...(doc?.description ? { description: doc.description } : {}),
      status: skip ? "disabled" : nestedDir ? "conditional" : "auto",
      ...(skip
        ? { reason: { code: "config" as const, value: `claudeMdExcludes: ${skip}` } }
        : nestedDir
          ? { reason: { code: "onDemand" as const, value: nestedDir } }
          : {}),
      tags,
    });
    return true;
  };
  instruction(path.join(managedDir(ctx), "CLAUDE.md"), "user", ["managed"]);
  instruction(path.join(userDir, "CLAUDE.md"), "user");

  let hasClaudeMd = false;
  if (ctx.projectRoot) {
    const chain = [ctx.projectRoot, ...parentDirs(ctx.projectRoot)];
    for (const dir of chain) {
      const tags: Entry["tags"] = dir === ctx.projectRoot ? [] : ["parent"];
      for (const name of ["CLAUDE.md", path.join(".claude", "CLAUDE.md")]) {
        if (instruction(path.join(dir, name), "project", tags)) hasClaudeMd = true;
      }
      if (instruction(path.join(dir, "CLAUDE.local.md"), "project", [...tags, "local"])) hasClaudeMd = true;
    }
    for (const dir of chain) {
      const agents = path.join(dir, "AGENTS.md");
      if (!isFile(agents)) continue;
      const doc = readMarkdown(agents);
      sink.add({
        category: "instructions",
        scope: "project",
        name: "AGENTS.md",
        path: agents,
        ...(doc?.description ? { description: doc.description } : {}),
        status: hasClaudeMd ? "inactive" : "auto",
        ...(hasClaudeMd ? { reason: { code: "shadowedBy" as const, value: "CLAUDE.md" } } : {}),
        tags: dir === ctx.projectRoot ? [] : ["parent"],
      });
    }
    for (const dir of nestedWith(ctx, "CLAUDE.md")) instruction(path.join(dir, "CLAUDE.md"), "project", ["nested"], path.relative(ctx.projectRoot, dir));
    for (const dir of nestedWith(ctx, "CLAUDE.local.md")) {
      instruction(path.join(dir, "CLAUDE.local.md"), "project", ["nested", "local"], path.relative(ctx.projectRoot, dir));
    }
  }

  // Rules -------------------------------------------------------------------
  const rules = (root: string, scope: Scope, nestedDir?: string) => {
    for (const file of listFiles(root, [".md"], true)) {
      const doc = readMarkdown(file);
      const paths = doc ? fmList(doc.data, "paths") : undefined;
      sink.add({
        category: "rules",
        scope,
        name: path.relative(root, file),
        path: file,
        root,
        ...(doc?.description ? { description: doc.description } : {}),
        status: paths || nestedDir ? "conditional" : "auto",
        reason: paths ? { code: "globs", value: `paths: ${paths}` } : nestedDir ? { code: "onDemand", value: nestedDir } : { code: "always" },
        tags: nestedDir ? ["nested"] : [],
      });
    }
  };
  rules(path.join(userDir, "rules"), "user");
  if (ctx.projectRoot) {
    rules(path.join(ctx.projectRoot, ".claude", "rules"), "project");
    for (const dir of nestedWith(ctx, ".claude")) {
      if (isDir(path.join(dir, ".claude", "rules"))) rules(path.join(dir, ".claude", "rules"), "project", path.relative(ctx.projectRoot, dir));
    }
  }

  // Skills ------------------------------------------------------------------
  const skills = (root: string, scope: Scope, nestedDir?: string) => {
    for (const skill of findSkills(root, { recursive: false, skip: [".trash"] })) {
      const base = skillEntry(skill, root, scope);
      const invocation = skillInvocation(skill.doc);
      const override = settings.skillOverrides[skill.name];
      const tags = [...(base.tags ?? []), ...invocation.tags];
      if (skill.dir.includes(`${path.sep}skills${path.sep}synced${path.sep}`)) tags.push("synced");
      if (nestedDir) tags.push("nested");
      if (override === "off") {
        sink.add({ ...base, tags, status: "disabled", reason: { code: "config", value: `skillOverrides: "off"` } });
      } else if (override === "user-invocable-only") {
        sink.add({ ...base, tags, status: "manual", reason: { code: "config", value: `skillOverrides: "user-invocable-only"` } });
      } else if (invocation.status === "manual") {
        sink.add({ ...base, tags, status: "manual", ...(invocation.reason ? { reason: invocation.reason } : {}) });
      } else if (nestedDir) {
        sink.add({ ...base, tags, status: "conditional", reason: { code: "onDemand", value: nestedDir } });
      } else {
        if (override === "name-only") tags.push("nameOnly");
        sink.add({ ...base, tags, status: "auto" });
      }
    }
    // `synced/` holds claude.ai skills one level deeper.
    if (!nestedDir && scope === "user" && isDir(path.join(root, "synced"))) {
      for (const skill of findSkills(path.join(root, "synced"), { recursive: false })) {
        const invocation = skillInvocation(skill.doc);
        sink.add({ ...skillEntry(skill, root, scope), status: invocation.status, ...(invocation.reason ? { reason: invocation.reason } : {}), tags: ["synced", ...invocation.tags] });
      }
    }
  };
  const commands = (root: string, scope: Scope) => {
    for (const file of listFiles(root, [".md"], true)) {
      const doc = readMarkdown(file);
      const manual = doc?.data["disable-model-invocation"] === true;
      sink.add({
        category: "skills",
        scope,
        name: `/${path.relative(root, file).replace(/\.md$/i, "").split(path.sep).join(":")}`,
        path: file,
        root,
        ...(doc?.description ? { description: doc.description } : {}),
        status: manual ? "manual" : "auto",
        ...(manual ? { reason: { code: "frontmatter" as const, value: "disable-model-invocation: true" } } : {}),
        tags: ["command"],
      });
    }
  };
  skills(path.join(managedDir(ctx), ".claude", "skills"), "user");
  skills(path.join(userDir, "skills"), "user");
  commands(path.join(userDir, "commands"), "user");
  if (ctx.projectRoot) {
    skills(path.join(ctx.projectRoot, ".claude", "skills"), "project");
    commands(path.join(ctx.projectRoot, ".claude", "commands"), "project");
    for (const dir of nestedWith(ctx, ".claude")) {
      const root = path.join(dir, ".claude", "skills");
      if (isDir(root)) skills(root, "project", path.relative(ctx.projectRoot, dir));
    }
  }

  // MCP ---------------------------------------------------------------------
  const disabledHere = new Set(projectState ? strings(projectState.disabledMcpServers) : []);
  for (const [name, config] of serversOf(claudeJson)) {
    const off = disabledHere.has(name);
    sink.add(
      mcpEntry({
        name,
        config,
        file: claudeJsonPath,
        source: "~/.claude.json → mcpServers",
        scope: "user",
        status: off ? "disabled" : "auto",
        ...(off ? { reason: { code: "config", value: "disabledMcpServers" } } : {}),
      }),
    );
  }
  if (projectState) {
    for (const [name, config] of serversOf(projectState)) {
      const off = disabledHere.has(name);
      sink.add(
        mcpEntry({
          name,
          config,
          file: claudeJsonPath,
          source: "~/.claude.json → projects (local)",
          scope: "project",
          status: off ? "disabled" : "auto",
          ...(off ? { reason: { code: "config", value: "disabledMcpServers" } } : {}),
          tags: ["local"],
        }),
      );
    }
  }
  if (ctx.projectRoot) {
    const file = path.join(ctx.projectRoot, ".mcp.json");
    for (const [name, config] of serversOf(readJson(file))) {
      const rejected = settings.disabledMcpjsonServers.includes(name);
      const approved = settings.enableAllProjectMcpServers || settings.enabledMcpjsonServers.includes(name);
      sink.add(
        mcpEntry({
          name,
          config,
          file,
          source: ".mcp.json",
          scope: "project",
          status: rejected ? "disabled" : disabledHere.has(name) ? "disabled" : approved ? "auto" : "pending",
          reason: rejected
            ? { code: "config", value: "disabledMcpjsonServers" }
            : disabledHere.has(name)
              ? { code: "config", value: "disabledMcpServers" }
              : approved
                ? { code: "config", value: settings.enableAllProjectMcpServers ? "enableAllProjectMcpServers" : "enabledMcpjsonServers" }
                : { code: "needsApproval" },
        }),
      );
    }
  }
  const managedMcp = path.join(managedDir(ctx), "managed-mcp.json");
  for (const [name, config] of serversOf(readJson(managedMcp))) {
    sink.add(mcpEntry({ name, config, file: managedMcp, source: "managed-mcp.json", scope: "user", status: "auto", tags: ["managed"] }));
  }

  return sink.entries;
}
