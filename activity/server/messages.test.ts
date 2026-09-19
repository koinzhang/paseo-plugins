import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import { ingestUserMessages, ingestTurnTimeline } from "./ingest.ts";
import { createUsageStore } from "./store.ts";
import { createActivityByDayHandler, createByProviderHandler, resyncAgents } from "./handlers.ts";
import { aggregateActivityByDay, aggregateByProvider } from "../shared/usage.ts";
import { computeStreaks } from "../shared/activity.ts";

type PaseoApi = PluginHandlerContext["paseo"];

const agent = { id: "a1", workspaceId: "w1", parentAgentId: null, provider: "codex", cwd: "/tmp", title: null };
const now = "2026-09-19T12:00:00.000Z";
const earlier = "2026-09-18T12:00:00.000Z";
const message = { type: "user_message" as const, messageId: "m1", text: "private body" };

test("message identity precedence, empty messages, assistant exclusion and anonymous fallback", () => {
  const rows = ingestUserMessages([
    { ...message, clientMessageId: "client" },
    { type: "user_message", text: "", clientMessageId: "client" },
    { type: "assistant_message", text: "reply" },
    { type: "user_message", text: "anonymous" },
  ], agent, { ingestedAt: now, model: "gpt-5.4" });
  assert.deepEqual(rows.map(row => row.messageId), ["m1", "client"]);
  assert.ok(rows.every(row => row.ts === null && row.turnId === null && row.model === "gpt-5.4" && !("text" in row)));
  const anonymous = [{ type: "user_message" as const, text: "" }];
  assert.deepEqual(ingestUserMessages(anonymous, agent, { seq: 5, ingestedAt: now }),
    ingestUserMessages(anonymous, agent, { seq: 5, ingestedAt: now }));
  assert.notEqual(ingestUserMessages(anonymous, agent, { seq: 5 })[0]?.messageId,
    ingestUserMessages(anonymous, agent, { seq: 6 })[0]?.messageId);
});

