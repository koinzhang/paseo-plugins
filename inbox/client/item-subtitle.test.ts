import assert from "node:assert/strict";
import { test } from "node:test";
import type { Item } from "../shared/contracts.ts";
import { formatItemTime, workspaceItemSubtitle } from "./item-subtitle.ts";

const item: Item = {
  id: "item",
  kind: "note",
  title: "Title",
  body: "Body",
  projectKey: "repo",
  projectLabel: "project",
  agentId: null,
  agentSnapshot: null,
  workspaceId: "workspace",
  workspaceLabel: "main",
  pinned: false,
  createdAt: "2026-11-25T00:00:00.000Z",
  updatedAt: "2026-11-25T12:34:56.000Z",
};

test("workspace note subtitle omits project and shows full edit time and date", () => {
  const [part] = workspaceItemSubtitle(item, undefined);
  assert.match(part!.label, / · /);
  assert.doesNotMatch(part!.label, /project|main/);
  assert.equal(part!.label, formatItemTime(item.updatedAt));
});

test("workspace agent subtitle prefers host update time and marks star fallback", () => {
  const agent: Item = {
    ...item,
    kind: "agent",
    agentId: "agent",
    agentSnapshot: { title: "Worker", provider: "codex", model: null, workspaceId: "workspace", cwd: "/repo" },
  };
  assert.equal(workspaceItemSubtitle(agent, "2026-11-25T12:00:00.000Z")[0]!.label, `codex · ${formatItemTime("2026-11-25T12:00:00.000Z")}`);
  assert.equal(workspaceItemSubtitle(agent, null)[0]!.label, `codex · starred ${formatItemTime(agent.createdAt)}`);
  assert.equal(workspaceItemSubtitle({ ...agent, agentSnapshot: { ...agent.agentSnapshot!, provider: "claude" } }, null)[0]!.label, `claude · starred ${formatItemTime(agent.createdAt)}`);
});
