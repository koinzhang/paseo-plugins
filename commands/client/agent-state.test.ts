import assert from "node:assert/strict";
import { test } from "node:test";
import type { AgentOptionControl } from "@getpaseo/protocol/agent-types";
import type { AgentSnapshotPayload } from "@getpaseo/protocol/messages";
import { planFeature, planProfile } from "../shared/commands.ts";
import { loadAgentState } from "./agent-state.ts";

const controls: AgentOptionControl[] = [
  { type: "toggle", key: "enabled", label: "Enabled", defaultValue: true },
  {
    type: "select",
    key: "service_tier",
    label: "Speed",
    defaultValue: "default",
    choices: [
      { value: "default", label: "Normal" },
      { value: "fast", label: "Fast" },
    ],
  },
];

function fixture(patch: Partial<AgentSnapshotPayload> = {}) {
  const snapshot = {
    id: "a1",
    provider: "codex",
    cwd: "/workspace",
    status: "idle",
    availableModes: [],
    model: "model-1",
    effectiveThinkingOptionId: "high",
    currentModeId: "auto",
    ...patch,
  };
  const state = { agentPresent: true };
  const calls: string[] = [];
  const paseo = {
    agents: {
      ref(agentId: string) {
        assert.equal(agentId, "a1");
        return {
          async refresh() {
            calls.push("refresh");
            return state.agentPresent ? { agent: snapshot } : null;
          },
        };
      },
    },
    providers: {
      async listModels() {
        throw new Error("Unrequested model catalog read.");
      },
      async listModes() {
        throw new Error("Unrequested mode catalog read.");
      },
    },
  };
  return {
    paseo: paseo as unknown as Parameters<typeof loadAgentState>[0],
    snapshot,
    state,
    calls,
  };
}

test("loadAgentState connects modern controls/options to feature and profile plans", async () => {
  const { paseo, snapshot, calls } = fixture({
    controls,
    options: { enabled: false, service_tier: "fast" },
  });
  const loaded = await loadAgentState(paseo, "a1");
  assert.equal(loaded.controls, snapshot.controls);
  assert.equal(loaded.options, snapshot.options);
  assert.deepEqual(loaded.features.map((feature) => [feature.id, feature.value]), [
    ["enabled", false],
    ["service_tier", "fast"],
  ]);
  assert.deepEqual(planFeature("service_tier normal", loaded), {
    kind: "run",
    control: { op: "feature", agentId: "a1", featureId: "service_tier", value: "default" },
  });
  assert.deepEqual(
    planProfile("current", loaded, [
      { id: "current", name: "Current", provider: "codex", options: { service_tier: null } },
    ]),
    {
      kind: "run",
      control: { op: "config", agentId: "a1", config: { options: { service_tier: null } } },
    },
  );
  assert.deepEqual(calls, ["refresh"]);
});

test("loadAgentState never lets legacy values override current options", async () => {
  const { paseo } = fixture({
    controls,
    options: { enabled: false, service_tier: "fast" },
    features: [
      { type: "toggle", id: "enabled", label: "Old enabled", value: true },
      { type: "toggle", id: "fast_mode", label: "Old fast", value: true },
    ],
  });
  const loaded = await loadAgentState(paseo, "a1");
  assert.deepEqual(loaded.features.map((feature) => [feature.id, feature.value]), [
    ["enabled", false],
    ["service_tier", "fast"],
  ]);
  assert.throws(() => planFeature("fast_mode on", loaded), /Unknown feature "fast_mode"/);
});

test("loadAgentState preserves empty controls instead of reviving legacy features", async () => {
  const { paseo } = fixture({
    controls: [],
    options: {},
    features: [{ type: "toggle", id: "enabled", label: "Old enabled", value: true }],
  });
  const loaded = await loadAgentState(paseo, "a1");
  assert.deepEqual(loaded.features, []);
  assert.throws(() => planFeature("", loaded), /exposes no features/);
});

test("loadAgentState uses official control defaults without legacy values", async () => {
  const { paseo } = fixture({
    controls,
    options: {},
    features: [{ type: "toggle", id: "enabled", label: "Old enabled", value: false }],
  });
  const loaded = await loadAgentState(paseo, "a1");
  assert.deepEqual(loaded.features.map((feature) => feature.value), [true, "default"]);
});

test("loadAgentState retains legacy snapshot display compatibility and other runtime fields", async () => {
  const features: NonNullable<AgentSnapshotPayload["features"]> = [
    { type: "toggle", id: "enabled", label: "Enabled", value: false },
    {
      type: "select",
      id: "verbosity",
      label: "Verbosity",
      value: "low",
      options: [{ id: "low", label: "Low", isDefault: true }],
    },
  ];
  const { paseo } = fixture({ features });
  const loaded = await loadAgentState(paseo, "a1");
  assert.deepEqual(loaded.features, features);
  assert.equal(loaded.controls, undefined);
  assert.equal(loaded.options, undefined);
  assert.equal(loaded.modelId, "model-1");
  assert.equal(loaded.thinkingOptionId, "high");
  assert.equal(loaded.modeId, "auto");
  assert.deepEqual(planFeature("enabled --default", loaded), {
    kind: "run",
    control: { op: "feature", agentId: "a1", featureId: "enabled", value: null },
  });
});

test("loadAgentState preserves the missing agent error", async () => {
  const { paseo, state } = fixture();
  state.agentPresent = false;
  await assert.rejects(loadAgentState(paseo, "a1"), { message: "Agent not found." });
});
