import assert from "node:assert/strict";
import { test } from "node:test";
import type { PluginSubscriptionHandle } from "@getpaseo/plugin/client";
import { watchInboxChanges } from "./changes.ts";

function connection(onEvent: () => void, onClosed: (error?: Error) => void, ready = Promise.resolve()) {
  let releases = 0;
  const handle: PluginSubscriptionHandle = Object.assign(() => { releases += 1; }, {
    ready,
    release: async () => { releases += 1; },
  });
  return { handle, onEvent, onClosed, releases: () => releases };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test("one live installation refreshes on establishment and events, then releases on cleanup", async (context) => {
  context.mock.timers.enable({ apis: ["setInterval"] });
  const connections: ReturnType<typeof connection>[] = [];
  let refreshes = 0;
  const stop = watchInboxChanges((onEvent, onClosed) => {
    const next = connection(onEvent, onClosed);
    connections.push(next);
    return next.handle;
  }, () => { refreshes += 1; }, 10);
  await settle();
  assert.equal(refreshes, 2);
  connections[0]!.onEvent();
  assert.equal(refreshes, 3);
  context.mock.timers.tick(100);
  assert.equal(connections.length, 1);
  stop();
  connections[0]!.onEvent();
  connections[0]!.onClosed();
  context.mock.timers.tick(100);
  assert.equal(connections[0]!.releases(), 1);
  assert.equal(refreshes, 3);
  assert.equal(connections.length, 1);
});

test("closed transport refreshes and retries, ignoring callbacks from the old handle", async (context) => {
  context.mock.timers.enable({ apis: ["setInterval"] });
  const connections: ReturnType<typeof connection>[] = [];
  const errors: unknown[] = [];
  let refreshes = 0;
  const stop = watchInboxChanges((onEvent, onClosed) => {
    const next = connection(onEvent, onClosed);
    connections.push(next);
    return next.handle;
  }, () => { refreshes += 1; }, 10, (error) => { errors.push(error); });
  await settle();
  const failure = new Error("disconnected");
  connections[0]!.onClosed(failure);
  assert.equal(refreshes, 3);
  context.mock.timers.tick(10);
  await settle();
  assert.equal(connections.length, 2);
  assert.equal(refreshes, 5);
  connections[0]!.onEvent();
  connections[0]!.onClosed(failure);
  assert.equal(refreshes, 5);
  connections[1]!.onEvent();
  assert.equal(refreshes, 6);
  assert.deepEqual(errors, [failure]);
  stop();
});

test("failed readiness releases the handle and retries with full refresh", async (context) => {
  context.mock.timers.enable({ apis: ["setInterval"] });
  const pending = deferred();
  const connections: ReturnType<typeof connection>[] = [];
  let refreshes = 0;
  const errors: unknown[] = [];
  const stop = watchInboxChanges((onEvent, onClosed) => {
    const next = connection(onEvent, onClosed, connections.length === 0 ? pending.promise : Promise.resolve());
    connections.push(next);
    return next.handle;
  }, () => { refreshes += 1; }, 10, (error) => { errors.push(error); });
  pending.reject(new Error("subscribe failed"));
  await settle();
  assert.equal(connections[0]!.releases(), 1);
  assert.equal(refreshes, 2);
  context.mock.timers.tick(10);
  await settle();
  assert.equal(refreshes, 4);
  assert.equal(connections.length, 2);
  assert.equal(errors.length, 1);
  stop();
});

test("synchronous refusal or closure refreshes without leaving an active handle", async (context) => {
  context.mock.timers.enable({ apis: ["setInterval"] });
  let attempts = 0;
  let refreshes = 0;
  let closed: ReturnType<typeof connection> | undefined;
  const stop = watchInboxChanges((onEvent, onClosed) => {
    attempts += 1;
    if (attempts === 1) throw new Error("offline");
    closed = connection(onEvent, onClosed);
    onClosed();
    return closed.handle;
  }, () => { refreshes += 1; }, 10, () => {});
  assert.equal(refreshes, 2);
  context.mock.timers.tick(10);
  assert.equal(attempts, 2);
  assert.equal(refreshes, 4);
  assert.equal(closed!.releases(), 1);
  stop();
  await settle();
});

test("cancellation before ready prevents late readiness and events from refreshing", async (context) => {
  context.mock.timers.enable({ apis: ["setInterval"] });
  const pending = deferred();
  let active: ReturnType<typeof connection> | undefined;
  let refreshes = 0;
  const stop = watchInboxChanges((onEvent, onClosed) => {
    active = connection(onEvent, onClosed, pending.promise);
    return active.handle;
  }, () => { refreshes += 1; }, 10);
  stop();
  pending.resolve();
  await settle();
  active!.onEvent();
  active!.onClosed();
  context.mock.timers.tick(50);
  assert.equal(refreshes, 1);
  assert.equal(active!.releases(), 1);
});

test("two installations own independent handles and cleanup", async (context) => {
  context.mock.timers.enable({ apis: ["setInterval"] });
  const active: ReturnType<typeof connection>[] = [];
  const subscribe = (onEvent: () => void, onClosed: (error?: Error) => void) => {
    const next = connection(onEvent, onClosed);
    active.push(next);
    return next.handle;
  };
  let firstRefreshes = 0;
  let secondRefreshes = 0;
  const firstStop = watchInboxChanges(subscribe, () => { firstRefreshes += 1; }, 10);
  const secondStop = watchInboxChanges(subscribe, () => { secondRefreshes += 1; }, 10);
  await settle();
  firstStop();
  active[0]!.onEvent();
  active[1]!.onEvent();
  assert.equal(firstRefreshes, 2);
  assert.equal(secondRefreshes, 3);
  assert.equal(active[0]!.releases(), 1);
  assert.equal(active[1]!.releases(), 0);
  secondStop();
});
