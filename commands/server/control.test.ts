import assert from "node:assert/strict";
import { test } from "node:test";
import type { DaemonClient } from "@getpaseo/client/internal/daemon-client";
import type { AgentOptionControl } from "@getpaseo/protocol/agent-types";
import type { AgentControl } from "../shared/rpc.ts";
import { runAgentControl } from "./control.ts";

const controls: AgentOptionControl[] = [
  { type: "toggle", key: "enabled", label: "Enabled" },
  {
    type: "select",
    key: "service_tier",
    label: "Speed",
    choices: [
      { value: "default", label: "Normal" },
      { value: "fast", label: "Fast" },
    ],
  },
];

function fixture() {
  const calls: { method: string; agentId?: string; value?: unknown }[] = [];
  const state = {
    controls,
    bundleAvailable: true,
    agentPresent: true,
    optionError: null as Error | null,
    bundleError: null as Error | null,
    notice: { type: "warning" as const, message: "Permission mode applies next turn" },
  };
  const client = {
    getLastServerInfoMessage: () => ({
      serverId: "server-1",
      features: { agentConfigApply: state.bundleAvailable, providerOptionControls: true },
    }),
    async fetchAgent({ agentId }: { agentId: string }) {
      calls.push({ method: "refresh", agentId });
      return state.agentPresent
        ? { agent: { id: agentId, provider: "codex", controls: state.controls } }
        : null;
    },
    async setAgentOptions(agentId: string, options: Record<string, unknown>) {
      calls.push({ method: "options", agentId, value: options });
      if (state.optionError) throw state.optionError;
      return null;
    },
    async applyAgentConfig(agentId: string, config: unknown) {
      calls.push({ method: "bundle", agentId, value: config });
      if (state.bundleError) throw state.bundleError;
      return state.notice;
    },
    async setAgentModel(agentId: string, modelId: string) {
      calls.push({ method: "model", agentId, value: modelId });
    },
    async setAgentMode(agentId: string, modeId: string) {
      calls.push({ method: "mode", agentId, value: modeId });
      return state.notice;
    },
    async setAgentThinkingOption(agentId: string, thinkingOptionId: string) {
      calls.push({ method: "thinking", agentId, value: thinkingOptionId });
      return state.notice;
    },
    async setAgentFeature() {
      throw new Error("Legacy feature writes must not run.");
    },
    async close() {
      throw new Error("Borrowed API disposal must not close the daemon connection.");
    },
  };
  return { client: client as unknown as DaemonClient, calls, state };
}

test("/feature goes through the public AgentHandle setOptions with a current snapshot", async () => {
  const { client, calls } = fixture();
  assert.deepEqual(
    await runAgentControl(client, { op: "feature", agentId: "a1", featureId: "enabled", value: true }),
    { notice: null },
  );
  assert.deepEqual(calls, [
    { method: "refresh", agentId: "a1" },
    { method: "options", agentId: "a1", value: { enabled: true } },
  ]);
});

test("/feature forwards null resets unchanged to the provider options API", async () => {
  const { client, calls } = fixture();
  await runAgentControl(client, {
    op: "feature",
    agentId: "a1",
    featureId: "service_tier",
    value: null,
  });
  assert.deepEqual(calls[1], {
    method: "options",
    agentId: "a1",
    value: { service_tier: null },
  });
});

test("/feature rejects unknown or disappeared controls before any write", async () => {
  const { client, calls, state } = fixture();
  await assert.rejects(
    runAgentControl(client, { op: "feature", agentId: "a1", featureId: "fast_mode", value: true }),
    /Unknown option "fast_mode"/,
  );
  state.controls = [];
  await assert.rejects(
    runAgentControl(client, { op: "feature", agentId: "a1", featureId: "enabled", value: true }),
    /Unknown option "enabled"/,
  );
  assert.deepEqual(calls.map((call) => call.method), ["refresh", "refresh"]);
});

