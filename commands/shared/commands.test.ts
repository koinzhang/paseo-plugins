import assert from "node:assert/strict";
import { test } from "node:test";
import {
  planCancel,
  planEffort,
  planFeature,
  planMode,
  planModel,
  planProfile,
  planRename,
  type AgentState,
  type PickerEntry,
  type Plan,
  type Profile,
} from "./commands.ts";
import { splitFirst, parseToggle } from "./parse.ts";

const state: AgentState = {
  agentId: "a1",
  provider: "codex",
  status: "idle",
  modelId: "gpt-5.6-sol",
  thinkingOptionId: "medium",
  modeId: "auto",
  models: [
    {
      id: "gpt-5.6-sol",
      label: "GPT-5.6 Sol",
      isDefault: true,
      thinkingOptions: [
        { id: "medium", label: "Medium", isDefault: true },
        { id: "high", label: "High" },
        { id: "extra-high", label: "Extra High" },
      ],
    },
    { id: "gpt-5.6-mini", label: "GPT-5.6 Mini", thinkingOptions: [] },
  ],
  modes: [
    { id: "read-only", label: "Read only" },
    { id: "auto", label: "Auto" },
    { id: "full-access", label: "Full access" },
  ],
  features: [
    { type: "toggle", id: "fast_mode", label: "Fast mode", value: false },
    {
      type: "select",
      id: "verbosity",
      label: "Verbosity",
      value: "low",
      options: [
        { id: "low", label: "Low" },
        { id: "high", label: "High" },
      ],
    },
  ],
};

function picker(plan: Plan) {
  assert.equal(plan.kind, "picker");
  return plan as Extract<Plan, { kind: "picker" }>;
}

function run(plan: Plan) {
  assert.equal(plan.kind, "run");
  return plan as Extract<Plan, { kind: "run" }>;
}

const titles = (items: PickerEntry[]) => items.map((item) => item.title);
const current = (items: PickerEntry[]) =>
  items.filter((item) => "current" in item && item.current).map((item) => item.id);

test("splitFirst and parseToggle", () => {
  assert.deepEqual(splitFirst("  fast_mode   true "), { head: "fast_mode", rest: "true" });
  assert.deepEqual(splitFirst(""), { head: "", rest: "" });
  assert.equal(parseToggle("ON"), true);
  assert.equal(parseToggle("disabled"), false);
  assert.equal(parseToggle("maybe"), null);
});

test("/model without args opens a picker marking the current model", () => {
  const plan = picker(planModel("", state));
  assert.deepEqual(titles(plan.items), ["GPT-5.6 Sol", "GPT-5.6 Mini"]);
  assert.deepEqual(current(plan.items), ["gpt-5.6-sol"]);
});

test("/model <id> switches by exact, case-insensitive, or prefix match", () => {
  assert.deepEqual(run(planModel("gpt-5.6-mini", state)).control, {
    op: "model",
    agentId: "a1",
    modelId: "gpt-5.6-mini",
  });
  assert.equal(
    (run(planModel("GPT-5.6 mini", state)).control as { modelId: string }).modelId,
    "gpt-5.6-mini",
  );
  assert.throws(() => planModel("gpt", state), /^Error: Ambiguous model "gpt"/);
  assert.throws(() => planModel("mini", state), /^Error: Unknown model "mini"/);
});

test("/model falls back to the provider default when the agent has no explicit model", () => {
  const plan = picker(planModel("", { ...state, modelId: null }));
  assert.deepEqual(current(plan.items), ["gpt-5.6-sol"]);
});

test("/effort lists the current model's levels and marks the current one", () => {
  const plan = picker(planEffort("", state));
  assert.equal(plan.title, "Thinking effort");
  assert.deepEqual(titles(plan.items), ["Medium", "High", "Extra High"]);
  assert.deepEqual(current(plan.items), ["medium"]);
});

test("/effort marks the model default when no level is set", () => {
  const plan = picker(planEffort("", { ...state, thinkingOptionId: null }));
  assert.deepEqual(current(plan.items), ["medium"]);
});

test("/effort <level> resolves against provider options only", () => {
  assert.deepEqual(run(planEffort("extra high", state)).control, {
    op: "thinking",
    agentId: "a1",
    thinkingOptionId: "extra-high",
  });
  assert.throws(() => planEffort("max", state), {
    message: 'Unknown effort "max".\nAvailable: medium, high, extra-high',
  });
  assert.throws(
    () => planEffort("high", { ...state, modelId: "gpt-5.6-mini" }),
    /has no thinking effort levels/,
  );
});

