import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate } from "node:timers/promises";
import { watchPillDirectory } from "./pill-directory.ts";

type Api = Parameters<typeof watchPillDirectory>[0];
type Update = Parameters<Parameters<Api["subscribe"]>[0]>[0];

test("pill directory pages without observation and replays concurrent removal", async () => {
  let listener!: (update: Update) => void;
  const seen = new Set<string>();
  const cursors: unknown[] = [];
  let unsubscribed = false;
  const api = {
    subscribe: (handler: typeof listener) => { listener = handler; return () => { unsubscribed = true; }; },
    list: async (options: { page: { cursor?: string }; subscribe?: unknown }) => {
      assert.equal(options.subscribe, undefined);
      cursors.push(options.page.cursor);
      if (!options.page.cursor) return {
        entries: [{ agent: { id: "first", workspaceId: "w" } }],
        pageInfo: { hasMore: true, nextCursor: "next" },
      };
      listener({ kind: "remove", agentId: "first" } as Update);
      return { entries: [{ agent: { id: "second", workspaceId: "w" } }], pageInfo: { hasMore: false, nextCursor: null } };
    },
  } as unknown as Api;
  const stop = watchPillDirectory(api, (agent) => seen.add(agent.id), (id) => seen.delete(id));
  try {
    await setImmediate();
    assert.deepEqual(cursors, [undefined, "next"]);
    assert.deepEqual([...seen], ["second"]);
  } finally { stop(); }
  assert.equal(unsubscribed, true);
});

test("unload while a directory request is pending cannot register pills", async () => {
  let finish!: (result: unknown) => void;
  let calls = 0;
  const api = {
    subscribe: () => () => {},
    list: () => new Promise((resolve) => { finish = resolve; }),
  } as unknown as Api;
  const stop = watchPillDirectory(api, () => { calls++; }, () => { calls++; });
  stop();
  finish({ entries: [{ agent: { id: "late" } }], pageInfo: { hasMore: false, nextCursor: null } });
  await setImmediate();
  assert.equal(calls, 0);
});

test("polling discovers agents without any directory push", async () => {
  let reads = 0;
  let found!: () => void;
  const discovery = new Promise<void>((resolve) => { found = resolve; });
  const api = {
    subscribe: () => () => {},
    list: async () => ({
      entries: ++reads === 1 ? [] : [{ agent: { id: "new", workspaceId: "w" } }],
      pageInfo: { hasMore: false, nextCursor: null },
    }),
  } as unknown as Api;
  const stop = watchPillDirectory(api, () => found(), () => {}, 1);
  try { await discovery; assert.equal(reads, 2); } finally { stop(); }
});
