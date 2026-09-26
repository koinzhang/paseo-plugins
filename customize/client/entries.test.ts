import assert from "node:assert/strict";
import { test } from "node:test";
import type { Entry } from "../shared/contracts.ts";
import { messagesFor, resolveAppLanguage } from "../shared/i18n.ts";
import { countByCategory, countSkillInvocation, groupEntries, matchesSkillInvocation, projectLabel } from "./entries.ts";

const entry = (over: Partial<Entry>): Entry => ({
  id: over.name ?? "x",
  category: "skills",
  scope: "project",
  name: "x",
  path: "/p/x",
  dir: "./x",
  source: ".agents/skills",
  status: "auto",
  tags: [],
  ...over,
});

test("groupEntries: project before user, sources grouped, query filters", () => {
  const entries = [
    entry({ name: "b", scope: "user", source: "~/.agents/skills" }),
    entry({ name: "a" }),
    entry({ name: "c", source: ".claude/skills" }),
    entry({ name: "r", category: "rules" }),
  ];
  const groups = groupEntries(entries, "skills", "");
  assert.deepEqual(groups.map((group) => [group.scope, group.count]), [["project", 2], ["user", 1]]);
  assert.deepEqual(groups[0]?.sources.map((source) => source.source), [".agents/skills", ".claude/skills"]);
  assert.equal(groupEntries(entries, "skills", "CLAUDE")[0]?.count, 1);
  assert.deepEqual(countByCategory(entries), { instructions: 0, rules: 1, skills: 3, mcp: 0, commands: 0, subagents: 0, plugins: 0 });
});

test("skill invocation: auto includes conditional, manual is exact, other statuses stay in all", () => {
  const entries = [
    entry({ name: "auto" }),
    entry({ name: "conditional", status: "conditional" }),
    entry({ name: "manual", status: "manual" }),
    entry({ name: "disabled", status: "disabled" }),
    entry({ name: "rule", category: "rules", status: "manual" }),
  ];
  assert.equal(matchesSkillInvocation(entries[0]!, "auto"), true);
  assert.equal(matchesSkillInvocation(entries[1]!, "auto"), true);
  assert.equal(matchesSkillInvocation(entries[2]!, "auto"), false);
  assert.equal(matchesSkillInvocation(entries[3]!, "auto"), false);
  assert.equal(matchesSkillInvocation(entries[2]!, "manual"), true);
  assert.deepEqual(countSkillInvocation(entries), { all: 4, auto: 2, manual: 1 });
  assert.deepEqual(groupEntries(entries, "skills", "", "auto").map((group) => group.count), [2, 0]);
  assert.deepEqual(groupEntries(entries, "skills", "manual", "manual")[0]?.sources[0]?.entries.map((item) => item.name), ["manual"]);
  assert.equal(groupEntries(entries, "rules", "", "auto")[0]?.count, 1);
});

test("projectLabel / resolveAppLanguage", () => {
  assert.equal(projectLabel("/Users/me/repo/"), "repo");
  assert.equal(resolveAppLanguage("zh-CN"), "zh-CN");
  assert.equal(resolveAppLanguage("system", ["zh-Hans-CN"]), "zh-CN");
  assert.equal(resolveAppLanguage("fr"), "en");
  assert.equal(messagesFor("en").agentPluginLabel("1.0.0", "valid"), "Agent Plugins 1.0.0");
  assert.equal(messagesFor("zh-CN").agentPluginLabel("2.0.0", "unsupported"), "Agent Plugins 2.0.0（未校验）");
});

test("workspaceIdFromPath: plain, encoded, b64_, non-workspace routes", async () => {
  const { workspaceIdFromPath } = await import("./route.ts");
  assert.equal(workspaceIdFromPath("/h/srv/workspace/ws_123"), "ws_123");
  assert.equal(workspaceIdFromPath("/h/srv/workspace/ws%20a?open=x"), "ws a");
  const encoded = Buffer.from("/Users/me/repo").toString("base64url");
  assert.equal(workspaceIdFromPath(`/h/srv/workspace/b64_${encoded}`), "/Users/me/repo");
  assert.equal(workspaceIdFromPath("/h/srv/plugin/customize/customize"), null);
});
