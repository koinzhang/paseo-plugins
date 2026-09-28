import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import type { Entry, Status } from "../shared/contracts.ts";
import { entryTokens, estimateTokens, withTokens } from "./tokens.ts";

const base = realpathSync(mkdtempSync(path.join(tmpdir(), "customize-tokens-")));
after(() => rmSync(base, { recursive: true, force: true }));

function fixture(name: string, files: Record<string, string>): string {
  const root = path.join(base, name);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  mkdirSync(root, { recursive: true });
  return root;
}

function entry(category: Entry["category"], file: string, extra: Partial<Entry> = {}): Entry {
  return { id: `${category}|${file}`, category, scope: "project", name: path.basename(file), path: file, dir: path.dirname(file), source: file, status: "auto", tags: [], ...extra };
}

const SKILL = "---\nname: deploy\ndescription: Ship the service safely\n---\n\n## Steps\n\nRun the release script and verify the health check.\n";

test("tokens: script-aware heuristic counts ASCII, CJK and other non-ASCII", () => {
  assert.equal(estimateTokens(""), 0);
  assert.equal(estimateTokens("a".repeat(400)), 100);
  assert.equal(estimateTokens("中".repeat(15)), 16);
  assert.equal(estimateTokens("こんにちは"), 6);
  assert.equal(estimateTokens("é"), 1);
  assert.equal(estimateTokens("hello 你好"), Math.ceil(6 / 4 + 2 * 1.05));
  assert.ok(estimateTokens("中文内容") > estimateTokens("ab"), "CJK is denser than ASCII at equal length");
  assert.equal(estimateTokens("a".repeat(400) + "中".repeat(15)), Math.ceil(100 + 15 * 1.05), "ASCII and CJK add up independently");
});

test("tokens: MCP and non-loaded rows are never counted", () => {
  const root = fixture("mcp", {
    "mcp.json": JSON.stringify({ mcpServers: { x: { command: "npx" } } }),
    "AGENTS.md": "# Agents\n",
  });
  assert.equal(entryTokens(entry("mcp", path.join(root, "mcp.json"))), undefined);
  assert.equal(entryTokens(entry("instructions", path.join(root, "AGENTS.md"), { status: "inactive" })), undefined);
  assert.equal(entryTokens(entry("skills", path.join(root, "AGENTS.md"), { status: "disabled" })), undefined);
});

test("tokens: instructions and rules are always-on content", () => {
  const root = fixture("always", {
    "project/CLAUDE.md": "# Project\n\nInstructions.\n",
    "project/.claude/rules/always.md": "Always applied rule body\n",
  });
  for (const [category, file] of [["instructions", "project/CLAUDE.md"], ["rules", "project/.claude/rules/always.md"]] as const) {
    const cost = entryTokens(entry(category, path.join(root, file)));
    assert.ok(cost && cost.atRest > 0, file);
    assert.equal(cost.onInvoke, 0, file);
  }
});

test("tokens: on-demand entries split advertised metadata from the body", () => {
  const root = fixture("split", { "skills/deploy/SKILL.md": SKILL });
  const file = path.join(root, "skills/deploy/SKILL.md");
  const cost = entryTokens(entry("skills", file, { name: "deploy", description: "Ship the service safely" }));
  assert.ok(cost);
  const full = estimateTokens(SKILL);
  const advertised = estimateTokens("deploy\nShip the service safely");
  assert.equal(cost.atRest, advertised);
  assert.equal(cost.onInvoke, full - advertised);
  assert.equal(cost.atRest + cost.onInvoke, full, "the two segments add up to the file");

  const manual = entryTokens(entry("skills", file, { status: "manual", name: "deploy", description: "Ship the service safely" }));
  assert.deepEqual(manual, { atRest: 0, onInvoke: full }, "manual-only skills are not advertised");
});

