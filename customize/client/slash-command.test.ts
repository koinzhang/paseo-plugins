import assert from "node:assert/strict";
import { test } from "node:test";
import type { PluginAgentCommandContext } from "@getpaseo/plugin/client";
import { openCustomizeFromAgent } from "./slash-command.ts";

function commandContext(provider: string, projectRootPath: string, rpc: (name: string, input: unknown) => Promise<unknown>) {
  const opened: string[] = [];
  const context = {
    agent: { provider },
    workspace: { projectRootPath },
    rpc: (contract: { name: string }, input: unknown) => rpc(contract.name, input),
    openSurface: (id: string) => opened.push(id),
  } as unknown as PluginAgentCommandContext;
  return { context, opened };
}

test("/customize selects the current agent provider and workspace project", async () => {
  const calls: Array<{ name: string; input: unknown }> = [];
  const { context, opened } = commandContext("codex", "/repo", async (name, input) => {
    calls.push({ name, input });
    return name.endsWith(".read")
      ? { status: "ready", revision: "one", values: { provider: "claude", projectRoot: "/old" } }
      : { status: "saved", revision: "two", values: { provider: "codex", projectRoot: "/repo" } };
  });

  await openCustomizeFromAgent(context);

  assert.deepEqual(calls, [
    { name: "settings.board-selection.read", input: {} },
    { name: "settings.board-selection.write", input: { revision: "one", values: { provider: "codex", projectRoot: "/repo" } } },
  ]);
  assert.deepEqual(opened, ["customize"]);
});

test("/customize updates each available selection and keeps the unavailable one", async () => {
  const cases = [
    { provider: "", project: "/repo", expected: { provider: "claude", projectRoot: "/repo" } },
    { provider: "codex", project: "", expected: { provider: "codex", projectRoot: "/old" } },
    { provider: "unknown", project: "/repo", expected: { provider: "claude", projectRoot: "/repo" } },
  ];
  for (const { provider, project, expected } of cases) {
    const calls: Array<{ name: string; input: unknown }> = [];
    const { context, opened } = commandContext(provider, project, async (name, input) => {
      calls.push({ name, input });
      return name.endsWith(".read")
        ? { status: "ready", revision: "one", values: { provider: "claude", projectRoot: "/old" } }
        : { status: "saved", revision: "two", values: expected };
    });
    await openCustomizeFromAgent(context);
    assert.deepEqual(calls, [
      { name: "settings.board-selection.read", input: {} },
      { name: "settings.board-selection.write", input: { revision: "one", values: expected } },
    ]);
    assert.deepEqual(opened, ["customize"]);
  }
});

test("/customize only opens the board when neither selection is available", async () => {
  const { context, opened } = commandContext("unknown", "", async () => {
    throw new Error("Settings should not be read");
  });
  await openCustomizeFromAgent(context);
  assert.deepEqual(opened, ["customize"]);
});

test("/customize retries a conflicting selection with the latest revision", async () => {
  const writes: unknown[] = [];
  let reads = 0;
  const { context, opened } = commandContext("pi", "/repo", async (name, input) => {
    if (name.endsWith(".read")) {
      reads++;
      return { status: "ready", revision: `revision-${reads}`, values: { provider: "claude", projectRoot: "/another" } };
    }
    writes.push(input);
    return writes.length === 1 ? { status: "conflict", error: "revision changed" } : { status: "saved", revision: "revision-3", values: {} };
  });

  await openCustomizeFromAgent(context);

  assert.equal(reads, 2);
  assert.deepEqual(writes, [
    { revision: "revision-1", values: { provider: "pi", projectRoot: "/repo" } },
    { revision: "revision-2", values: { provider: "pi", projectRoot: "/repo" } },
  ]);
  assert.deepEqual(opened, ["customize"]);
});

test("/customize opens the board when settings cannot be read", async () => {
  const { context, opened } = commandContext("codex", "/repo", async () => {
    throw new Error("offline");
  });
  await assert.rejects(openCustomizeFromAgent(context), /offline/);
  assert.deepEqual(opened, ["customize"]);
});
