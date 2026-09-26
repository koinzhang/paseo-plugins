import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeKey, requireOption, resolveOption } from "./resolve-option.ts";

const efforts = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "extra-high", label: "Extra High" },
];

const ids = (result: ReturnType<typeof resolveOption>) =>
  result.kind === "match"
    ? result.option.id
    : result.kind === "ambiguous"
      ? result.candidates.map((option) => option.id)
      : null;

test("normalizeKey folds case and separators", () => {
  assert.equal(normalizeKey("  Extra_High "), "extra-high");
  assert.equal(normalizeKey("extra   high"), "extra-high");
});

test("exact match wins before anything else", () => {
  assert.equal(ids(resolveOption("high", efforts)), "high");
});

test("case-insensitive exact match on id or label", () => {
  assert.equal(ids(resolveOption("HIGH", efforts)), "high");
  assert.equal(ids(resolveOption("extra high", efforts)), "extra-high");
  assert.equal(ids(resolveOption("Extra_High", efforts)), "extra-high");
});

test("unique prefix match", () => {
  assert.equal(ids(resolveOption("med", efforts)), "medium");
  assert.equal(ids(resolveOption("ext", efforts)), "extra-high");
});

test("exact beats a longer prefix sibling", () => {
  const models = [{ id: "gpt-5.6" }, { id: "gpt-5.6-sol" }];
  assert.equal(ids(resolveOption("gpt-5.6", models, { substring: false })), "gpt-5.6");
});

test("ambiguous prefix returns every candidate", () => {
  const models = [{ id: "gpt-5.6-sol" }, { id: "gpt-5.6-mini" }, { id: "o5" }];
  assert.deepEqual(ids(resolveOption("gpt", models, { substring: false })), [
    "gpt-5.6-sol",
    "gpt-5.6-mini",
  ]);
});

test("substring match only when enabled", () => {
  const models = [{ id: "gpt-5.6-sol" }, { id: "claude-opus" }];
  assert.equal(ids(resolveOption("sol", models)), "gpt-5.6-sol");
  assert.equal(resolveOption("sol", models, { substring: false }).kind, "not-found");
});

test("ambiguous substring", () => {
  const modes = [{ id: "read-only" }, { id: "auto-readonly" }];
  assert.equal(resolveOption("only", modes).kind, "ambiguous");
});

test("aliases participate in matching", () => {
  const models = [{ id: "claude-opus-5", aliases: ["opus"] }];
  assert.equal(ids(resolveOption("opus", models, { substring: false })), "claude-opus-5");
});

test("empty and unknown input is not found", () => {
  assert.equal(resolveOption("   ", efforts).kind, "not-found");
  assert.equal(resolveOption("max", efforts).kind, "not-found");
});

test("requireOption reports unknown and ambiguous input briefly", () => {
  assert.throws(
    () => requireOption("effort", "max", efforts.slice(1)),
    { message: 'Unknown effort "max".\nAvailable: medium, high, extra-high' },
  );
  assert.throws(
    () => requireOption("model", "gpt", [{ id: "gpt-a" }, { id: "gpt-b" }], { substring: false }),
    { message: 'Ambiguous model "gpt".\nCandidates: gpt-a, gpt-b' },
  );
});

test("long option lists are truncated", () => {
  const many = Array.from({ length: 20 }, (_, index) => ({ id: `m${index}` }));
  assert.throws(() => requireOption("model", "zzz", many), /…\s\(\+8\)$/);
});
