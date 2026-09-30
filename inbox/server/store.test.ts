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
    assert.deepEqual(store.projects("agent"), [{ key: project.key, label: "repo", count: 1 }]);
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

test("a workspace Inbox shows its workspace tag and items tagged only with its project", () => {
  withStore((store) => {
    const other = { key: "remote:github.com/a/other", label: "other" };
    store.createNote({ kind: "note", body: "untagged" });
    store.createNote({ kind: "note", body: "project only", project });
    store.createNote({ kind: "note", body: "w1 note", project, workspace: { id: "w1", label: "main" } });
    store.createNote({ kind: "note", body: "w2 note", project, workspace: { id: "w2", label: "feat" } });
    store.createNote({ kind: "note", body: "other project", project: other });
    const bodies = (items: ReturnType<InboxStore["list"]>) => items.map((item) => item.body).sort();
    assert.equal(store.list().length, 5);
    assert.deepEqual(bodies(store.list({ workspaceId: "w1" })), ["w1 note"]);
    assert.deepEqual(bodies(store.list({ inboxOf: { workspaceId: "w1", projectKey: project.key } })), [
      "project only",
      "w1 note",
    ]);
    assert.deepEqual(bodies(store.list({ inboxOf: { workspaceId: "w1", projectKey: null } })), ["w1 note"]);
    assert.deepEqual(store.workspaces(), [
      { id: "w2", label: "feat", count: 1 },
      { id: "w1", label: "main", count: 1 },
    ]);
    assert.deepEqual(store.workspaces("agent"), []);
  });
});

test("tags can be set and cleared on notes, not agents; a workspace needs a project", () => {
  withStore((store) => {
    const note = store.createNote({ kind: "note", body: "n" });
    const tagged = store.setTags(note.id, { project, workspace: { id: "w1", label: "main" } });
    assert.equal(tagged.projectKey, project.key);
    assert.equal(tagged.workspaceLabel, "main");
    const cleared = store.setTags(note.id, { project: null, workspace: null });
    assert.equal(cleared.projectKey, null);
    assert.equal(cleared.workspaceId, null);
    assert.throws(() => store.setTags(note.id, { project: null, workspace: { id: "w1", label: "main" } }));
    const agent = store.starAgent("a1", snapshot, project).item;
    assert.throws(() => store.setTags(agent.id, { project: null, workspace: null }), /follow the agent/);
  });
});

test("labels refresh from the host; archived tags keep their last name", () => {
  withStore((store) => {
    const note = store.createNote({ kind: "note", body: "n", project, workspace: { id: "w1", label: "old" } });
    store.refreshLabels(new Map([[project.key, "a/repo"]]), new Map([["w1", "renamed"]]));
    assert.equal(store.get(note.id)?.projectLabel, "a/repo");
    assert.equal(store.get(note.id)?.workspaceLabel, "renamed");
    store.refreshLabels(new Map(), new Map());
    assert.equal(store.get(note.id)?.workspaceLabel, "renamed");
  });
});

test("a repeat star keeps the existing item and its tags", () => {
  withStore((store) => {
    const first = store.starAgent("a1", snapshot, project, { id: "w1", label: "main" });
    assert.equal(first.item.workspaceId, "w1");
    const again = store.starAgent("a1", snapshot, project, { id: "w2", label: "feat" });
    assert.equal(again.created, false);
    assert.equal(again.item.workspaceId, "w1");
  });
});

test("an old database gains the tag columns; untagged agents take their own workspace", () => {
  const dir = mkdtempSync(join(tmpdir(), "inbox-store-"));
  try {
    const sqlite = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");
    const legacy = new sqlite.DatabaseSync(join(dir, "inbox.db"));
    legacy.exec(`CREATE TABLE items (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT, body TEXT NOT NULL DEFAULT '',
      project_key TEXT, project_label TEXT, agent_id TEXT, agent_snapshot TEXT, workspace_id TEXT,
      pinned INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`);
    const insert = legacy.prepare(
      "INSERT INTO items (id, kind, body, agent_id, agent_snapshot, workspace_id, created_at, updated_at) VALUES (?, ?, 'x', ?, ?, ?, 't', 't')",
    );
    insert.run("global-agent", "agent", "a1", JSON.stringify(snapshot), null);
    insert.run("moved-agent", "agent", "a2", JSON.stringify({ ...snapshot, workspaceId: "w9" }), "w2");
    insert.run("note", "note", null, null, "w3");
    legacy.close();
    const store = new InboxStore({ dir });
    assert.equal(store.get("global-agent")?.workspaceId, "w1");
    assert.equal(store.get("moved-agent")?.workspaceId, "w2");
    assert.equal(store.get("note")?.workspaceId, "w3");
    assert.equal(store.get("note")?.workspaceLabel, null);
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a database from before workspace scoping gains the column; old items stay untagged", () => {
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
    assert.equal(store.list().length, 1);
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
