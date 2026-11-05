import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { PluginHookAgent, PluginHookContext } from "@getpaseo/plugin/server";
import type { AgentTimelineItem } from "./host-types.ts";
import { createUsageStore } from "./store.ts";
import { TURN_TAIL_LIMIT, ingestTurnAfter, refetchTimelineTail } from "./turn-ingest.ts";

const agent: PluginHookAgent = {
  id: "agent-1",
  workspaceId: "ws-1",
  parentAgentId: null,
  provider: "claude",
  cwd: "/repo",
  title: "turn ingest agent",
};

type RefetchOptions = {
  projection?: string;
  direction?: string;
  limit?: number;
};

function fakePaseo(
  entries: Array<{ item: AgentTimelineItem }>,
  options: { error?: string; model?: string | null } = {},
) {
  const requests: RefetchOptions[] = [];
  const refetch = async (input: RefetchOptions) => {
    requests.push(input);
    return { entries, error: options.error ?? null };
  };
  const snapshot = options.model ? { model: options.model } : null;
  const paseo = {
    agents: {
      ref: () => ({
        current: () => snapshot,
        refresh: async () => snapshot,
        timeline: { refetch },
      }),
    },
  } as unknown as PluginHookContext["paseo"];
  return { paseo, requests };
}

function withStore(run: (store: ReturnType<typeof createUsageStore>) => Promise<void>) {
  return async () => {
    const dir = mkdtempSync(join(tmpdir(), "activity-turn-ingest-"));
    const store = createUsageStore({ dir, driver: "jsonl" });
    try {
      await run(store);
    } finally {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  };
}

const toolCall = (callId: string, name: string, detail: AgentTimelineItem | undefined): AgentTimelineItem => ({
  type: "tool_call",
  callId,
  name,
  detail: detail as never,
  status: "completed",
  error: null,
});

test("refetchTimelineTail reads canonical recent history", async () => {
  const items: AgentTimelineItem[] = [{ type: "user_message", text: "hi" }];
  const { paseo, requests } = fakePaseo(items.map((item) => ({ item })));

  const timeline = await refetchTimelineTail(paseo, agent.id);

  assert.deepEqual(requests, [
    { projection: "canonical", direction: "tail", limit: TURN_TAIL_LIMIT },
  ]);
  assert.deepEqual(timeline, items);
});

test("refetchTimelineTail surfaces daemon errors", async () => {
  const { paseo } = fakePaseo([], { error: "timeline unavailable" });

  await assert.rejects(() => refetchTimelineTail(paseo, agent.id), /timeline unavailable/);
});

test(
  "ingestTurnAfter records tool calls from the refetched tail",
  withStore(async (store) => {
    const { paseo } = fakePaseo(
      [
        { item: { type: "user_message", messageId: "m-1", text: "hi" } },
        {
          item: {
            type: "tool_call",
            callId: "call-1",
            name: "Skill",
            detail: { type: "plain_text", label: "paseo-plugin" },
            status: "completed",
            error: null,
          },
        },
        {
          item: {
            type: "tool_call",
            callId: "call-2",
            name: "Bash",
            detail: { type: "shell", command: "git status", exitCode: 0 },
            status: "completed",
            error: null,
          },
        },
      ],
      { model: "claude-sonnet-4" },
    );

    const rows = await ingestTurnAfter(store, paseo, agent, { homeDir: "/home/tester" });

    assert.equal(rows, 2);
    const stored = store.select({ agentId: agent.id });
    assert.deepEqual(stored.map((row) => row.callId).sort(), ["call-1", "call-2"]);
    assert.equal(store.getAgent(agent.id)?.title, "turn ingest agent");
    assert.equal(store.selectUserMessages({ agentId: agent.id })[0]?.model, "claude-sonnet-4");
  }),
);

test(
  "ingestTurnAfter keeps terminal calls and their stored classification",
  withStore(async (store) => {
    const first = fakePaseo([
      {
        item: {
          type: "tool_call",
          callId: "call-1",
          name: "Skill",
          detail: { type: "plain_text", label: "paseo-plugin" },
          status: "completed",
          error: null,
        },
      },
    ]);
    await ingestTurnAfter(store, first.paseo, agent, { homeDir: "/home/tester" });
    const before = store.getRow(agent.id, "call-1");
    assert.equal(before?.category, "skill");

    // A later snapshot carries the same terminal call with a different detail.
    const second = fakePaseo([
      {
        item: {
          type: "tool_call",
          callId: "call-1",
          name: "Bash",
          detail: { type: "shell", command: "git status", exitCode: 0 },
          status: "completed",
          error: null,
        },
      },
    ]);
    const rows = await ingestTurnAfter(store, second.paseo, agent, { homeDir: "/home/tester" });

    assert.equal(rows, 0);
    assert.deepEqual(store.getRow(agent.id, "call-1"), before);
  }),
);

test(
  "ingestTurnAfter preserves the registry creation time across turns",
  withStore(async (store) => {
    const { paseo } = fakePaseo([], {});
    await ingestTurnAfter(store, paseo, agent);
    const createdAt = store.getAgent(agent.id)?.createdAt;
    assert.ok(createdAt);

    await ingestTurnAfter(store, paseo, { ...agent, title: "renamed" });

    assert.equal(store.getAgent(agent.id)?.createdAt, createdAt);
    assert.equal(store.getAgent(agent.id)?.title, "renamed");
  }),
);
