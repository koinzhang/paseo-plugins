import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import type { Entry } from "../shared/contracts.ts";
import type { ProviderId } from "../shared/providers.ts";
import { PROVIDER_IDS } from "../shared/providers.ts";
import { mcpPreview, scanProvider } from "./handlers.ts";

const base = realpathSync(mkdtempSync(path.join(tmpdir(), "customize-test-")));
after(() => rmSync(base, { recursive: true, force: true }));

function fixture(name: string, files: Record<string, string>): { home: string; project: string } {
  const root = path.join(base, name);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  const home = path.join(root, "home");
  const project = path.join(root, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(project, { recursive: true });
  return { home, project };
}

function scan(provider: ProviderId, fx: { home: string; project: string }, env: Record<string, string> = {}): Entry[] {
  return scanProvider(provider, fx.project, { home: fx.home, env, platform: "linux" });
}

function find(entries: Entry[], category: Entry["category"], name: string): Entry {
  const hit = entries.find((entry) => entry.category === category && entry.name === name);
  assert.ok(hit, `${category} ${name} missing; got ${entries.filter((e) => e.category === category).map((e) => e.name).join(", ")}`);
  return hit;
}

const skill = (name: string, extra = "") => `---\nname: ${name}\ndescription: ${name} skill\n${extra}---\nBody\n`;
const agentPlugin = (name: string, extra: Record<string, unknown> = {}) => JSON.stringify({
  $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", name, ...extra,
});

test("claude: CLAUDE.md shadows AGENTS.md, rules paths, one-level skills, .mcp.json approval", () => {
  const fx = fixture("claude", {
    "project/CLAUDE.md": "# Project\n",
    "project/AGENTS.md": "# Agents\n",
    "project/.claude/rules/api/ts.md": "---\npaths:\n  - src/**\n---\nRule\n",
    "project/.claude/rules/always.md": "Always\n",
    "project/.claude/skills/deploy/SKILL.md": skill("deploy", "disable-model-invocation: true\n"),
    "project/.claude/skills/group/inner/SKILL.md": skill("inner"),
    "project/.mcp.json": JSON.stringify({ mcpServers: { local: { command: "x" }, ok: { command: "y" } } }),
    "project/.claude/settings.json": JSON.stringify({ enabledMcpjsonServers: ["ok"] }),
    "home/.claude/skills/review/SKILL.md": skill("review"),
  });
  const entries = scan("claude", fx);
  assert.equal(find(entries, "instructions", "CLAUDE.md").status, "auto");
  assert.equal(find(entries, "instructions", "AGENTS.md").status, "inactive");
  assert.equal(find(entries, "rules", path.join("api", "ts.md")).status, "conditional");
  assert.equal(find(entries, "rules", "always.md").status, "auto");
  assert.equal(find(entries, "skills", "deploy").status, "manual");
  assert.equal(find(entries, "skills", "review").scope, "user");
  assert.ok(!entries.some((entry) => entry.name === "inner"), "claude skills are not recursive");
  assert.equal(find(entries, "mcp", "local").status, "pending");
  assert.equal(find(entries, "mcp", "ok").status, "auto");
});

test("codex: override wins, recursive .agents skills, openai.yaml manual, trust gate, enabled=false", () => {
  const fx = fixture("codex", {
    "project/AGENTS.md": "# Agents\n",
    "project/AGENTS.override.md": "# Override\n",
    "project/.agents/skills/team/lint/SKILL.md": skill("lint"),
    "project/.agents/skills/quiet/SKILL.md": skill("quiet"),
    "project/.agents/skills/quiet/agents/openai.yaml": "policy:\n  allow_implicit_invocation: false\n",
    "project/.codex/config.toml": '[mcp_servers.proj]\ncommand = "p"\n',
    "home/.codex/config.toml": '[mcp_servers.off]\ncommand = "x"\nenabled = false\n',
  });
  const entries = scan("codex", fx);
  assert.equal(find(entries, "instructions", "AGENTS.override.md").status, "auto");
  assert.equal(find(entries, "instructions", "AGENTS.md").status, "inactive");
  assert.equal(find(entries, "skills", "lint").status, "auto");
  assert.equal(find(entries, "skills", "quiet").status, "manual");
  assert.equal(find(entries, "mcp", "off").status, "disabled");
  assert.equal(find(entries, "mcp", "proj").status, "inactive");
});

test("codex: trusted project activates project config", () => {
  const fx = fixture("codex-trusted", {
    "project/.codex/config.toml": '[mcp_servers.proj]\ncommand = "p"\n',
  });
  mkdirSync(path.join(fx.home, ".codex"), { recursive: true });
  writeFileSync(path.join(fx.home, ".codex", "config.toml"), `[projects."${fx.project}"]\ntrust_level = "trusted"\n`);
  assert.equal(find(scan("codex", fx), "mcp", "proj").status, "auto");
});

test("cursor: mdc rule states, .md ignored, recursive multi-root skills, mcp-disabled.json", () => {
  const fx = fixture("cursor", {
    "project/.cursor/rules/always.mdc": "---\nalwaysApply: true\n---\nx\n",
    "project/.cursor/rules/ts.mdc": "---\nglobs: src/**/*.ts\n---\nx\n",
    "project/.cursor/rules/agent.mdc": "---\ndescription: pick me\n---\nx\n",
    "project/.cursor/rules/manual.mdc": "x\n",
    "project/.cursor/rules/notes.md": "ignored\n",
    "project/.claude/skills/a/b/SKILL.md": skill("deep"),
    "project/.cursor/mcp.json": JSON.stringify({ mcpServers: { on: { command: "a" }, off: { command: "b" } } }),
  });
  const slug = fx.project.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  mkdirSync(path.join(fx.home, ".cursor", "projects", slug), { recursive: true });
  writeFileSync(path.join(fx.home, ".cursor", "projects", slug, "mcp-disabled.json"), JSON.stringify(["off"]));
  const entries = scan("cursor", fx);
  const rule = (name: string) => entries.find((entry) => entry.category === "rules" && entry.name.startsWith(name));
  assert.equal(rule("always")?.status, "auto");
  assert.equal(rule("ts")?.status, "conditional");
  assert.equal(rule("agent")?.reason?.code, "agentDecides");
  assert.equal(rule("manual")?.status, "manual");
  assert.notEqual(rule("notes")?.status, "auto");
  assert.equal(find(entries, "skills", "deep").status, "auto");
  assert.equal(find(entries, "mcp", "on").status, "auto");
  assert.equal(find(entries, "mcp", "off").status, "disabled");
});

test("opencode: AGENTS.md first match, permission.skill deny, mcp enabled=false", () => {
  const fx = fixture("opencode", {
    "project/AGENTS.md": "# Agents\n",
    "project/CLAUDE.md": "# Claude\n",
    "project/.opencode/skills/secret/SKILL.md": skill("secret"),
    "project/opencode.json": JSON.stringify({ permission: { skill: { secret: "deny" } }, mcp: { m: { type: "local", command: ["x"], enabled: false } } }),
  });
  const entries = scan("opencode", fx);
  assert.equal(find(entries, "instructions", "AGENTS.md").status, "auto");
  assert.equal(find(entries, "instructions", "CLAUDE.md").status, "inactive");
  assert.equal(find(entries, "skills", "secret").status, "disabled");
  assert.equal(find(entries, "mcp", "m").status, "disabled");
});

test("pi: recursive skills, no rules / mcp", () => {
  const fx = fixture("pi", {
    "project/AGENTS.md": "# Agents\n",
    "project/.pi/skills/group/tool/SKILL.md": skill("tool"),
  });
  const entries = scan("pi", fx);
  assert.equal(find(entries, "instructions", "AGENTS.md").status, "auto");
  assert.equal(find(entries, "skills", "tool").status, "auto");
  assert.ok(!entries.some((entry) => entry.category === "rules" || entry.category === "mcp"));
});

test("omp: claude user skills off by default", () => {
  const fx = fixture("omp", {
    "home/.claude/skills/review/SKILL.md": skill("review"),
  });
  const review = find(scan("omp", fx), "skills", "review");
  assert.equal(review.status, "inactive");
  assert.equal(review.reason?.code, "offByDefault");
});

test("every provider scans an empty home without throwing", () => {
  const fx = fixture("empty", {});
  for (const provider of PROVIDER_IDS) {
    assert.ok(Array.isArray(scan(provider, fx)), provider);
  }
});

test("Cursor discovers commands, subagents and plugin manifest", () => {
  const fx = fixture("cursor-extra", {
    "project/.cursor/commands/review.md": "Review this code\n",
    "project/.cursor/agents/explore.md": "---\ndescription: Explore\n---\nExplore\n",
    "project/agents/plugin-agent.md": "Plugin agent\n",
    "project/.cursor-plugin/plugin.json": "{}",
    "home/.cursor/commands/global.md": "Global command\n",
    "home/.claude/agents/compat.md": "Compatibility agent\n",
  });
  const entries = scan("cursor", fx);
  find(entries, "commands", "review.md");
  find(entries, "subagents", "explore.md");
  find(entries, "subagents", "plugin-agent.md");
  find(entries, "subagents", "compat.md");
  find(entries, "commands", "global.md");
  assert.equal(find(entries, "plugins", "project").status, "conditional");
  assert.equal(find(entries, "plugins", "project").agentPlugin, undefined);
});

test("Cursor discovers portable and native local test plugins", () => {
  const fx = fixture("cursor-local-plugins", {
    "home/.cursor/plugins/local/portable/plugin.json": agentPlugin("portable"),
    "home/.cursor/plugins/local/native/.cursor-plugin/plugin.json": JSON.stringify({ name: "native" }),
    "home/.cursor/plugins/local/invalid/plugin.json": agentPlugin("Invalid"),
  });
  const entries = scan("cursor", fx);
  assert.deepEqual(find(entries, "plugins", "portable").agentPlugin, { version: "1.0.0", validation: "valid" });
  assert.equal(find(entries, "plugins", "portable").scope, "user");
  assert.equal(find(entries, "plugins", "native").agentPlugin, undefined);
  assert.equal(find(entries, "plugins", "invalid").agentPlugin, undefined);
});

test("Agent Plugins badge requires a valid portable root manifest", () => {
  const codex = fixture("codex-agent-plugins", {
    "project/plugin.json": agentPlugin("project-plugin"),
    "home/.codex/plugins/portable/plugin.json": agentPlugin("portable", { version: "5.2.0", description: "Shared plugin", unknownField: true }),
    "home/.codex/plugins/tolerated/plugin.json": agentPlugin("tolerated", { extensions: "ignored by the spec" }),
    "home/.codex/plugins/cache/market/cached/1.2.0/plugin.json": agentPlugin("cached"),
    "home/.codex/plugins/invalid/plugin.json": agentPlugin("Bad--Name"),
    "home/.codex/plugins/legacy/.codex-plugin/plugin.json": JSON.stringify({ name: "legacy" }),
    "home/.codex/plugins/old/plugin.json": JSON.stringify({ $schema: "https://agent-plugins.org/schemas/0.9.0/plugin.schema.json", name: "old" }),
    "home/.codex/plugins/future/plugin.json": JSON.stringify({ $schema: "https://agent-plugins.org/schemas/2.0.0/plugin.schema.json", name: "future" }),
    "home/.codex/plugins/other/plugin.json": JSON.stringify({ $schema: "https://example.com/schemas/2.0.0/plugin.schema.json", name: "other" }),
    "home/.codex/plugins/bad-meta/plugin.json": agentPlugin("bad-meta", { keywords: [1] }),
  });
  const codexEntries = scan("codex", codex);
  for (const name of ["project", "portable", "tolerated", "cached"]) {
    assert.deepEqual(find(codexEntries, "plugins", name).agentPlugin, { version: "1.0.0", validation: "valid" }, name);
  }
  assert.deepEqual(find(codexEntries, "plugins", "future").agentPlugin, { version: "2.0.0", validation: "unsupported" });
  assert.deepEqual(find(codexEntries, "plugins", "old").agentPlugin, { version: "0.9.0", validation: "unsupported" });
  for (const name of ["invalid", "legacy", "bad-meta", "other"]) {
    assert.equal(find(codexEntries, "plugins", name).agentPlugin, undefined, name);
  }

  const cursor = fixture("cursor-agent-plugins", {
    "project/plugin.json": agentPlugin("cursor-portable"),
    "project/.cursor-plugin/plugin.json": JSON.stringify({ name: "cursor-native" }),
  });
  const cursorEntry = find(scan("cursor", cursor), "plugins", "project");
  assert.equal(cursorEntry.path, path.join(cursor.project, "plugin.json"));
  assert.deepEqual(cursorEntry.agentPlugin, { version: "1.0.0", validation: "valid" });

  const gemini = fixture("gemini-agent-plugins", {
    "project/plugin.json": JSON.stringify({ $schema: "https://agent-plugins.org/schemas/2.0.0/plugin.schema.json", name: "future-gemini" }),
    "home/.gemini/extensions/portable/plugin.json": agentPlugin("gemini-portable"),
    "home/.gemini/extensions/native/gemini-extension.json": JSON.stringify({ name: "gemini-native" }),
  });
  const geminiEntries = scan("gemini", gemini);
  assert.deepEqual(find(geminiEntries, "plugins", "project").agentPlugin, { version: "2.0.0", validation: "unsupported" });
  assert.deepEqual(find(geminiEntries, "plugins", "portable").agentPlugin, { version: "1.0.0", validation: "valid" });
  assert.equal(find(geminiEntries, "plugins", "native").agentPlugin, undefined);
});

test("ACP providers discover official project configuration paths", () => {
  const cases: Array<[ProviderId, string, Entry["category"], string]> = [
    ["cline", ".cline/agents.yaml", "subagents", "agents.yaml"],
    ["codebuddy-code", ".codebuddy/commands/team/review.md", "commands", "team/review.md"],
    ["gemini", ".gemini/commands/review.toml", "commands", "review.toml"],
    ["goose", ".agents/agents/reviewer.md", "subagents", "reviewer.md"],
    ["grok", ".grok/config.toml", "mcp", "local"],
    ["kilo", ".kilo/agents/reviewer.md", "subagents", "reviewer.md"],
    ["kiro", ".kiro/steering/style.md", "rules", "style.md"],
    ["kimi", ".kimi-code/agents/reviewer.md", "subagents", "reviewer.md"],
    ["qwen-code", ".qwen/agents/reviewer.md", "subagents", "reviewer.md"],
    ["traecli", ".traecli/agents/reviewer.md", "subagents", "reviewer.md"],
  ];
  for (const [provider, file, category, name] of cases) {
    const content = provider === "grok" ? '[mcp_servers.local]\ncommand = "server"\n' : "# Config\n";
    const fx = fixture(`acp-${provider}`, { [`project/${file}`]: content });
    find(scan(provider, fx), category, name);
  }
});

test("Gemini AGENTS.md needs context.fileName; Trae YAML MCP preview redacts secrets", () => {
  const gemini = fixture("gemini-agents", {
    "project/AGENTS.md": "# Rules\n",
    "project/.gemini/settings.json": JSON.stringify({ context: { fileName: ["AGENTS.md", "GEMINI.md"] } }),
  });
  find(scan("gemini", gemini), "instructions", "AGENTS.md");
  const trae = fixture("trae-yaml", {
    "home/.config/trae_cli/trae_cli.yaml": 'mcp_servers:\n  - name: secret-server\n    type: stdio\n    command: npx\n    env:\n      API_KEY: sensitive\n',
  });
  const entry = find(scan("traecli", trae), "mcp", "secret-server");
  const preview = mcpPreview(entry.path, "secret-server");
  assert.ok(preview?.includes("••••••"));
  assert.ok(!preview?.includes("sensitive"));
});

test("Goose extensions and commands come from YAML; Kimi plugin commands are manifest declared", () => {
  const goose = fixture("goose-config", {
    "home/.config/goose/config.yaml": 'extensions:\n  github:\n    type: stdio\n    cmd: npx\n    enabled: false\n    envs:\n      API_KEY: sensitive\nslash_commands:\n  - command: review\n    recipe_path: /tmp/review.yaml\n',
  });
  const gooseEntries = scan("goose", goose);
  assert.equal(find(gooseEntries, "mcp", "github").status, "disabled");
  find(gooseEntries, "commands", "review");
  assert.equal(find(gooseEntries, "plugins", "github").status, "disabled");
  const preview = mcpPreview(find(gooseEntries, "mcp", "github").path, "github");
  assert.ok(preview?.includes("••••••"));
  assert.ok(!preview?.includes("sensitive"));

  const kimi = fixture("kimi-plugin", {
    "home/.kimi-code/plugins/managed/report/kimi.plugin.json": JSON.stringify({ name: "report", commands: "./commands/" }),
    "home/.kimi-code/plugins/managed/report/commands/generate.md": "Generate a report\n",
    "home/.kimi-code/plugins/managed/report/README.md": "This is not a command\n",
  });
  const commands = scan("kimi", kimi).filter((entry) => entry.category === "commands");
  assert.deepEqual(commands.map((entry) => entry.name), ["report:generate"]);
});

test("CodeBuddy marketplace cache, Kilo MCP and Qwen TOML commands", () => {
  const codebuddy = fixture("codebuddy-cache", {
    "home/.codebuddy/plugins/cache/market/reviewer/1.0.0/.codebuddy-plugin/plugin.json": '{"name":"reviewer"}',
  });
  find(scan("codebuddy-code", codebuddy), "plugins", "reviewer");
  const kilo = fixture("kilo-mcp", {
    "project/kilo.jsonc": '{"mcp":{"docs":{"command":"npx"}}}',
  });
  find(scan("kilo", kilo), "mcp", "docs");
  const qwen = fixture("qwen-command", {
    "project/.qwen/commands/review.toml": 'prompt = "Review"\n',
  });
  find(scan("qwen-code", qwen), "commands", "review.toml");
});
