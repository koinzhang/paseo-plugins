import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { PluginHookAgent, PluginHookContext } from "@getpaseo/plugin/server";
import type { AgentTimelineItem } from "./host-types.ts";
import { createUsageStore } from "./store.ts";
import { ingestTurnAfter, refetchTurnTimeline } from "./turn-ingest.ts";

const agent: PluginHookAgent = {
  id: "agent-1",
  workspaceId: "ws-1",
  parentAgentId: null,
  provider: "claude",
  cwd: "/repo",
  title: "turn ingest agent",
  background: false,
  metadata: {},
};

const TURN_ID = "turn-1";
type ToolCallItem = Extract<AgentTimelineItem, { type: "tool_call" }>;
type TimelineEntry = { item: AgentTimelineItem; turnId?: string | null };
type RefetchOptions = {
  direction?: string;
  limit?: number;
  wholeTurns?: boolean;
};

function fakePaseo(
  entries: TimelineEntry[],
  options: {
    error?: string;
    model?: string | null;
    refreshedModel?: string;
    beforeRefresh?: () => void;
    beforeRefetch?: () => void;
  } = {},
) {
  const requests: RefetchOptions[] = [];
  const refetch = async (input: RefetchOptions) => {
    requests.push(input);
    options.beforeRefetch?.();
    return { entries, error: options.error ?? null };
  };
  let snapshot = options.model ? { model: options.model } : null;
  const paseo = {
    agents: {
      ref: () => ({
        current: () => snapshot,
        refresh: async () => {
          options.beforeRefresh?.();
          if (options.refreshedModel) snapshot = { model: options.refreshedModel };
          return snapshot;
        },
        timeline: { refetch },
      }),
    },
  } as unknown as PluginHookContext["paseo"];
  return { paseo, requests };
}

