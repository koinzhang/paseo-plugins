import assert from "node:assert/strict";
import { test } from "node:test";
import type { AgentOptionControl } from "@getpaseo/protocol/agent-types";
import { assertSupportedOptions, optionFeatures } from "./agent-options.ts";

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

test("optionFeatures reads current controls and effective options ahead of legacy features", () => {
  const features = optionFeatures({
    controls,
    options: { enabled: false, service_tier: "fast" },
    features: [{ type: "toggle", id: "fast_mode", label: "Old fast", value: true }],
  });
  assert.deepEqual(features.map((feature) => [feature.id, feature.value]), [
    ["enabled", false],
    ["service_tier", "fast"],
  ]);
  const speed = features[1];
  assert.ok(speed?.type === "select");
  assert.deepEqual(speed.options, [
    { id: "default", label: "Normal", isDefault: true },
    { id: "fast", label: "Fast" },
  ]);
});

test("optionFeatures reuses control defaults when effective options are absent", () => {
  assert.deepEqual(optionFeatures({ controls }).map((feature) => feature.value), [true, "default"]);
});

test("empty current controls do not restore stale legacy features", () => {
  assert.deepEqual(
    optionFeatures({
      controls: [],
      features: [{ type: "toggle", id: "fast_mode", label: "Old fast", value: true }],
    }),
    [],
  );
});

test("legacy feature snapshots remain compatible input without key conversion", () => {
  const features = [{ type: "toggle" as const, id: "fast_mode", label: "Fast", value: false }];
  assert.equal(optionFeatures({ features }), features);
  assert.doesNotThrow(() => assertSupportedOptions({ features }, { fast_mode: true }));
  assert.throws(() => assertSupportedOptions({ controls }, { fast_mode: true }), {
    message: 'Unknown option "fast_mode".\nAvailable: enabled, service_tier',
  });
});

test("supported-key validation preserves null and leaves value validation to the provider", () => {
  assert.doesNotThrow(() => assertSupportedOptions({ controls }, { enabled: null }));
  assert.doesNotThrow(() => assertSupportedOptions({ controls }, { service_tier: "future-value" }));
  assert.throws(() => assertSupportedOptions({ controls: [] }, { unknown: true }), {
    message: 'Unknown option "unknown".\nAvailable: none',
  });
});