test("tokens: commands and subagents split like skills", () => {
  const root = fixture("commands", {
    "commands/report.md": "---\ndescription: Write a report\n---\nSummarize the diff in detail.\n",
    "agents/review.md": "---\ndescription: Review a change\n---\nRead the diff and list risks.\n",
  });
  for (const [category, file, description] of [
    ["commands", "commands/report.md", "Write a report"],
    ["subagents", "agents/review.md", "Review a change"],
  ] as const) {
    const cost = entryTokens(entry(category, path.join(root, file), { name: path.basename(file, ".md"), description }));
    assert.ok(cost && cost.atRest > 0 && cost.onInvoke > 0, file);
  }
});

test("tokens: plugin rows split advertised components from their bodies", () => {
  const root = fixture("plugin", {
    "skills/a/SKILL.md": SKILL,
    "skills/a/reference.md": "Deep reference material for the skill body.\n",
    "commands/report.md": "---\ndescription: Write a report\n---\nSummarize the diff in detail.\n",
    "rules/style.md": "Always write tests.\n",
    "node_modules/dep/SKILL.md": "x".repeat(4000),
    "src/index.js": "console.log('not context')",
    "plugin.json": JSON.stringify({ name: "demo" }),
  });
  const cost = entryTokens(entry("plugins", path.join(root, "plugin.json")));
  assert.ok(cost);
  const advertisedSkill = estimateTokens("deploy\nShip the service safely");
  const advertisedCommand = estimateTokens("report\nWrite a report");
  const skillFull = estimateTokens(SKILL);
  const commandFull = estimateTokens("---\ndescription: Write a report\n---\nSummarize the diff in detail.\n");
  assert.equal(cost.atRest, advertisedSkill + advertisedCommand + estimateTokens("Always write tests.\n"));
  assert.equal(cost.onInvoke, skillFull - advertisedSkill + estimateTokens("Deep reference material for the skill body.\n") + commandFull - advertisedCommand);
});

test("tokens: dot-plugin manifests and directory targets resolve to the package root", () => {
  const dot = fixture("dot-plugin", { ".codex-plugin/plugin.json": "{}", "skills/a/SKILL.md": SKILL });
  const fromDot = entryTokens(entry("plugins", path.join(dot, ".codex-plugin", "plugin.json")));
  assert.deepEqual(fromDot, { atRest: estimateTokens("deploy\nShip the service safely"), onInvoke: estimateTokens(SKILL) - estimateTokens("deploy\nShip the service safely") });

  const dir = fixture("dir-plugin", { "agents/review.md": SKILL });
  const fromDir = entryTokens(entry("plugins", dir));
  assert.deepEqual(fromDir, fromDot, "a directory target and a manifest resolve to the same package");
});

test("tokens: non-manifest plugin rows and empty plugins stay uncounted", () => {
  const root = fixture("config-plugin", { "config.yaml": "extensions:\n  demo:\n    type: stdio\n", "empty/plugin.json": "{}" });
  assert.equal(entryTokens(entry("plugins", path.join(root, "config.yaml"))), undefined);
  assert.equal(entryTokens(entry("plugins", path.join(root, "empty", "plugin.json"))), undefined);
});

test("tokens: withTokens attaches only rows with a cost", () => {
  const root = fixture("attach", { "AGENTS.md": "# Agents\n", "empty.md": "" });
  const entries = withTokens([
    entry("instructions", path.join(root, "AGENTS.md")),
    entry("instructions", path.join(root, "empty.md")),
  ]);
  assert.deepEqual(entries[0]?.tokens, { atRest: estimateTokens("# Agents\n"), onInvoke: 0 });
  assert.equal(entries[1]?.tokens, undefined);
});

test("tokens: every status that loads nothing is skipped", () => {
  const root = fixture("statuses", { "SKILL.md": SKILL });
  const file = path.join(root, "SKILL.md");
  for (const status of ["disabled", "inactive"] as Status[]) {
    assert.equal(entryTokens(entry("skills", file, { status })), undefined, status);
  }
  for (const status of ["auto", "conditional", "manual"] as Status[]) {
    assert.ok(entryTokens(entry("skills", file, { status })), status);
  }
});