function turnEntries(items: AgentTimelineItem[], turnId: string = TURN_ID): TimelineEntry[] {
  return items.map((item) => ({ item, turnId }));
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

function toolCall(callId: string, name: string, detail: ToolCallItem["detail"]): ToolCallItem {
  return { type: "tool_call", callId, name, detail, status: "completed", error: null };
}

const prompt: AgentTimelineItem = { type: "user_message", messageId: "m-1", text: "hi" };
const skillCall = toolCall("call-1", "Skill", { type: "plain_text", label: "paseo-plugin" });
const shellCall = toolCall("call-2", "Bash", { type: "shell", command: "git status", exitCode: 0 });

test("refetchTurnTimeline requests the latest complete turn", async () => {
  const { paseo, requests } = fakePaseo(turnEntries([prompt]));

  assert.deepEqual(await refetchTurnTimeline(paseo, agent.id, TURN_ID), [prompt]);
  assert.deepEqual(requests, [{ direction: "tail", limit: 1, wholeTurns: true }]);
});

test("refetchTurnTimeline surfaces daemon errors", async () => {
  const { paseo } = fakePaseo([], { error: "timeline unavailable" });

  await assert.rejects(() => refetchTurnTimeline(paseo, agent.id, TURN_ID), /timeline unavailable/);
});

test("refetchTurnTimeline excludes earlier, later, missing and null turn ids", async () => {
  const { paseo } = fakePaseo([
    { item: prompt, turnId: "older" },
    { item: shellCall, turnId: TURN_ID },
    { item: skillCall, turnId: "newer" },
    { item: prompt },
    { item: prompt, turnId: null },
  ]);

  assert.deepEqual(await refetchTurnTimeline(paseo, agent.id, TURN_ID), [shellCall]);
});

test("refetchTurnTimeline does not associate a null hook turn id", async () => {
  const { paseo, requests } = fakePaseo(turnEntries([prompt, shellCall]));

  assert.deepEqual(await refetchTurnTimeline(paseo, agent.id, null), []);
  assert.deepEqual(requests, []);
});

test(
  "ingestTurnAfter records tool calls, model and confirmed turn id",
  withStore(async (store) => {
    const { paseo } = fakePaseo(turnEntries([prompt, skillCall, shellCall]), {
      model: "claude-sonnet-4",
    });

    const rows = await ingestTurnAfter(store, paseo, agent, TURN_ID, { homeDir: "/home/tester" });

    assert.equal(rows, 2);
    const stored = store.select({ agentId: agent.id });
    assert.deepEqual(stored.map((row) => row.callId).sort(), ["call-1", "call-2"]);
    assert.ok(stored.every((row) => row.turnId === TURN_ID));
    assert.equal(store.getAgent(agent.id)?.title, "turn ingest agent");
    const message = store.selectUserMessages({ agentId: agent.id })[0];
    assert.equal(message?.model, "claude-sonnet-4");
    assert.equal(message?.turnId, TURN_ID);
  }),
);

test(
  "ingestTurnAfter keeps terminal calls and their stored classification",
  withStore(async (store) => {
    const first = fakePaseo(turnEntries([prompt, skillCall]));
    await ingestTurnAfter(store, first.paseo, agent, TURN_ID, { homeDir: "/home/tester" });
    const before = store.getRow(agent.id, "call-1");
    assert.equal(before?.category, "skill");

    const second = fakePaseo(turnEntries([
      prompt,
      toolCall("call-1", "Bash", { type: "shell", command: "git status", exitCode: 0 }),
    ]));
    const rows = await ingestTurnAfter(store, second.paseo, agent, TURN_ID, { homeDir: "/home/tester" });

    assert.equal(rows, 0);
    assert.deepEqual(store.getRow(agent.id, "call-1"), before);
    assert.equal(store.selectUserMessages({ agentId: agent.id }).length, 1);
  }),
);

test(
  "ingestTurnAfter preserves the registry creation time across turns",
  withStore(async (store) => {
    const { paseo } = fakePaseo([]);
    await ingestTurnAfter(store, paseo, agent, TURN_ID);
    const createdAt = store.getAgent(agent.id)?.createdAt;
    assert.ok(createdAt);

    await ingestTurnAfter(store, paseo, { ...agent, title: "renamed" }, "turn-2");

    assert.equal(store.getAgent(agent.id)?.createdAt, createdAt);
    assert.equal(store.getAgent(agent.id)?.title, "renamed");
  }),
);

test(
  "ingestTurnAfter records more than 500 entries in one complete turn",
  withStore(async (store) => {
    const calls = Array.from({ length: 600 }, (_entry, index) =>
      toolCall(`long-${index}`, "Bash", { type: "shell", command: "git status", exitCode: 0 }),
    );
    const { paseo, requests } = fakePaseo(turnEntries([prompt, ...calls]));
    const rows = await ingestTurnAfter(store, paseo, agent, TURN_ID, { homeDir: "/home/tester" });

    assert.equal(rows, 600);
    assert.deepEqual(requests, [{ direction: "tail", limit: 1, wholeTurns: true }]);
    assert.ok(store.getRow(agent.id, "long-0"));
    assert.ok(store.getRow(agent.id, "long-599"));
    assert.equal(store.selectUserMessages({ agentId: agent.id }).length, 1);
  }),
);

test(
  "ingestTurnAfter preserves stored older turns and only adds the matching turn",
  withStore(async (store) => {
    const older = fakePaseo(turnEntries([prompt, skillCall], "older"));
    await ingestTurnAfter(store, older.paseo, agent, "older", { homeDir: "/home/tester" });
    const storedOlder = store.getRow(agent.id, skillCall.callId);
    const nextPrompt: AgentTimelineItem = { type: "user_message", messageId: "m-2", text: "next" };
    const newerPrompt: AgentTimelineItem = { type: "user_message", messageId: "m-3", text: "later" };
    const mixed = fakePaseo([
      ...turnEntries([prompt, skillCall], "older"),
      ...turnEntries([nextPrompt, shellCall]),
      ...turnEntries([newerPrompt, toolCall("future", "Bash", { type: "shell", command: "pwd" })], "newer"),
    ]);

    assert.equal(await ingestTurnAfter(store, mixed.paseo, agent, TURN_ID, { homeDir: "/home/tester" }), 1);
    assert.equal(await ingestTurnAfter(store, mixed.paseo, agent, TURN_ID, { homeDir: "/home/tester" }), 0);
    assert.deepEqual(store.getRow(agent.id, skillCall.callId), storedOlder);
    assert.equal(store.getRow(agent.id, shellCall.callId)?.turnId, TURN_ID);
    assert.equal(store.getRow(agent.id, "future"), null);
    const messageIds = store.selectUserMessages({ agentId: agent.id }).map((row) => row.messageId).sort();
    assert.deepEqual(messageIds, ["m-1", "m-2"]);
  }),
);

test(
  "ingestTurnAfter leaves a replaced or null turn for background backfill",
  withStore(async (store) => {
    const { paseo, requests } = fakePaseo(turnEntries([prompt, shellCall], "newer"));

    assert.equal(await ingestTurnAfter(store, paseo, agent, TURN_ID), 0);
    assert.equal(await ingestTurnAfter(store, paseo, agent, null), 0);
    assert.equal(requests.length, 1);
    assert.equal(store.count(), 0);
    assert.equal(store.selectUserMessages({ agentId: agent.id }).length, 0);
  }),
);

test(
  "ingestTurnAfter resolves and trims a model from a refreshed snapshot",
  withStore(async (store) => {
    const { paseo } = fakePaseo(turnEntries([prompt]), { refreshedModel: " claude-sonnet-4 " });

    assert.equal(await ingestTurnAfter(store, paseo, agent, TURN_ID), 0);
    assert.equal(store.selectUserMessages({ agentId: agent.id })[0]?.model, "claude-sonnet-4");
  }),
);

test(
  "ingestTurnAfter does not start after cancellation",
  withStore(async (store) => {
    const controller = new AbortController();
    controller.abort();
    const { paseo, requests } = fakePaseo(turnEntries([prompt]));

    assert.equal(await ingestTurnAfter(store, paseo, agent, TURN_ID, { signal: controller.signal }), 0);
    assert.deepEqual(requests, []);
    assert.equal(store.getAgent(agent.id), null);
    assert.equal(store.selectUserMessages({ agentId: agent.id }).length, 0);
  }),
);

test(
  "ingestTurnAfter stops before refetch when canceled during model refresh",
  withStore(async (store) => {
    const controller = new AbortController();
    const { paseo, requests } = fakePaseo(turnEntries([prompt]), {
      beforeRefresh: () => controller.abort(),
    });

    assert.equal(await ingestTurnAfter(store, paseo, agent, TURN_ID, { signal: controller.signal }), 0);
    assert.deepEqual(requests, []);
    assert.equal(store.selectUserMessages({ agentId: agent.id }).length, 0);
    assert.equal(store.count(), 0);
  }),
);

test(
  "ingestTurnAfter does not write when canceled during timeline refetch",
  withStore(async (store) => {
    const controller = new AbortController();
    const { paseo } = fakePaseo(turnEntries([prompt, shellCall]), {
      beforeRefetch: () => controller.abort(),
    });

    assert.equal(await ingestTurnAfter(store, paseo, agent, TURN_ID, { signal: controller.signal }), 0);
    assert.equal(store.selectUserMessages({ agentId: agent.id }).length, 0);
    assert.equal(store.count(), 0);
  }),
);

test("ingestTurnAfter ignores a late timeline response after SQLite closes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "activity-turn-ingest-closed-"));
  const store = createUsageStore({ dir, driver: "sqlite" });
  const controller = new AbortController();
  let closed = false;
  const { paseo } = fakePaseo(turnEntries([prompt]), {
    beforeRefetch: () => {
      controller.abort();
      store.close();
      closed = true;
    },
  });

  try {
    assert.equal(store.driver, "sqlite");
    assert.equal(await ingestTurnAfter(store, paseo, agent, TURN_ID, { signal: controller.signal }), 0);
  } finally {
    if (!closed) store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
