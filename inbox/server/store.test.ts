import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { InboxStore } from "./store.ts";

function withStore(run: (store: InboxStore) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "inbox-store-"));
  let tick = 0;
  const store = new InboxStore({ dir, now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)).toISOString() });
  try {
    run(store);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const snapshot = { title: "Fix login", provider: "claude", model: null, workspaceId: "w1", cwd: "/repo" };
const project = { key: "remote:github.com/a/repo", label: "repo" };

test("starring the same agent twice keeps one item", () => {
  withStore((store) => {
    const first = store.starAgent("a1", snapshot, project);
    const second = store.starAgent("a1", { ...snapshot, title: "renamed" }, project);
    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(second.item.id, first.item.id);
    assert.equal(store.list().length, 1);
    assert.deepEqual(store.findByAgent("a1")?.agentSnapshot, snapshot);
  });
});

test("pinned items sort first, then most recently updated", () => {
  withStore((store) => {
    const a = store.createNote({ kind: "note", body: "a" });
    const b = store.createNote({ kind: "note", body: "b" });
    store.createNote({ kind: "scratch", body: "c" });
    store.update(a.id, { pinned: true });
    assert.deepEqual(
      store.list().map((item) => item.body),
      ["a", "c", "b"],
    );
    assert.equal(store.get(b.id)?.pinned, false);
  });
});

test("filters by kind, project and text; LIKE wildcards are literal", () => {
  withStore((store) => {
    store.createNote({ kind: "note", title: "Plan", body: "100% done", project });
    store.createNote({ kind: "scratch", body: "other" });
    store.starAgent("a1", snapshot, project);
    assert.equal(store.list({ kind: "scratch" }).length, 1);
    assert.equal(store.list({ projectKey: project.key }).length, 2);
    assert.equal(store.list({ query: "100%" }).length, 1);
    assert.equal(store.list({ query: "0%d" }).length, 0);
    assert.equal(store.list({ query: "login" }).length, 1);
    assert.deepEqual(store.projects(), [{ key: project.key, label: "repo", count: 2 }]);
  });
});

test("scratch promotes to note; agents and notes cannot be promoted", () => {
  withStore((store) => {
    const scratch = store.createNote({ kind: "scratch", body: "idea" });
    assert.equal(store.update(scratch.id, { kind: "note" }).kind, "note");
    assert.throws(() => store.update(scratch.id, { kind: "note" }));
    const agent = store.starAgent("a1", snapshot, null).item;
    assert.throws(() => store.updateNote(agent.id, { kind: "note", body: "x" }));
  });
});

test("an empty note is never created", () => {
  withStore((store) => {
    assert.throws(() => store.createNote({ kind: "note", title: " ", body: "\n" }), /Empty notes/);
    assert.equal(store.list().length, 0);
  });
});

test("updating a note to empty then reopening removes it", () => {
  const dir = mkdtempSync(join(tmpdir(), "inbox-store-"));
  try {
    const first = new InboxStore({ dir });
    const note = first.createNote({ kind: "note", body: "draft" });
    first.createNote({ kind: "note", body: "kept" });
    first.updateNote(note.id, { kind: "note", title: null, body: "  " });
    first.starAgent("a1", { title: null, provider: "codex", model: null, workspaceId: null, cwd: "/" }, null);
    first.close();
    const second = new InboxStore({ dir });
    assert.deepEqual(
      second.list().map((item) => item.kind === "agent" ? "agent" : item.body).sort(),
      ["agent", "kept"],
    );
    second.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("data survives reopening the database", () => {
  const dir = mkdtempSync(join(tmpdir(), "inbox-store-"));
  try {
    const first = new InboxStore({ dir });
    first.createNote({ kind: "note", body: "kept" });
    first.close();
    const second = new InboxStore({ dir });
    assert.equal(second.list()[0]?.body, "kept");
    second.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("workspace scope: global, one workspace, and hidden workspaces", () => {
  withStore((store) => {
    store.createNote({ kind: "note", body: "global", project });
    store.createNote({ kind: "note", body: "w1 note", project, workspaceId: "w1" });
    store.createNote({ kind: "note", body: "w2 note", project, workspaceId: "w2" });
    const bodies = (items: ReturnType<InboxStore["list"]>) => items.map((item) => item.body).sort();
    assert.deepEqual(bodies(store.list()), ["global", "w1 note", "w2 note"]);
    assert.deepEqual(bodies(store.list({ workspaceId: null })), ["global"]);
    assert.deepEqual(bodies(store.list({ workspaceId: "w1" })), ["w1 note"]);
    assert.deepEqual(bodies(store.list({ hiddenWorkspaceIds: ["w2"] })), ["global", "w1 note"]);
    assert.deepEqual(store.list({ workspaceId: "w2", hiddenWorkspaceIds: ["w2"] }), []);
    assert.deepEqual(store.workspaceIds().sort(), ["w1", "w2"]);
    assert.deepEqual(store.workspaces(["w2"]), [{ id: "w1", count: 1 }]);
    store.starAgent("a1", snapshot, project, "w1");
    assert.deepEqual(store.workspaces([], "agent"), [{ id: "w1", count: 1 }]);
    assert.deepEqual(store.projects(["w2"]), [{ key: project.key, label: "repo", count: 3 }]);
  });
});

test("starring into a workspace moves a global star; a global re-star keeps the workspace", () => {
  withStore((store) => {
    const global = store.starAgent("a1", snapshot, project).item;
    assert.equal(global.workspaceId, null);
    const moved = store.starAgent("a1", snapshot, project, "w1");
    assert.equal(moved.created, false);
    assert.equal(moved.item.id, global.id);
    assert.equal(moved.item.workspaceId, "w1");
    assert.equal(store.starAgent("a1", snapshot, project).item.workspaceId, "w1");
    assert.equal(store.starAgent("a2", snapshot, project, "w2").item.workspaceId, "w2");
  });
});

test("a database from before workspace scoping gains the column; old items stay global", () => {
  const dir = mkdtempSync(join(tmpdir(), "inbox-store-"));
  try {
    const sqlite = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");
    const legacy = new sqlite.DatabaseSync(join(dir, "inbox.db"));
    legacy.exec(`CREATE TABLE items (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT, body TEXT NOT NULL DEFAULT '',
      project_key TEXT, project_label TEXT, agent_id TEXT, agent_snapshot TEXT,
      pinned INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`);
    legacy
      .prepare("INSERT INTO items (id, kind, body, created_at, updated_at) VALUES ('n1', 'note', 'old', 't', 't')")
      .run();
    legacy.close();
    const store = new InboxStore({ dir });
    assert.equal(store.get("n1")?.workspaceId, null);
    assert.equal(store.list({ workspaceId: null }).length, 1);
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sorts by starred, created, updated and name; pinned stays first", () => {
  withStore((store) => {
    const beta = store.createNote({ kind: "note", title: "beta", body: "" });
    const agent = store.starAgent(
      "a1",
      { ...snapshot, title: "Gamma", createdAt: "2020-01-01T00:00:00.000Z" },
      project,
    ).item;
    const alpha = store.createNote({ kind: "note", title: "Alpha", body: "" });
    store.updateNote(beta.id, { kind: "note", title: "beta", body: "edited" });
    const order = (sort: "starred" | "created" | "updated" | "name") =>
      store.list({ sort }).map((item) => item.id);
    assert.deepEqual(order("updated"), [beta.id, alpha.id, agent.id]);
    assert.deepEqual(order("starred"), [alpha.id, agent.id, beta.id]);
    assert.deepEqual(order("created"), [alpha.id, beta.id, agent.id]);
    assert.deepEqual(order("name"), [alpha.id, beta.id, agent.id]);
    store.update(agent.id, { pinned: true });
    assert.equal(order("name")[0], agent.id);
  });
});
