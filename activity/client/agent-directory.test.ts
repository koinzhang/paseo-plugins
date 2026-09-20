import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate } from "node:timers/promises";
import { createPaseoApi } from "@getpaseo/client";
import { watchAgentDirectory, type DirectoryAgent } from "./agent-directory.ts";
import { watchPillDirectory } from "./pill-directory.ts";

type Page = { entries: Array<{ agent: DirectoryAgent }>; pageInfo: { hasMore: boolean; nextCursor: string | null }; subscriptionId?: string };
const agent = (id: string, extra: object = {}) => ({ id, workspaceId: "w", status: "idle", archivedAt: null, ...extra }) as DirectoryAgent;
const page = (agents: DirectoryAgent[], nextCursor: string | null = null): Page => ({ entries: agents.map(agent => ({ agent })), pageInfo: { hasMore: nextCursor !== null, nextCursor } });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness(initial = page([agent("a")])) {
  type Observer = { snapshot(page: Page): void; update(message: unknown): void; error?(error: Error): void };
  const owned: Array<{ emit(update: object): void; reconnect(value: Page): void; fail(): void; released: boolean; signal?: AbortSignal }> = [];
  let reads = 0;
  let read: (options: any) => Promise<Page> = async () => initial;
  let bootstrap: Promise<Page> | undefined;
  let rejectRelease = false;
  const daemon = {
    fetchAgents: (options: unknown) => { reads++; return read(options); },
    observeAgents(options: { signal?: AbortSignal }) {
      let observer: Observer | undefined;
      const entry = {
        signal: options.signal,
        released: false,
        emit(payload: object) { observer?.update({ type: "agent_update", payload }); },
        reconnect(value: Page) { observer?.snapshot({ ...value, subscriptionId: "restored" }); },
        fail() { observer?.error?.(new Error("subscription lost")); },
      };
      owned.push(entry);
      return {
        ready: bootstrap ?? Promise.resolve({ ...initial, subscriptionId: String(owned.length) }),
        subscribe(next: Observer) { observer = next; next.snapshot(initial); return () => { observer = undefined; }; },
        async release() { entry.released = true; if (rejectRelease) throw new Error("release failed"); },
      };
    },
  };
  return {
    api: () => createPaseoApi(daemon as unknown as Parameters<typeof createPaseoApi>[0]),
    owned,
    setRead(fn: typeof read) { read = fn; },
    setBootstrap(value: Promise<Page>) { bootstrap = value; },
    setReleaseFailure() { rejectRelease = true; },
    get reads() { return reads; },
  };
}

test("real beta.2 API isolates owners; watchers share only their own API and release last", async () => {
  const h = harness();
  const host = h.api(), plugin = h.api(), surface = h.api();
  await host.agents.list({ subscribe: {} });
  let seen: ReadonlyMap<string, DirectoryAgent> | undefined;
  const stop = watchAgentDirectory(plugin.agents, (value) => { seen = value; });
  const stop2 = watchAgentDirectory(plugin.agents, () => {});
  const stopSurface = watchAgentDirectory(surface.agents, () => {});
  await setImmediate();
  assert.equal(h.owned.length, 3);
  h.owned[0]!.emit({ kind: "remove", agentId: "a" });
  assert.equal(seen?.has("a"), true);
  h.owned[1]!.emit({ kind: "upsert", agent: agent("a", { status: "running" }) });
  assert.equal(seen?.get("a")?.status, "running");
  stop();
  assert.equal(h.owned[1]!.released, false);
  stop2(); stopSurface();
  await setImmediate();
  assert.equal(h.owned[1]!.released, true);
  assert.equal(h.owned[2]!.released, true);
  assert.equal(h.owned[0]!.released, false);
  await host.dispose();
});

test("bootstrap pagination replays concurrent updates and reconnect rebuilds all pages", async () => {
  const h = harness(page([agent("a")], "next"));
  const tail = deferred<Page>();
  h.setRead(async (options) => { assert.equal(options.page.cursor, "next"); return tail.promise; });
  const api = h.api();
  let seen: ReadonlyMap<string, DirectoryAgent> | undefined;
  const stop = watchAgentDirectory(api.agents, value => { seen = value; });
  try {
    await setImmediate();
    assert.equal(Boolean(seen), false);
    h.owned[0]!.emit({ kind: "remove", agentId: "a" });
    h.owned[0]!.emit({ kind: "upsert", agent: agent("b", { status: "running" }) });
    tail.resolve(page([agent("b")]));
    await setImmediate();
    assert.equal(seen?.has("a"), false);
    assert.equal(seen?.get("b")?.status, "running");
    h.setRead(async () => page([agent("d")]));
    h.owned[0]!.reconnect(page([agent("c")], "restored-next"));
    await setImmediate();
    assert.deepEqual([...seen!.keys()], ["c", "d"]);
  } finally { stop(); }
});

