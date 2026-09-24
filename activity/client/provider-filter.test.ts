import assert from "node:assert/strict";
import { test } from "node:test";
import { selectProviderOptions, type ProviderFilterCandidate } from "./provider-filter.ts";

const LIMIT = 5;

function candidate(
  provider: string,
  agentCount: number,
  messageCount: number,
): ProviderFilterCandidate {
  return { provider, label: provider.toUpperCase(), agentCount, messageCount };
}

test("lists every provider by default (069)", () => {
  const providers = ["a", "b", "c", "d", "e", "f", "g"].map((id, index) =>
    candidate(id, 7 - index, 0),
  );
  assert.deepEqual(
    selectProviderOptions(providers, "all").map((item) => item.id),
    ["a", "b", "c", "d", "e", "f", "g"],
  );
});

test("ranks by agent count, then message count", () => {
  const options = selectProviderOptions(
    [candidate("claude", 3, 1), candidate("codex", 3, 5), candidate("pi", 1, 100)],
    "all",
  );
  assert.deepEqual(
    options.map((item) => item.id),
    ["codex", "claude", "pi"],
  );
});

test("breaks ties by provider id", () => {
  const options = selectProviderOptions(
    [candidate("zeta", 1, 1), candidate("alpha", 1, 1)],
    "all",
  );
  assert.deepEqual(
    options.map((item) => item.id),
    ["alpha", "zeta"],
  );
});

test("caps the list at an explicit limit", () => {
  const providers = ["a", "b", "c", "d", "e", "f", "g"].map((id, index) =>
    candidate(id, 7 - index, 0),
  );
  const options = selectProviderOptions(providers, "all", LIMIT);
  assert.equal(options.length, LIMIT);
  assert.deepEqual(
    options.map((item) => item.id),
    ["a", "b", "c", "d", "e"],
  );
});

test("keeps a selected provider that fell out of the top list", () => {
  const providers = ["a", "b", "c", "d", "e", "f"].map((id, index) =>
    candidate(id, 6 - index, 0),
  );
  const options = selectProviderOptions(providers, "f", LIMIT);
  assert.equal(options.length, LIMIT);
  assert.deepEqual(
    options.map((item) => item.id),
    ["a", "b", "c", "d", "f"],
  );
});

test("keeps order when the selected provider is already in the top list", () => {
  const providers = ["a", "b", "c", "d", "e", "f"].map((id, index) =>
    candidate(id, 6 - index, 0),
  );
  const options = selectProviderOptions(providers, "b", LIMIT);
  assert.deepEqual(
    options.map((item) => item.id),
    ["a", "b", "c", "d", "e"],
  );
});

test("returns all ranked candidates when below the limit", () => {
  const options = selectProviderOptions(
    [candidate("pi", 1, 1), candidate("claude", 2, 0)],
    "all",
  );
  assert.deepEqual(
    options.map((item) => item.id),
    ["claude", "pi"],
  );
});

test("ignores an unknown selected provider", () => {
  const options = selectProviderOptions([candidate("claude", 1, 1)], "ghost");
  assert.deepEqual(
    options.map((item) => item.id),
    ["claude"],
  );
});