test("/mode picker and switch", () => {
  assert.deepEqual(current(picker(planMode("", state)).items), ["auto"]);
  assert.deepEqual(run(planMode("full", state)).control, {
    op: "mode",
    agentId: "a1",
    modeId: "full-access",
  });
  assert.throws(() => planMode("plan", { ...state, modes: [] }), /exposes no modes/);
});

test("/feature without args lists features with their values as submenus", () => {
  const plan = picker(planFeature("", state));
  assert.deepEqual(titles(plan.items), ["Fast mode: off", "Verbosity: Low"]);
  const fast = plan.items[0];
  assert.ok(fast && "items" in fast);
  assert.deepEqual(current(fast.items), ["off"]);
});

test("/feature <name> lists that feature's values", () => {
  const plan = picker(planFeature("verb", state));
  assert.deepEqual(titles(plan.items), ["Low", "High"]);
  assert.deepEqual(current(plan.items), ["low"]);
});

test("/feature <name> <value> sets toggles and selects", () => {
  assert.deepEqual(run(planFeature("fast_mode true", state)).control, {
    op: "feature",
    agentId: "a1",
    featureId: "fast_mode",
    value: true,
  });
  assert.deepEqual(run(planFeature("Fast off", state)).control, {
    op: "feature",
    agentId: "a1",
    featureId: "fast_mode",
    value: false,
  });
  assert.equal(
    (run(planFeature("verbosity HIGH", state)).control as { value: unknown }).value,
    "high",
  );
  assert.throws(() => planFeature("fast_mode maybe", state), {
    message: 'Unknown fast_mode value "maybe".\nAvailable: on, off',
  });
  assert.throws(() => planFeature("turbo on", state), /^Error: Unknown feature "turbo"/);
  assert.throws(() => planFeature("", { ...state, features: [] }), /exposes no features/);
});

const profiles: Profile[] = [
  {
    id: "reviewer",
    name: "Reviewer",
    provider: "codex",
    model: "gpt-5.6-sol",
    modeId: "read-only",
    thinkingOptionId: "high",
    featureValues: { fast_mode: true },
  },
  { id: "claude-plan", name: "Claude Plan", provider: "claude", modeId: "plan" },
  {
    id: "partial",
    name: "Partial",
    provider: "codex",
    modeId: "plan",
    thinkingOptionId: "high",
    featureValues: { unknown_flag: 1 },
    cwd: "/tmp",
  },
];

test("/profile without args lists profiles and disables other providers", () => {
  const plan = picker(planProfile("", state, profiles));
  assert.deepEqual(titles(plan.items), ["Reviewer", "Claude Plan (claude)", "Partial"]);
  const claude = plan.items[1];
  assert.ok(claude && "disabled" in claude && claude.disabled);
});

test("/profile <name> applies runtime fields as one config bundle", () => {
  const plan = run(planProfile("review", state, profiles));
  assert.deepEqual(plan.control, {
    op: "config",
    agentId: "a1",
    config: {
      modelId: "gpt-5.6-sol",
      modeId: "read-only",
      thinkingOptionId: "high",
      featureValues: { fast_mode: true },
    },
  });
  assert.equal(plan.note, undefined);
});

test("/profile ignores unsupported fields with a short note", () => {
  const plan = run(planProfile("partial", state, profiles));
  assert.deepEqual(plan.control, {
    op: "config",
    agentId: "a1",
    config: { thinkingOptionId: "high" },
  });
  assert.equal(
    plan.note,
    'Applied profile "Partial". Ignored: mode "plan", feature "unknown_flag", cwd.',
  );
});

test("/profile rejects another provider and missing profiles", () => {
  assert.throws(
    () => planProfile("claude", state, profiles),
    /targets claude; this agent runs codex/,
  );
  assert.throws(() => planProfile("x", state, []), /No agent profiles configured/);
  assert.throws(() => planProfile("nope", state, profiles), /^Error: Unknown profile "nope"/);
});

test("/rename requires a title and keeps spaces", () => {
  assert.deepEqual(run(planRename("  Payment Review ", "a1")).control, {
    op: "rename",
    agentId: "a1",
    title: "Payment Review",
  });
  assert.throws(() => planRename("  ", "a1"), { message: "Usage: /rename <title>" });
});

test("/cancel only when running", () => {
  assert.deepEqual(run(planCancel("a1", "running")).control, { op: "cancel", agentId: "a1" });
  assert.throws(() => planCancel("a1", "idle"), { message: "Nothing to cancel: the agent is idle." });
});
