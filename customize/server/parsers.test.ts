import assert from "node:assert/strict";
import { test } from "node:test";
import { fmList, parseFrontmatter } from "./frontmatter.ts";
import { matchGlob } from "./glob.ts";
import { parseJsonc } from "./jsonc.ts";
import { describeServer, redactServer } from "./mcp.ts";
import { parseToml } from "./toml.ts";
import { parseYaml } from "./yaml-lite.ts";

test("toml: tables, dotted / quoted keys, arrays of tables, inline tables", () => {
  const doc = parseToml(`
model = "gpt" # comment
[projects."/Users/me/repo"]
trust_level = "trusted"

[mcp_servers.github]
command = "npx"
args = ["-y", "server", 'x']
env = { TOKEN = "secret" }
enabled = false

[[skills.config]]
path = "/a/SKILL.md"
enabled = false
[[skills.config]]
path = "/b/SKILL.md"
`);
  assert.equal(doc.model, "gpt");
  assert.deepEqual(doc.projects, { "/Users/me/repo": { trust_level: "trusted" } });
  const github = (doc.mcp_servers as Record<string, Record<string, unknown>>).github;
  assert.deepEqual(github.args, ["-y", "server", "x"]);
  assert.deepEqual(github.env, { TOKEN: "secret" });
  assert.equal(github.enabled, false);
  const config = (doc.skills as { config: Array<Record<string, unknown>> }).config;
  assert.equal(config.length, 2);
  assert.equal(config[0]?.enabled, false);
});

test("yaml-lite: maps, lists, inline lists, block scalars", () => {
  const doc = parseYaml(`
name: demo
description: >
  folded
  text
globs: ["*.ts", "*.tsx"]
skills:
  enableClaudeUser: true
  ignoredSkills:
    - foo
    - "bar"
`);
  assert.equal(doc.name, "demo");
  assert.equal(doc.description, "folded text");
  assert.deepEqual(doc.globs, ["*.ts", "*.tsx"]);
  assert.deepEqual(doc.skills, { enableClaudeUser: true, ignoredSkills: ["foo", "bar"] });
});

test("frontmatter: data, body, list joining", () => {
  const { data, body } = parseFrontmatter("---\nname: x\npaths:\n  - src/**\n  - lib/**\n---\n# Title\n");
  assert.equal(data.name, "x");
  assert.equal(fmList(data, "paths"), "src/**, lib/**");
  assert.equal(body.trim(), "# Title");
  assert.deepEqual(parseFrontmatter("no frontmatter").data, {});
});

test("jsonc: comments and trailing commas", () => {
  assert.deepEqual(parseJsonc(`{ // c\n "a": [1, 2,], /* b */ "u": "http://x" }`), { a: [1, 2], u: "http://x" });
});

test("glob: ** / * / ?", () => {
  assert.ok(matchGlob("**/node_modules/**", "/a/node_modules/b/CLAUDE.md"));
  assert.ok(matchGlob("src/*.ts", "src/a.ts"));
  assert.ok(!matchGlob("src/*.ts", "src/a/b.ts"));
  assert.ok(matchGlob("a?.md", "ab.md"));
});

test("mcp redaction masks env / headers / secret args and URL params", () => {
  const redacted = JSON.stringify(
    redactServer({
      command: "npx",
      args: ["server", "--token", "abc123", "--api-key=xyz", "plain"],
      env: { GITHUB_TOKEN: "ghp_real" },
      headers: { Authorization: "Bearer real" },
      url: "https://x.dev/mcp?key=real&mode=a",
    }),
  );
  for (const secret of ["abc123", "xyz", "ghp_real", "Bearer real", "key=real"]) assert.ok(!redacted.includes(secret), secret);
  assert.ok(redacted.includes("plain"));
  assert.ok(redacted.includes("GITHUB_TOKEN"));
  assert.deepEqual(describeServer({ url: "https://x.dev/mcp" }).transport.length > 0, true);
  assert.equal(describeServer({ command: "npx", args: ["-y", "srv"] }).transport, "stdio");
});
