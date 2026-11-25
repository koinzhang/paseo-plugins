import assert from "node:assert/strict";
import { test } from "node:test";
import type { AgentState } from "../shared/commands.ts";
import { runtimeControlNotice } from "./runtime-notice.ts";

const state: AgentState = {
  agentId: "a1",
  provider: "codex",
  status: "running",
  modelId: "gpt",
  thinkingOptionId: "medium",
  modeId: "auto",
  models: [],
  modes: [],
  features: [],
};

test("running Codex reports next-turn mode and thinking notices", () => {
  assert.equal(
    runtimeControlNotice(state, { op: "mode", agentId: "a1", modeId: "plan" }),
    "Permission mode applies next turn",
  );
  assert.equal(
    runtimeControlNotice(state, { op: "thinking", agentId: "a1", thinkingOptionId: "high" }),
    "Thinking level applies next turn",
  );
});

test("running Claude reports only the thinking notice", () => {
  const claude = { ...state, provider: "claude" };
  assert.equal(
    runtimeControlNotice(claude, { op: "thinking", agentId: "a1", thinkingOptionId: "high" }),
    "Thinking level applies next turn",
  );
  assert.equal(
    runtimeControlNotice(claude, { op: "mode", agentId: "a1", modeId: "plan" }),
    null,
  );
});

test("idle agents, model changes and other providers have no inferred notice", () => {
  const thinking = { op: "thinking", agentId: "a1", thinkingOptionId: "high" } as const;
  assert.equal(runtimeControlNotice({ ...state, status: "idle" }, thinking), null);
  assert.equal(runtimeControlNotice({ ...state, provider: "pi" }, thinking), null);
  assert.equal(
    runtimeControlNotice(state, { op: "model", agentId: "a1", modelId: "other" }),
    null,
  );
});
