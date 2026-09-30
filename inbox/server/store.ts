import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentSnapshot, Item, ItemKind, ItemSort } from "../shared/contracts.ts";
import { itemTitle } from "../shared/item-title.ts";
import { PLUGIN_ID } from "../shared/plugin-id.ts";
import { isEmptyNote } from "../shared/note.ts";
import type { ProjectRef } from "../shared/project-key.ts";

type SqliteModule = typeof import("node:sqlite");
type Database = InstanceType<SqliteModule["DatabaseSync"]>;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS items (
  id             TEXT PRIMARY KEY,
  kind           TEXT NOT NULL CHECK (kind IN ('agent', 'note', 'scratch')),
  title          TEXT,
  body           TEXT NOT NULL DEFAULT '',
  project_key    TEXT,
  project_label  TEXT,
  agent_id       TEXT,
  agent_snapshot TEXT,
  workspace_id   TEXT,
  workspace_label TEXT,
  pinned         INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS items_agent_id ON items(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS items_project ON items(project_key);
CREATE INDEX IF NOT EXISTS items_updated ON items(updated_at DESC);
`;

/** Runs after columns added since 001 exist. */
const WORKSPACE_INDEX = "CREATE INDEX IF NOT EXISTS items_workspace ON items(workspace_id);";

interface Row {
  id: string;
  kind: ItemKind;
  title: string | null;
  body: string;
  project_key: string | null;
  project_label: string | null;
  agent_id: string | null;
  agent_snapshot: string | null;
  workspace_id: string | null;
  workspace_label: string | null;
  pinned: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceRef {
  id: string;
  label: string;
}

export interface ListFilter {
  kind?: ItemKind;
  projectKey?: string;
  query?: string;
  /** Items tagged with exactly this workspace. */
  workspaceId?: string;
  /** A workspace's Inbox: its workspace tag, or no workspace tag and its project tag. */
  inboxOf?: { workspaceId: string; projectKey: string | null };
  sort?: ItemSort;
}

export interface NoteInput {
  kind: "note" | "scratch";
  title?: string | null;
  body: string;
  project?: ProjectRef | null;
  workspace?: WorkspaceRef | null;
}

export interface Tags {
  project: ProjectRef | null;
  workspace: WorkspaceRef | null;
}

export function defaultDataDir(): string {
  return join(homedir(), ".paseo", "plugin-data", PLUGIN_ID);
}

function loadSqlite(): SqliteModule {
  const module = process.getBuiltinModule("node:sqlite") as unknown as SqliteModule | undefined;
  if (!module || typeof module.DatabaseSync !== "function") {
    throw new Error("node:sqlite is not available in this runtime");
  }
  return module;
}

function toItem(row: Row): Item {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    projectKey: row.project_key,
    projectLabel: row.project_label,
    agentId: row.agent_id,
    agentSnapshot: row.agent_snapshot ? (JSON.parse(row.agent_snapshot) as AgentSnapshot) : null,
    workspaceId: row.workspace_id,
    workspaceLabel: row.workspace_label,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

const SORT_KEY: Record<Exclude<ItemSort, "name">, (item: Item) => string> = {
  starred: (item) => item.createdAt,
  created: (item) => item.agentSnapshot?.createdAt ?? item.createdAt,
  updated: (item) => item.updatedAt,
};

/** Pinned first, then newest first (or A→Z for `name`); stable, so ties keep SQL order. */
function sortItems(items: Item[], sort: ItemSort): Item[] {
  if (sort === "updated") return items;
  const titles = new Map(items.map((item) => [item.id, itemTitle(item)]));
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sort === "name") {
      return titles.get(a.id)!.localeCompare(titles.get(b.id)!, undefined, { sensitivity: "base", numeric: true });
    }
    const key = SORT_KEY[sort];
    return key(b).localeCompare(key(a));
  });
}

export class InboxStore {
  private readonly db: Database;
  private readonly now: () => string;

  constructor(options: { dir?: string; now?: () => string } = {}) {
    const dir = options.dir ?? defaultDataDir();
    mkdirSync(dir, { recursive: true });
    const sqlite = loadSqlite();
    this.db = new sqlite.DatabaseSync(join(dir, "inbox.db"));
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec(SCHEMA);
    this.migrate();
    this.db.exec(WORKSPACE_INDEX);
    this.now = options.now ?? (() => new Date().toISOString());
    this.deleteEmptyNotes();
  }

  private migrate(): void {
    const columns = this.db.prepare("PRAGMA table_info(items)").all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === "workspace_id")) {
      this.db.exec("ALTER TABLE items ADD COLUMN workspace_id TEXT");
    }
    if (!columns.some((column) => column.name === "workspace_label")) {
      this.db.exec("ALTER TABLE items ADD COLUMN workspace_label TEXT");
    }
    // Agents starred into the old global Inbox are tagged with their own workspace.
    this.db.exec(
      `UPDATE items SET workspace_id = json_extract(agent_snapshot, '$.workspaceId')
       WHERE kind = 'agent' AND workspace_id IS NULL AND agent_snapshot IS NOT NULL`,
    );
  }

  /** Drops notes / scratch with no title or text, e.g. left behind by an interrupted editor. */
  deleteEmptyNotes(): number {
    const result = this.db
      .prepare(
        `DELETE FROM items WHERE kind IN ('note', 'scratch')
         AND trim(coalesce(title, '')) = '' AND trim(body) = ''`,
      )
      .run();
    return Number(result.changes);
  }

  close(): void {
    this.db.close();
  }

  get(id: string): Item | null {
    const row = this.db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Row | undefined;
    return row ? toItem(row) : null;
  }

  findByAgent(agentId: string): Item | null {
    const row = this.db.prepare("SELECT * FROM items WHERE agent_id = ?").get(agentId) as
      | Row
      | undefined;
    return row ? toItem(row) : null;
  }

  list(filter: ListFilter = {}): Item[] {
    const where: string[] = [];
    const params: string[] = [];
    if (filter.kind) {
      where.push("kind = ?");
      params.push(filter.kind);
    }
    if (filter.projectKey) {
      where.push("project_key = ?");
      params.push(filter.projectKey);
    }
    if (filter.workspaceId) {
      where.push("workspace_id = ?");
      params.push(filter.workspaceId);
    }
    if (filter.inboxOf) {
      const { workspaceId, projectKey } = filter.inboxOf;
      if (projectKey) {
        where.push("(workspace_id = ? OR (workspace_id IS NULL AND project_key = ?))");
        params.push(workspaceId, projectKey);
      } else {
        where.push("workspace_id = ?");
        params.push(workspaceId);
      }
    }
    const query = filter.query?.trim();
    if (query) {
      const pattern = `%${escapeLike(query)}%`;
      where.push(
        "(title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\' OR json_extract(agent_snapshot, '$.title') LIKE ? ESCAPE '\\')",
      );
      params.push(pattern, pattern, pattern);
    }
    const sql = `SELECT * FROM items ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY pinned DESC, updated_at DESC, id`;
    const items = (this.db.prepare(sql).all(...params) as unknown as Row[]).map(toItem);
    return sortItems(items, filter.sort ?? "updated");
  }

  projects(kind?: ItemKind): Array<{ key: string; label: string; count: number }> {
    const rows = this.db
      .prepare(
        `SELECT project_key AS key, MAX(project_label) AS label, COUNT(*) AS count
         FROM items WHERE project_key IS NOT NULL ${kind ? "AND kind = ?" : ""}
         GROUP BY project_key ORDER BY MAX(updated_at) DESC`,
      )
      .all(...(kind ? [kind] : [])) as Array<{ key: string; label: string | null; count: number }>;
    return rows.map((row) => ({ key: row.key, label: row.label ?? row.key, count: Number(row.count) }));
  }

  /** Item counts per workspace tag, most recently updated first. */
  workspaces(kind?: ItemKind): Array<{ id: string; label: string; count: number }> {
    const rows = this.db
      .prepare(
        `SELECT workspace_id AS id, MAX(workspace_label) AS label, COUNT(*) AS count
         FROM items WHERE workspace_id IS NOT NULL ${kind ? "AND kind = ?" : ""}
         GROUP BY workspace_id ORDER BY MAX(updated_at) DESC`,
      )
      .all(...(kind ? [kind] : [])) as Array<{ id: string; label: string | null; count: number }>;
    return rows.map((row) => ({ id: row.id, label: row.label ?? row.id, count: Number(row.count) }));
  }

  /** Writes current names of active projects / workspaces into the snapshots. */
  refreshLabels(projects: ReadonlyMap<string, string>, workspaces: ReadonlyMap<string, string>): void {
    const project = this.db.prepare(
      "UPDATE items SET project_label = ? WHERE project_key = ? AND project_label IS NOT ?",
    );
    for (const [key, label] of projects) project.run(label, key, label);
    const workspace = this.db.prepare(
      "UPDATE items SET workspace_label = ? WHERE workspace_id = ? AND workspace_label IS NOT ?",
    );
    for (const [id, label] of workspaces) workspace.run(label, id, label);
  }

  /** Writes current agent titles into starred agents; true when any title changed. */
  refreshAgentTitles(titles: ReadonlyMap<string, string>): boolean {
    const update = this.db.prepare(
      `UPDATE items SET title = ?, agent_snapshot = json_set(agent_snapshot, '$.title', ?)
       WHERE kind = 'agent' AND agent_id = ? AND agent_snapshot IS NOT NULL
         AND json_extract(agent_snapshot, '$.title') IS NOT ?`,
    );
    let changed = false;
    for (const [agentId, title] of titles) {
      if (Number(update.run(title, title, agentId, title).changes) > 0) changed = true;
    }
    return changed;
  }

  createNote(input: NoteInput): Item {
    if (isEmptyNote(input.title, input.body)) throw new Error("Empty notes are not saved");
    if (input.workspace && !input.project) throw new Error("A workspace tag needs its project");
    const id = randomUUID();
    const now = this.now();
    this.db
      .prepare(
        `INSERT INTO items (id, kind, title, body, project_key, project_label, workspace_id, workspace_label, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.kind,
        input.title ?? null,
        input.body,
        input.project?.key ?? null,
        input.project?.label ?? null,
        input.workspace?.id ?? null,
        input.workspace?.label ?? null,
        now,
        now,
      );
    return this.require(id);
  }

  updateNote(id: string, patch: { kind: "note" | "scratch"; title?: string | null; body: string }): Item {
    const existing = this.require(id);
    if (existing.kind === "agent") throw new Error("Starred agents have no editable note body");
    this.db
      .prepare("UPDATE items SET kind = ?, title = ?, body = ?, updated_at = ? WHERE id = ?")
      .run(patch.kind, patch.title === undefined ? existing.title : patch.title, patch.body, this.now(), id);
    return this.require(id);
  }

  setTags(id: string, tags: Tags): Item {
    const existing = this.require(id);
    if (existing.kind === "agent") throw new Error("A starred agent's tags follow the agent");
    if (tags.workspace && !tags.project) throw new Error("A workspace tag needs its project");
    this.db
      .prepare(
        `UPDATE items SET project_key = ?, project_label = ?, workspace_id = ?, workspace_label = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        tags.project?.key ?? null,
        tags.project?.label ?? null,
        tags.workspace?.id ?? null,
        tags.workspace?.label ?? null,
        this.now(),
        id,
      );
    return this.require(id);
  }

  update(id: string, patch: { pinned?: boolean; kind?: "note" }): Item {
    const existing = this.require(id);
    if (patch.kind && existing.kind !== "scratch") {
      throw new Error("Only scratch items can be promoted to notes");
    }
    this.db
      .prepare("UPDATE items SET pinned = ?, kind = ?, updated_at = ? WHERE id = ?")
      .run(
        patch.pinned === undefined ? (existing.pinned ? 1 : 0) : patch.pinned ? 1 : 0,
        patch.kind ?? existing.kind,
        this.now(),
        id,
      );
    return this.require(id);
  }

  /** Stars an agent once; a repeat star returns the existing item unchanged. */
  starAgent(
    agentId: string,
    snapshot: AgentSnapshot,
    project: ProjectRef | null,
    workspace: WorkspaceRef | null = null,
  ): { item: Item; created: boolean } {
    const existing = this.findByAgent(agentId);
    if (existing) return { item: existing, created: false };
    const id = randomUUID();
    const now = this.now();
    this.db
      .prepare(
        `INSERT INTO items (id, kind, title, body, project_key, project_label, agent_id, agent_snapshot, workspace_id, workspace_label, created_at, updated_at)
         VALUES (?, 'agent', ?, '', ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        snapshot.title,
        project?.key ?? null,
        project?.label ?? null,
        agentId,
        JSON.stringify(snapshot),
        workspace?.id ?? null,
        workspace?.label ?? null,
        now,
        now,
      );
    return { item: this.require(id), created: true };
  }

  delete(id: string): void {
    this.db.prepare("DELETE FROM items WHERE id = ?").run(id);
  }

  private require(id: string): Item {
    const item = this.get(id);
    if (!item) throw new Error(`Inbox item ${id} not found`);
    return item;
  }
}
