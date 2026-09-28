import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import type { Entry } from "../shared/contracts.ts";
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

function entry(category: Entry["category"], file: string): Entry {
  return { id: `${category}|${file}`, category, scope: "project", name: path.basename(file), path: file, dir: path.dirname(file), source: file, status: "auto", tags: [] };
}

test("tokens: script-aware heuristic counts ASCII, CJK and other non-ASCII", () => {
  assert.equal(estimateTokens(""), 0);
  assert.equal(estimateTokens("a".repeat(400)), 100);
  assert.equal(estimateTokens("中".repeat(15)), 10);
  assert.equal(estimateTokens("こんにちは"), Math.ceil(5 / 1.5));
  assert.equal(estimateTokens("é"), 1);
  assert.equal(estimateTokens("hello 你好"), Math.ceil(6 / 4 + 2 / 1.5));
  assert.ok(estimateTokens("中文内容") > estimateTokens("ab"), "CJK is denser than ASCII at equal length");
});

test("tokens: MCP rows are never counted", () => {
  const root = fixture("mcp", { "mcp.json": JSON.stringify({ mcpServers: { x: { command: "npx" } } }) });
  assert.equal(entryTokens(entry("mcp", path.join(root, "mcp.json"))), undefined);
});

test("tokens: file entries count their own content", () => {
  const root = fixture("files", {
    "project/CLAUDE.md": "# Project\n\nInstructions.\n",
    "project/.claude/rules/always.md": "Always applied rule body\n",
    "project/.cursor/commands/report.md": "---\ndescription: report\n---\nWrite a report\n",
  });
  for (const file of ["project/CLAUDE.md", "project/.claude/rules/always.md", "project/.cursor/commands/report.md"]) {
    const full = path.join(root, file);
    assert.ok((entryTokens(entry("instructions", full)) ?? 0) > 0, file);
  }
});

test("tokens: plugin rows sum component prompts and skip packaging", () => {
  const skillA = "---\nname: a\ndescription: a skill\n---\nDo the thing\n";
  const command = "# Report\n\nSummarize the diff\n";
  const root = fixture("plugin", {
    "skills/a/SKILL.md": skillA,
    "commands/report.md": command,
    "node_modules/dep/SKILL.md": "x".repeat(4000),
    "src/index.js": "console.log('not context')",
    "docs/guide.md": "packaging docs",
    "plugin.json": JSON.stringify({ name: "demo" }),
  });
  assert.equal(entryTokens(entry("plugins", path.join(root, "plugin.json"))), estimateTokens(skillA) + estimateTokens(command));
});

test("tokens: dot-plugin manifests and directory targets resolve to the package root", () => {
  const skill = "---\nname: a\n---\nBody\n";
  const dot = fixture("dot-plugin", { ".codex-plugin/plugin.json": "{}", "skills/a/SKILL.md": skill });
  assert.equal(entryTokens(entry("plugins", path.join(dot, ".codex-plugin", "plugin.json"))), estimateTokens(skill));

  const dir = fixture("dir-plugin", { "agents/review.md": skill });
  assert.equal(entryTokens(entry("plugins", dir)), estimateTokens(skill));
});

test("tokens: non-manifest plugin rows and empty plugins stay uncounted", () => {
  const root = fixture("config-plugin", { "config.yaml": "extensions:\n  demo:\n    type: stdio\n", "empty/plugin.json": "{}" });
  assert.equal(entryTokens(entry("plugins", path.join(root, "config.yaml"))), undefined);
  assert.equal(entryTokens(entry("plugins", path.join(root, "empty", "plugin.json"))), undefined);
});

test("tokens: withTokens attaches only positive counts", () => {
  const root = fixture("attach", { "AGENTS.md": "# Agents\n", "empty.md": "" });
  const entries = withTokens([entry("instructions", path.join(root, "AGENTS.md")), entry("instructions", path.join(root, "empty.md"))]);
  assert.ok((entries[0]?.tokens ?? 0) > 0);
  assert.equal(entries[1]?.tokens, undefined);
});