test("/feature preserves provider rejection without retry or legacy writes", async () => {
  const { client, calls, state } = fixture();
  state.optionError = new Error("This option cannot change on a running session.");
  await assert.rejects(
    runAgentControl(client, { op: "feature", agentId: "a1", featureId: "enabled", value: true }),
    state.optionError,
  );
  assert.deepEqual(calls.map((call) => call.method), ["refresh", "options"]);
});

test("missing agents fail before an options write", async () => {
  const { client, calls, state } = fixture();
  state.agentPresent = false;
  await assert.rejects(
    runAgentControl(client, { op: "feature", agentId: "a1", featureId: "enabled", value: true }),
    { message: "Agent not found." },
  );
  assert.deepEqual(calls.map((call) => call.method), ["refresh"]);
});

test("/profile uses one options bundle and preserves the daemon notice", async () => {
  const { client, calls, state } = fixture();
  const config = {
    modelId: "model-2",
    modeId: "plan",
    thinkingOptionId: "high",
    options: { service_tier: null, enabled: false },
  };
  assert.deepEqual(await runAgentControl(client, { op: "config", agentId: "a1", config }), {
    notice: state.notice,
  });
  assert.deepEqual(calls, [
    { method: "refresh", agentId: "a1" },
    { method: "bundle", agentId: "a1", value: config },
  ]);
  assert.ok(!("featureValues" in config));
});

test("/profile leaves target-model value validation to the bundle provider setters", async () => {
  const { client, calls } = fixture();
  await runAgentControl(client, {
    op: "config",
    agentId: "a1",
    config: { modelId: "model-2", options: { service_tier: "model-2-choice" } },
  });
  assert.deepEqual(calls.map((call) => call.method), ["refresh", "bundle"]);
});

test("/profile rejects unsupported option keys before the entire bundle", async () => {
  const { client, calls } = fixture();
  await assert.rejects(
    runAgentControl(client, {
      op: "config",
      agentId: "a1",
      config: { modelId: "model-2", options: { unknown: true } },
    }),
    /Unknown option "unknown"/,
  );
  assert.deepEqual(calls.map((call) => call.method), ["refresh"]);
});

test("/profile without options still uses the single config bundle", async () => {
  const { client, calls } = fixture();
  await runAgentControl(client, {
    op: "config",
    agentId: "a1",
    config: { modeId: "plan", thinkingOptionId: "high" },
  });
  assert.deepEqual(calls.map((call) => call.method), ["bundle"]);
});

test("/profile capability failure never falls back to individual setters", async () => {
  const { client, calls, state } = fixture();
  state.bundleAvailable = false;
  await assert.rejects(
    runAgentControl(client, {
      op: "config",
      agentId: "a1",
      config: { modelId: "model-2", options: { enabled: true } },
    }),
    { message: "Update the host to apply an agent profile as one config bundle." },
  );
  assert.deepEqual(calls, []);
});

test("/profile bundle rejection is preserved without retry", async () => {
  const { client, calls, state } = fixture();
  state.bundleError = new Error("Provider rejected the profile options.");
  await assert.rejects(
    runAgentControl(client, {
      op: "config",
      agentId: "a1",
      config: { modeId: "plan", options: { enabled: true } },
    }),
    state.bundleError,
  );
  assert.deepEqual(calls.map((call) => call.method), ["refresh", "bundle"]);
});

test("other runtime operations retain their existing daemon notice behavior", async () => {
  const { client, calls, state } = fixture();
  const requests: AgentControl[] = [
    { op: "model", agentId: "a1", modelId: "model-2" },
    { op: "mode", agentId: "a1", modeId: "plan" },
    { op: "thinking", agentId: "a1", thinkingOptionId: "high" },
  ];
  assert.deepEqual(await runAgentControl(client, requests[0]!), { notice: null });
  assert.deepEqual(await runAgentControl(client, requests[1]!), { notice: state.notice });
  assert.deepEqual(await runAgentControl(client, requests[2]!), { notice: state.notice });
  assert.deepEqual(calls.map((call) => call.method), ["model", "mode", "thinking"]);
});
