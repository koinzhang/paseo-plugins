import assert from "node:assert/strict";
import { test } from "node:test";
import { itemsChanged, type InboxChange } from "../shared/changes.ts";
import { InboxChanges } from "./changes.ts";

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

test("the SDK subscription contract rejects extra fields before they can cross the wire", () => {
  assert.equal(itemsChanged.name, "items.changes");
  assert.deepEqual(itemsChanged.event.parse({ type: "invalidate" }), { type: "invalidate" });
  assert.equal(itemsChanged.event.safeParse({ type: "invalidate", body: "private note" }).success, false);
  assert.equal(itemsChanged.event.safeParse({ type: "update" }).success, false);
});

test("each client gets an initial invalidate and independent live invalidations", async () => {
  const changes = new InboxChanges();
  const first = new AbortController();
  const second = new AbortController();
  const firstEvents: InboxChange[] = [];
  const secondEvents: InboxChange[] = [];
  const firstDone = changes.subscribe({ signal: first.signal, push: async (event) => { firstEvents.push(event); } });
  const secondDone = changes.subscribe({ signal: second.signal, push: async (event) => { secondEvents.push(event); } });
  await settle();
  changes.invalidate();
  await settle();
  assert.deepEqual(firstEvents, [{ type: "invalidate" }, { type: "invalidate" }]);
  assert.deepEqual(secondEvents, firstEvents);
  first.abort();
  await firstDone;
  changes.invalidate();
  await settle();
  assert.equal(firstEvents.length, 2);
  assert.equal(secondEvents.length, 3);
  second.abort();
  await secondDone;
});

test("one slow push coalesces pending writes without blocking the other client", async () => {
  const changes = new InboxChanges();
  const blocked = deferred();
  let slowPushes = 0;
  let fastPushes = 0;
  const slowDone = changes.subscribe({
    signal: new AbortController().signal,
    push: async () => { slowPushes += 1; await blocked.promise; },
  });
  const fastDone = changes.subscribe({
    signal: new AbortController().signal,
    push: async () => { fastPushes += 1; },
  });
  await settle();
  for (let index = 0; index < 100; index += 1) changes.invalidate();
  await settle();
  assert.equal(slowPushes, 1);
  assert.equal(fastPushes, 3);
  blocked.resolve();
  await settle();
  assert.equal(slowPushes, 2);
  changes.close();
  await Promise.all([slowDone, fastDone]);
});

test("abort discards pending invalidations even while push is blocked", async () => {
  const changes = new InboxChanges();
  const controller = new AbortController();
  const blocked = deferred();
  let pushes = 0;
  const done = changes.subscribe({
    signal: controller.signal,
    push: async () => { pushes += 1; await blocked.promise; },
  });
  changes.invalidate();
  controller.abort();
  await done;
  changes.invalidate();
  blocked.resolve();
  await settle();
  assert.equal(pushes, 1);
});

test("a failed push closes only that subscriber and is not retried", async () => {
  const changes = new InboxChanges();
  const failure = new Error("transport closed");
  let failedPushes = 0;
  let livePushes = 0;
  const failed = changes.subscribe({
    signal: new AbortController().signal,
    push: async () => { failedPushes += 1; throw failure; },
  });
  const live = changes.subscribe({ signal: new AbortController().signal, push: async () => { livePushes += 1; } });
  await assert.rejects(failed, failure);
  changes.invalidate();
  await settle();
  assert.equal(failedPushes, 1);
  assert.equal(livePushes, 2);
  changes.close();
  await live;
});

test("reconnecting starts with invalidate instead of replaying missed writes", async () => {
  const changes = new InboxChanges();
  const first = new AbortController();
  let firstPushes = 0;
  const firstDone = changes.subscribe({ signal: first.signal, push: async () => { firstPushes += 1; } });
  first.abort();
  await firstDone;
  for (let index = 0; index < 20; index += 1) changes.invalidate();
  let secondPushes = 0;
  const secondDone = changes.subscribe({ signal: new AbortController().signal, push: async () => { secondPushes += 1; } });
  await settle();
  assert.equal(firstPushes, 1);
  assert.equal(secondPushes, 1);
  changes.close();
  await secondDone;
});

test("cleanup and already aborted signals cannot retain or create subscribers", async () => {
  const changes = new InboxChanges();
  const controller = new AbortController();
  controller.abort();
  let pushes = 0;
  await changes.subscribe({ signal: controller.signal, push: async () => { pushes += 1; } });
  const done = changes.subscribe({ signal: new AbortController().signal, push: async () => { pushes += 1; } });
  changes.close();
  changes.close();
  await done;
  changes.invalidate();
  await changes.subscribe({ signal: new AbortController().signal, push: async () => { pushes += 1; } });
  assert.equal(pushes, 1);
});
