import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentSnapshot, Item, ItemKind, ItemSort, ProjectSummary } from "../shared/contracts.ts";
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
  pinned: number;
  created_at: string;
  updated_at: string;
}

export interface ListFilter {
  kind?: ItemKind;
  projectKey?: string;
  query?: string;
  /** Undefined: any; null: global Inbox only; string: that workspace only. */
  workspaceId?: string | null;
  /** Items of these workspaces are left out, e.g. archived workspaces. */
  hiddenWorkspaceIds?: readonly string[];
  sort?: ItemSort;
}

export interface NoteInput {
  kind: "note" | "scratch";
  title?: string | null;
  body: string;
  project?: ProjectRef | null;
  workspaceId?: string | null;
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

function hiddenClause(hidden: readonly string[] | undefined): { sql: string; params: string[] } {
  if (!hidden?.length) return { sql: "", params: [] };
  return {
    sql: `(workspace_id IS NULL OR workspace_id NOT IN (${hidden.map(() => "?").join(", ")}))`,
    params: [...hidden],
  };
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
    if (filter.workspaceId === null) {
      where.push("workspace_id IS NULL");
    } else if (filter.workspaceId !== undefined) {
      where.push("workspace_id = ?");
      params.push(filter.workspaceId);
    }
    const hidden = hiddenClause(filter.hiddenWorkspaceIds);
    if (hidden.sql) {
      where.push(hidden.sql);
      params.push(...hidden.params);
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

  projects(hiddenWorkspaceIds?: readonly string[]): ProjectSummary[] {
    const hidden = hiddenClause(hiddenWorkspaceIds);
    const rows = this.db
      .prepare(
        `SELECT project_key AS key, MAX(project_label) AS label, COUNT(*) AS count
         FROM items WHERE project_key IS NOT NULL ${hidden.sql ? `AND ${hidden.sql}` : ""}
         GROUP BY project_key ORDER BY MAX(updated_at) DESC`,
      )
      .all(...hidden.params) as Array<{ key: string; label: string | null; count: number }>;
    return rows.map((row) => ({ key: row.key, label: row.label ?? row.key, count: Number(row.count) }));
  }

  /** Item counts per owning workspace, most recently updated first. */
  workspaces(hiddenWorkspaceIds?: readonly string[], kind?: ItemKind): Array<{ id: string; count: number }> {
    const hidden = hiddenClause(hiddenWorkspaceIds);
    const rows = this.db
      .prepare(
        `SELECT workspace_id AS id, COUNT(*) AS count
         FROM items WHERE workspace_id IS NOT NULL ${hidden.sql ? `AND ${hidden.sql}` : ""}
         ${kind ? "AND kind = ?" : ""}
         GROUP BY workspace_id ORDER BY MAX(updated_at) DESC`,
      )
      .all(...hidden.params, ...(kind ? [kind] : [])) as Array<{ id: string; count: number }>;
    return rows.map((row) => ({ id: row.id, count: Number(row.count) }));
  }

  workspaceIds(): string[] {
    const rows = this.db
      .prepare("SELECT DISTINCT workspace_id AS id FROM items WHERE workspace_id IS NOT NULL")
      .all() as Array<{ id: string }>;
    return rows.map((row) => row.id);
  }

  createNote(input: NoteInput): Item {
    if (isEmptyNote(input.title, input.body)) throw new Error("Empty notes are not saved");
    const id = randomUUID();
    const now = this.now();
    this.db
      .prepare(
        `INSERT INTO items (id, kind, title, body, project_key, project_label, workspace_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.kind,
        input.title ?? null,
        input.body,
        input.project?.key ?? null,
        input.project?.label ?? null,
        input.workspaceId ?? null,
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

  /**
   * Stars an agent once. A repeat star keeps the existing item, moving it into
   * `workspaceId` when one is given and differs.
   */
  starAgent(
    agentId: string,
    snapshot: AgentSnapshot,
    project: ProjectRef | null,
    workspaceId?: string,
  ): { item: Item; created: boolean } {
    const existing = this.findByAgent(agentId);
    if (existing) {
      if (workspaceId === undefined || existing.workspaceId === workspaceId) {
        return { item: existing, created: false };
      }
      this.db
        .prepare("UPDATE items SET workspace_id = ?, updated_at = ? WHERE id = ?")
        .run(workspaceId, this.now(), existing.id);
      return { item: this.require(existing.id), created: false };
    }
    const id = randomUUID();
    const now = this.now();
    this.db
      .prepare(
        `INSERT INTO items (id, kind, title, body, project_key, project_label, agent_id, agent_snapshot, workspace_id, created_at, updated_at)
         VALUES (?, 'agent', ?, '', ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        snapshot.title,
        project?.key ?? null,
        project?.label ?? null,
        agentId,
        JSON.stringify(snapshot),
        workspaceId ?? null,
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