test("message model coalesce keeps first non-null on upsert", () => {
  const dir = mkdtempSync(join(tmpdir(), "activity-model-"));
  const store = createUsageStore({ dir, driver: "sqlite" });
  try {
    const first = ingestUserMessages([message], agent, { ingestedAt: now, model: "gpt-5.4" });
    store.upsertUserMessages(first);
    store.upsertUserMessages(ingestUserMessages([message], agent, { ingestedAt: now, model: null }));
    assert.equal(store.selectUserMessages()[0]?.model, "gpt-5.4");
    store.upsertUserMessages(ingestUserMessages([message], agent, { ingestedAt: now, model: "other" }));
    assert.equal(store.selectUserMessages()[0]?.model, "gpt-5.4");
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

for (const driver of ["sqlite", "jsonl"] as const) {
  test(`${driver}: live replay, canonical correction, filters, persistence and privacy`, () => {
    const dir = mkdtempSync(join(tmpdir(), "activity-messages-"));
    let store = createUsageStore({ dir, driver });
    try {
      assert.equal(store.driver, driver);
      for (let i = 0; i < 2; i++) ingestTurnTimeline(agent, [message], { store, homeDir: "", now: () => now });
      assert.equal(store.selectUserMessages().length, 1);
      const canonical = ingestUserMessages([message], agent, { seq: 2, ts: earlier, turnId: "old", ingestedAt: now });
      store.upsertUserMessages(canonical);
      store.upsertUserMessages(ingestUserMessages([message], agent, { ingestedAt: "2026-09-20T00:00:00.000Z" }));
      store.upsertUserMessages(ingestUserMessages([message], { ...agent, id: "a2", provider: "claude", workspaceId: "w2" }));
      assert.equal(store.selectUserMessages({ from: now, agentId: "a1" }).length, 0);
      assert.equal(store.selectUserMessages({ provider: "claude" }).length, 1);
      assert.equal(store.selectUserMessages({ workspaceId: "w2" }).length, 1);
      assert.equal(store.selectUserMessages({ to: earlier }).length, 1);
      store.close();
      store = createUsageStore({ dir, driver });
      assert.equal(store.selectUserMessages().length, 2);
      assert.deepEqual(store.selectUserMessages({ agentId: "a1" }), canonical);
      const disk = readFileSync(join(dir, driver === "sqlite" ? "usage.db" : "user_messages.jsonl"));
      assert.equal(disk.includes(Buffer.from("private body")), false);
    } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
  });
}

test("message-only days/providers are visible without altering tool totals; streaks count messages", () => {
  const messages = ingestUserMessages([message], agent, { ts: earlier });
  const days = aggregateActivityByDay([], { messages, provider: "codex" });
  assert.equal(days.length, 1);
  assert.equal(days[0]?.messages, 1);
  assert.equal(days[0]?.total, 1);
  assert.equal(days[0]?.agents, 0);
  const [y, m, d] = days[0]!.date.split("-").map(Number);
  assert.deepEqual(computeStreaks(days, new Date(y!, m! - 1, d!)), { current: 1, longest: 1 });
  assert.deepEqual(aggregateActivityByDay([], { messages, provider: "claude" }), []);
  const result = aggregateByProvider([], [], messages);
  assert.equal(result.providers[0]?.messageCount, 1);
  assert.equal(result.providers[0]?.agentCount, 0);
  assert.equal(result.providers[0]?.callCount, 0);
});

test("resync paginates messages idempotently; query handlers use stored messages", async () => {
  const dir = mkdtempSync(join(tmpdir(), "activity-resync-"));
  const store = createUsageStore({ dir, driver: "sqlite" });
  let calls = 0;
  const paseo = { agents: {
    list: async () => ({
      entries: [{ agent: { ...agent, createdAt: earlier } }],
      pageInfo: { hasMore: false, nextCursor: null, prevCursor: null },
    }),
    ref: () => ({ timeline: { refetch: async (input: { direction: string }) => {
      calls++;
      const tail = input.direction === "tail";
      return {
        entries: [{ item: tail ? message : { type: "user_message", text: "" },
          timestamp: earlier, turnId: "t1", seqStart: tail ? 10 : 1 }],
        hasOlder: tail, startCursor: { epoch: "e", seq: tail ? 10 : 1 }, endCursor: { epoch: "e", seq: 10 },
      };
    } } }),
  } } as unknown as PaseoApi;
  try {
    for (let i = 0; i < 2; i++) {
      const result = await resyncAgents(store, paseo);
      assert.deepEqual(result.errors, []);
      assert.equal(result.syncedAgents, 1);
    }
    assert.equal(calls, 4);
    assert.equal(store.selectUserMessages().length, 2);
    const activity = await createActivityByDayHandler(store)({ provider: "codex", to: earlier });
    assert.equal(activity.days[0]?.messages, 2);
    const providers = await createByProviderHandler(store)({ workspaceId: "w1", to: earlier });
    assert.equal(providers.providers[0]?.messageCount, 2);
    assert.equal(calls, 4, "queries must not refetch history");
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("canceling an in-flight canonical scan prevents writes after the store closes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "history-cancel-"));
  const store = createUsageStore({ dir, driver: "sqlite" });
  const controller = new AbortController();
  let release!: () => void;
  let entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const paseo = { agents: {
    list: async () => ({
      entries: [{ agent: { ...agent, createdAt: earlier } }],
      pageInfo: { hasMore: false, nextCursor: null, prevCursor: null },
    }),
    ref: () => ({ timeline: { refetch: async () => {
      entered(); await gate;
      return { entries: [{ item: message, timestamp: earlier, seqStart: 1 }], hasOlder: false,
        endCursor: { epoch: "e", seq: 1 } };
    } } }),
  } } as unknown as PaseoApi;
  try {
    const pending = resyncAgents(store, paseo, undefined, controller.signal);
    await started;
    controller.abort(); store.close(); release();
    const result = await pending;
    assert.equal(result.syncedAgents, 0);
    assert.equal(result.errors[0]?.message, "History scan canceled");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