test("a stale poll cannot overwrite a newer live update", async () => {
  const h = harness();
  const pending = deferred<Page>();
  h.setRead(() => pending.promise);
  let seen: ReadonlyMap<string, DirectoryAgent> | undefined;
  const stop = watchAgentDirectory(h.api().agents, value => { seen = value; }, 1);
  try {
    while (!h.reads) await setImmediate();
    h.owned[0]!.emit({ kind: "upsert", agent: agent("a", { status: "closed", archivedAt: null }) });
    pending.resolve(page([agent("a")]));
    h.setRead(async () => page([agent("a", { status: "closed", archivedAt: null })]));
    await setImmediate();
    assert.equal(seen?.get("a")?.status, "closed");
  } finally { stop(); }
});

test("unmount during bootstrap aborts demand and releases a late handle without publishing", async () => {
  const h = harness();
  const pending = deferred<Page>();
  h.setBootstrap(pending.promise);
  let calls = 0;
  const stop = watchAgentDirectory(h.api().agents, () => { calls++; });
  stop();
  assert.equal(h.owned[0]?.signal?.aborted, true);
  pending.resolve(page([agent("late")]));
  await setImmediate();
  assert.equal(h.owned[0]?.released, true);
  assert.equal(calls, 0);
});

test("subscription failure retries, and release failure is handled", async (t) => {
  const errors: unknown[] = [];
  t.mock.method(console, "error", (...args: unknown[]) => { errors.push(args); });
  const h = harness();
  const stop = watchAgentDirectory(h.api().agents, () => {}, 1);
  await setImmediate();
  h.owned[0]!.fail();
  while (h.owned.length < 2) await setImmediate();
  await setImmediate();
  assert.equal(h.owned[0]?.released, true);
  h.setReleaseFailure();
  stop();
  await setImmediate();
  assert.ok(errors.some(args => String(args).includes("release failed")));
});

test("pill directory observes archive/unarchive and does not revive unchanged idle pills", async () => {
  const h = harness();
  const seen = new Set<string>();
  let published = 0;
  const stop = watchPillDirectory(h.api().agents, value => { published++; seen.add(value.id); }, id => seen.delete(id));
  try {
    await setImmediate();
    assert.deepEqual([...seen], ["a"]);
    h.owned[0]!.emit({ kind: "upsert", agent: agent("a") });
    assert.equal(published, 1);
    h.owned[0]!.emit({ kind: "upsert", agent: agent("a", { status: "closed", archivedAt: "2026-09-20" }) });
    assert.equal(seen.size, 0);
    h.owned[0]!.emit({ kind: "upsert", agent: agent("a") });
    assert.deepEqual([...seen], ["a"]);
    assert.equal(published, 2);
  } finally { stop(); }
});

test("bootstrap subscription rejection still falls back to plain reads", async (t) => {
  t.mock.method(console, "error", () => {});
  const h = harness();
  h.setBootstrap(Promise.reject(new Error("observation unavailable")));
  let seen: ReadonlyMap<string, DirectoryAgent> | undefined;
  const stop = watchAgentDirectory(h.api().agents, value => { seen = value; });
  try {
    await setImmediate();
    assert.equal(h.reads, 1);
    assert.equal(seen?.has("a"), true);
  } finally { stop(); }
});

test("a restored snapshot supersedes an outstanding pre-reconnect poll", async () => {
  const h = harness();
  const oldRead = deferred<Page>();
  h.setRead(() => oldRead.promise);
  let seen: ReadonlyMap<string, DirectoryAgent> | undefined;
  const stop = watchAgentDirectory(h.api().agents, value => { seen = value; }, 1);
  try {
    while (!h.reads) await setImmediate();
    h.owned[0]!.reconnect(page([agent("restored")]));
    oldRead.resolve(page([agent("stale")]));
    h.setRead(async () => page([agent("restored")]));
    await setImmediate();
    assert.deepEqual([...seen!.keys()], ["restored"]);
  } finally { stop(); }
});
