import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Category, Confidence } from "../shared/classify.ts";
import { normalizeProvider } from "../shared/classify.ts";
import { LOG_PREFIX } from "../shared/plugin-id.ts";
import { resolveActivityDataDir } from "./migrate-data.ts";

export interface ToolCallRow {
  agentId: string;
  callId: string;
  workspaceId: string | null;
  provider: string;
  turnId: string | null;
  name: string;
  detailType: string | null;
  category: Category;
  confidence: Confidence | null;
  skillName: string | null;
  mcpServer: string | null;
  mcpTool: string | null;
  command: string | null;
  filePath: string | null;
  status: string | null;
  errorMessage: string | null;
  seq: number | null;
  ts: string | null;
  ingestedAt: string;
}

export type UserMessageRow = {
  agentId: string;
  messageId: string;
  workspaceId: string | null;
  provider: string;
  /** Agent snapshot model when the message was ingested; null if unknown. */
  model: string | null;
  turnId: string | null;
  seq: number | null;
  ts: string | null;
  ingestedAt: string;
};

export type UserMessageFilter = AgentQueryFilter & { agentId?: string };

export type UsageStoreDriver = "sqlite" | "jsonl";

export type SyncState = {
  agentId: string;
  epoch: string;
  lastSeq: number;
  updatedAt: string;
};

export type QueryFilter = {
  agentId?: string;
  workspaceId?: string;
  category?: Category;
  confidence?: Confidence | null;
  skillName?: string;
  mcpServer?: string;
  from?: string;
  to?: string;
};

/** Persisted agent registry row (005). */
export type AgentRow = {
  agentId: string;
  workspaceId: string | null;
  parentAgentId: string | null;
  provider: string;
  title: string | null;
  createdAt: string;
  archivedAt: string | null;
  updatedAt: string;
  /** Agent working directory (070); null when never observed. */
  cwd?: string | null;
  /** Project root of the agent's workspace while it was listed (070); covers worktrees. */
  projectRoot?: string | null;
};

export type AgentQueryFilter = {
  workspaceId?: string;
  /** Raw or normalized; compared after normalizeProvider at call site if needed. */
  provider?: string;
  from?: string;
  to?: string;
};

/** Controlled extra predicates for `selectRecent` (not free-form SQL). */
export type RecentRowScope = "skill-named" | "mcp-named";

export type RecentRowOptions = {
  limit: number;
  offset?: number;
  scope?: RecentRowScope;
};

/** Earliest / latest tool activity per agent (registry fallback for unknown agents). */
export type AgentActivitySpan = {
  agentId: string;
  provider: string;
  workspaceId: string | null;
  firstAt: string;
  lastAt: string;
};

export interface UsageStore {
  readonly driver: UsageStoreDriver;
  /** Increments on every write; read caches compare against it. */
  generation(): number;
  upsertMany(rows: readonly ToolCallRow[]): number;
  count(): number;
  getRow(agentId: string, callId: string): ToolCallRow | null;
  select(filter?: QueryFilter): ToolCallRow[];
  /** Newest first (effective time, then call_id), paged in the store. */
  selectRecent(filter: QueryFilter, options: RecentRowOptions): ToolCallRow[];
  countRows(filter?: QueryFilter): number;
  agentActivitySpans(): AgentActivitySpan[];
  /** call_ids already stored in a terminal status for this agent. */
  terminalCallIds(agentId: string): Set<string>;
  upsertUserMessages(rows: readonly UserMessageRow[]): number;
  selectUserMessages(filter?: UserMessageFilter): UserMessageRow[];
  upsertAgents(rows: readonly AgentRow[]): number;
  getAgent(agentId: string): AgentRow | null;
  selectAgents(filter?: AgentQueryFilter): AgentRow[];
  getSyncState(agentId: string): SyncState | null;
  setSyncState(agentId: string, epoch: string, lastSeq: number): void;
  /** Drop hash-keyed (`canonical:…`) user messages for an agent (timeline epoch replace). */
  deleteCanonicalUserMessages(agentId: string): number;
  close(): void;
}

export interface CreateUsageStoreOptions {
  dir?: string;
  fileName?: string;
  driver?: UsageStoreDriver;
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tool_calls (
  agent_id       TEXT NOT NULL,
  call_id        TEXT NOT NULL,
  workspace_id   TEXT,
  provider       TEXT NOT NULL,
  turn_id        TEXT,
  name           TEXT NOT NULL,
  detail_type    TEXT,
  category       TEXT NOT NULL,
  confidence     TEXT,
  skill_name     TEXT,
  mcp_server     TEXT,
  mcp_tool       TEXT,
  command        TEXT,
  file_path      TEXT,
  status         TEXT,
  error_message  TEXT,
  seq            INTEGER,
  ts             TEXT,
  ingested_at    TEXT NOT NULL,
  PRIMARY KEY (agent_id, call_id)
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_ts      ON tool_calls(ts, ingested_at);
CREATE INDEX IF NOT EXISTS idx_tool_calls_skill   ON tool_calls(skill_name);
CREATE INDEX IF NOT EXISTS idx_tool_calls_mcp     ON tool_calls(mcp_server, mcp_tool);
CREATE INDEX IF NOT EXISTS idx_tool_calls_agent   ON tool_calls(agent_id, workspace_id);
-- 064: workspace-scoped reads and COALESCE(ts, ingested_at) window filters / ordering
CREATE INDEX IF NOT EXISTS idx_tool_calls_workspace ON tool_calls(workspace_id, category);
CREATE INDEX IF NOT EXISTS idx_tool_calls_time      ON tool_calls(COALESCE(ts, ingested_at));

-- 006: user_messages (turns the user sent; message body is not stored)
-- Merged into store SCHEMA_SQL; file: ~/.paseo/plugin-data/activity/usage.db

CREATE TABLE IF NOT EXISTS user_messages (
  agent_id       TEXT NOT NULL,
  message_id     TEXT NOT NULL,
  workspace_id   TEXT,
  provider       TEXT NOT NULL,
  model          TEXT,              -- 015: snapshot model at ingest; nullable
  turn_id        TEXT,
  seq            INTEGER,
  ts             TEXT,              -- backfilled exact time; nullable for live rows
  ingested_at    TEXT NOT NULL,
  PRIMARY KEY (agent_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_user_messages_ts    ON user_messages(ts, ingested_at);
CREATE INDEX IF NOT EXISTS idx_user_messages_agent ON user_messages(agent_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_time  ON user_messages(COALESCE(ts, ingested_at));

CREATE TABLE IF NOT EXISTS sync_state (
  agent_id    TEXT PRIMARY KEY,
  epoch       TEXT NOT NULL,
  last_seq    INTEGER NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agents (
  agent_id         TEXT PRIMARY KEY,
  workspace_id     TEXT,
  parent_agent_id  TEXT,
  provider         TEXT NOT NULL,
  title            TEXT,
  created_at       TEXT NOT NULL,
  archived_at      TEXT,
  updated_at       TEXT NOT NULL,
  cwd              TEXT,
  project_root     TEXT
);

CREATE INDEX IF NOT EXISTS idx_agents_created  ON agents(created_at);
CREATE INDEX IF NOT EXISTS idx_agents_provider ON agents(provider);
`;

const UPSERT_SQL = `
INSERT INTO tool_calls (
  agent_id, call_id, workspace_id, provider, turn_id, name, detail_type,
  category, confidence, skill_name, mcp_server, mcp_tool, command, file_path,
  status, error_message, seq, ts, ingested_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(agent_id, call_id) DO UPDATE SET
  workspace_id  = COALESCE(excluded.workspace_id, tool_calls.workspace_id),
  turn_id       = COALESCE(excluded.turn_id, tool_calls.turn_id),
  detail_type   = COALESCE(excluded.detail_type, tool_calls.detail_type),
  category      = excluded.category,
  confidence    = CASE
                    WHEN excluded.category IS NOT tool_calls.category
                    THEN excluded.confidence
                    ELSE COALESCE(excluded.confidence, tool_calls.confidence)
                  END,
  skill_name    = CASE
                    WHEN excluded.category IS NOT tool_calls.category
                    THEN excluded.skill_name
                    ELSE COALESCE(excluded.skill_name, tool_calls.skill_name)
                  END,
  mcp_server    = CASE
                    WHEN excluded.category IS NOT tool_calls.category
                    THEN excluded.mcp_server
                    ELSE COALESCE(excluded.mcp_server, tool_calls.mcp_server)
                  END,
  mcp_tool      = CASE
                    WHEN excluded.category IS NOT tool_calls.category
                    THEN excluded.mcp_tool
                    ELSE COALESCE(excluded.mcp_tool, tool_calls.mcp_tool)
                  END,
  command       = CASE
                    WHEN excluded.category IS NOT tool_calls.category
                    THEN excluded.command
                    ELSE COALESCE(excluded.command, tool_calls.command)
                  END,
  file_path     = CASE
                    WHEN excluded.category IS NOT tool_calls.category
                    THEN excluded.file_path
                    ELSE COALESCE(excluded.file_path, tool_calls.file_path)
                  END,
  status        = CASE
                    WHEN excluded.status = 'running'
                     AND tool_calls.status IN ('completed', 'failed', 'canceled')
                    THEN tool_calls.status
                    ELSE COALESCE(excluded.status, tool_calls.status)
                  END,
  error_message = COALESCE(excluded.error_message, tool_calls.error_message),
  seq           = COALESCE(excluded.seq, tool_calls.seq),
  ts            = COALESCE(excluded.ts, tool_calls.ts)
`;

const UPSERT_MESSAGE_SQL = `
INSERT INTO user_messages (agent_id, message_id, workspace_id, provider, model, turn_id, seq, ts, ingested_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(agent_id, message_id) DO UPDATE SET
  workspace_id = COALESCE(excluded.workspace_id, user_messages.workspace_id),
  provider = excluded.provider,
  model = COALESCE(user_messages.model, excluded.model),
  turn_id = COALESCE(excluded.turn_id, user_messages.turn_id),
  seq = COALESCE(excluded.seq, user_messages.seq),
  ts = COALESCE(excluded.ts, user_messages.ts)
`;

function messageMatchesFilter(row: UserMessageRow, filter: UserMessageFilter): boolean {
  if (filter.agentId && row.agentId !== filter.agentId) return false;
  if (filter.workspaceId && row.workspaceId !== filter.workspaceId) return false;
  if (filter.provider && normalizeProvider(row.provider) !== normalizeProvider(filter.provider)) return false;
  const time = row.ts ?? row.ingestedAt;
  return (!filter.from || time >= filter.from) && (!filter.to || time <= filter.to);
}

function mergeMessage(previous: UserMessageRow, next: UserMessageRow): UserMessageRow {
  return {
    ...next,
    workspaceId: next.workspaceId ?? previous.workspaceId,
    model: previous.model ?? next.model,
    turnId: next.turnId ?? previous.turnId,
    seq: next.seq ?? previous.seq,
    ts: next.ts ?? previous.ts,
    ingestedAt: previous.ingestedAt,
  };
}

function normalizeStoredModel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

const SELECT_ROW_SQL = `
SELECT agent_id, call_id, workspace_id, provider, turn_id, name, detail_type,
       category, confidence, skill_name, mcp_server, mcp_tool, command, file_path,
       status, error_message, seq, ts, ingested_at
FROM tool_calls
WHERE agent_id = ? AND call_id = ?
`;

const TERMINAL_STATUSES = new Set(["completed", "failed", "canceled"]);

type SqliteModule = typeof import("node:sqlite");

/** Ensure upgraded DBs gain `user_messages.model` (CREATE TABLE IF NOT EXISTS will not alter). */
export function ensureUserMessageModelColumn(
  db: InstanceType<SqliteModule["DatabaseSync"]>,
): void {
  const cols = db.prepare("PRAGMA table_info(user_messages)").all() as Array<{ name?: string }>;
  if (cols.some((col) => col.name === "model")) return;
  db.exec("ALTER TABLE user_messages ADD COLUMN model TEXT");
}

/** Ensure upgraded DBs gain `agents.cwd` / `agents.project_root` (070). */
export function ensureAgentProjectColumns(
  db: InstanceType<SqliteModule["DatabaseSync"]>,
): void {
  const cols = new Set(
    (db.prepare("PRAGMA table_info(agents)").all() as Array<{ name?: string }>).map((col) => col.name),
  );
  if (!cols.has("cwd")) db.exec("ALTER TABLE agents ADD COLUMN cwd TEXT");
  if (!cols.has("project_root")) db.exec("ALTER TABLE agents ADD COLUMN project_root TEXT");
}

export function defaultDataDir(): string {
  return resolveActivityDataDir().dir;
}

export function createUsageStore(options: CreateUsageStoreOptions = {}): UsageStore {
  const dir = options.dir ?? defaultDataDir();
  mkdirSync(dir, { recursive: true });
  if (options.driver !== "jsonl") {
    const sqlite = loadSqlite();
    if (sqlite) {
      try {
        return new SqliteUsageStore(join(dir, options.fileName ?? "usage.db"), sqlite);
      } catch (error) {
        console.error(`${LOG_PREFIX} node:sqlite unavailable, falling back to JSONL`, error);
      }
    } else if (options.driver === "sqlite") {
      throw new Error("node:sqlite is not available in this runtime");
    }
  }
  return new JsonlUsageStore(join(dir, "usage.jsonl"));
}

function loadSqlite(): SqliteModule | null {
  try {
    const module = process.getBuiltinModule("node:sqlite") as unknown as
      | SqliteModule
      | undefined;
    return module && typeof module.DatabaseSync === "function" ? module : null;
  } catch {
    return null;
  }
}

function rowEffectiveTime(row: ToolCallRow): string {
  return row.ts ?? row.ingestedAt;
}

export function rowMatchesFilter(row: ToolCallRow, filter: QueryFilter = {}): boolean {
  if (filter.agentId && row.agentId !== filter.agentId) return false;
  if (filter.workspaceId && row.workspaceId !== filter.workspaceId) return false;
  if (filter.category && row.category !== filter.category) return false;
  if (filter.confidence !== undefined) {
    if (filter.confidence === null) {
      if (row.confidence !== null) return false;
    } else if (row.confidence !== filter.confidence) return false;
  }
  if (filter.skillName && row.skillName !== filter.skillName) return false;
  if (filter.mcpServer && row.mcpServer !== filter.mcpServer) return false;
  const t = rowEffectiveTime(row);
  if (filter.from && t < filter.from) return false;
  if (filter.to && t > filter.to) return false;
  return true;
}

export function agentMatchesFilter(row: AgentRow, filter: AgentQueryFilter = {}): boolean {
  if (filter.workspaceId && row.workspaceId !== filter.workspaceId) return false;
  if (filter.provider && normalizeProvider(row.provider) !== normalizeProvider(filter.provider)) {
    return false;
  }
  if (filter.from && row.createdAt < filter.from) return false;
  if (filter.to && row.createdAt > filter.to) return false;
  return true;
}

/** Keep earlier createdAt; prefer non-null metadata from next. */
export function mergeAgentRow(previous: AgentRow, next: AgentRow): AgentRow {
  return {
    agentId: previous.agentId,
    workspaceId: next.workspaceId ?? previous.workspaceId,
    parentAgentId: next.parentAgentId ?? previous.parentAgentId,
    provider: next.provider || previous.provider,
    title: next.title ?? previous.title,
    createdAt: previous.createdAt <= next.createdAt ? previous.createdAt : next.createdAt,
    archivedAt: next.archivedAt,
    updatedAt: next.updatedAt >= previous.updatedAt ? next.updatedAt : previous.updatedAt,
    cwd: next.cwd ?? previous.cwd ?? null,
    projectRoot: next.projectRoot ?? previous.projectRoot ?? null,
  };
}

function rowValues(row: ToolCallRow): Array<string | number | null> {
  return [
    row.agentId,
    row.callId,
    row.workspaceId,
    row.provider,
    row.turnId,
    row.name,
    row.detailType,
    row.category,
    row.confidence,
    row.skillName,
    row.mcpServer,
    row.mcpTool,
    row.command,
    row.filePath,
    row.status,
    row.errorMessage,
    row.seq,
    row.ts,
    row.ingestedAt,
  ];
}

function rowFromRecord(record: Record<string, unknown>): ToolCallRow {
  return {
    agentId: String(record.agent_id),
    callId: String(record.call_id),
    workspaceId: record.workspace_id == null ? null : String(record.workspace_id),
    provider: String(record.provider),
    turnId: record.turn_id == null ? null : String(record.turn_id),
    name: String(record.name),
    detailType: record.detail_type == null ? null : String(record.detail_type),
    category: String(record.category) as Category,
    confidence: record.confidence == null ? null : (String(record.confidence) as Confidence),
    skillName: record.skill_name == null ? null : String(record.skill_name),
    mcpServer: record.mcp_server == null ? null : String(record.mcp_server),
    mcpTool: record.mcp_tool == null ? null : String(record.mcp_tool),
    command: record.command == null ? null : String(record.command),
    filePath: record.file_path == null ? null : String(record.file_path),
    status: record.status == null ? null : String(record.status),
    errorMessage: record.error_message == null ? null : String(record.error_message),
    seq: record.seq == null ? null : Number(record.seq),
    ts: record.ts == null ? null : String(record.ts),
    ingestedAt: String(record.ingested_at),
  };
}

function rowKey(agentId: string, callId: string): string {
  return `${agentId}\u0000${callId}`;
}

const UPSERT_AGENT_SQL = `
INSERT INTO agents (
  agent_id, workspace_id, parent_agent_id, provider, title,
  created_at, archived_at, updated_at, cwd, project_root
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(agent_id) DO UPDATE SET
  workspace_id    = COALESCE(excluded.workspace_id, agents.workspace_id),
  parent_agent_id = COALESCE(excluded.parent_agent_id, agents.parent_agent_id),
  provider        = excluded.provider,
  title           = COALESCE(excluded.title, agents.title),
  created_at      = CASE
                      WHEN excluded.created_at < agents.created_at THEN excluded.created_at
                      ELSE agents.created_at
                    END,
  archived_at     = excluded.archived_at,
  updated_at      = excluded.updated_at,
  cwd             = COALESCE(excluded.cwd, agents.cwd),
  project_root    = COALESCE(excluded.project_root, agents.project_root)
`;

function agentValues(row: AgentRow): Array<string | null> {
  return [
    row.agentId,
    row.workspaceId,
    row.parentAgentId,
    row.provider,
    row.title,
    row.createdAt,
    row.archivedAt,
    row.updatedAt,
    row.cwd ?? null,
    row.projectRoot ?? null,
  ];
}

function agentFromRecord(record: Record<string, unknown>): AgentRow {
  return {
    agentId: String(record.agent_id),
    workspaceId: record.workspace_id == null ? null : String(record.workspace_id),
    parentAgentId: record.parent_agent_id == null ? null : String(record.parent_agent_id),
    provider: String(record.provider),
    title: record.title == null ? null : String(record.title),
    createdAt: String(record.created_at),
    archivedAt: record.archived_at == null ? null : String(record.archived_at),
    updatedAt: String(record.updated_at),
    cwd: record.cwd == null ? null : String(record.cwd),
    projectRoot: record.project_root == null ? null : String(record.project_root),
  };
}

function mergeRow(previous: ToolCallRow, next: ToolCallRow): ToolCallRow {
  const status =
    next.status === "running" && previous.status && TERMINAL_STATUSES.has(previous.status)
      ? previous.status
      : (next.status ?? previous.status);
  const categoryChanged = next.category !== previous.category;
  return {
    ...previous,
    ...next,
    workspaceId: next.workspaceId ?? previous.workspaceId,
    turnId: next.turnId ?? previous.turnId,
    detailType: next.detailType ?? previous.detailType,
    confidence: categoryChanged ? next.confidence : (next.confidence ?? previous.confidence),
    skillName: categoryChanged ? next.skillName : (next.skillName ?? previous.skillName),
    mcpServer: categoryChanged ? next.mcpServer : (next.mcpServer ?? previous.mcpServer),
    mcpTool: categoryChanged ? next.mcpTool : (next.mcpTool ?? previous.mcpTool),
    command: categoryChanged ? next.command : (next.command ?? previous.command),
    filePath: categoryChanged ? next.filePath : (next.filePath ?? previous.filePath),
    status,
    errorMessage: next.errorMessage ?? previous.errorMessage,
    seq: next.seq ?? previous.seq,
    ts: next.ts ?? previous.ts,
    ingestedAt: previous.ingestedAt,
  };
}

export function rowMatchesRecentScope(row: ToolCallRow, scope: RecentRowScope | undefined): boolean {
  if (scope === "skill-named") return row.confidence !== "low" && !!row.skillName?.trim();
  if (scope === "mcp-named") return !!row.mcpServer?.trim() && !!row.mcpTool?.trim();
  return true;
}

function compareRecent(a: ToolCallRow, b: ToolCallRow): number {
  const ta = rowEffectiveTime(a);
  const tb = rowEffectiveTime(b);
  if (ta !== tb) return ta < tb ? 1 : -1;
  return a.callId === b.callId ? 0 : a.callId < b.callId ? 1 : -1;
}

const RECENT_SCOPE_SQL: Record<RecentRowScope, string> = {
  "skill-named": "(confidence IS NULL OR confidence <> 'low') AND TRIM(COALESCE(skill_name, '')) <> ''",
  "mcp-named": "TRIM(COALESCE(mcp_server, '')) <> '' AND TRIM(COALESCE(mcp_tool, '')) <> ''",
};

function toolCallWhere(
  filter: QueryFilter,
  scope?: RecentRowScope,
): { where: string; params: Array<string | number | null> } {
  const clauses: string[] = [];
  const params: Array<string | number | null> = [];
  if (filter.agentId) {
    clauses.push("agent_id = ?");
    params.push(filter.agentId);
  }
  if (filter.workspaceId) {
    clauses.push("workspace_id = ?");
    params.push(filter.workspaceId);
  }
  if (filter.category) {
    clauses.push("category = ?");
    params.push(filter.category);
  }
  if (filter.skillName) {
    clauses.push("skill_name = ?");
    params.push(filter.skillName);
  }
  if (filter.mcpServer) {
    clauses.push("mcp_server = ?");
    params.push(filter.mcpServer);
  }
  if (filter.confidence !== undefined) {
    if (filter.confidence === null) clauses.push("confidence IS NULL");
    else {
      clauses.push("confidence = ?");
      params.push(filter.confidence);
    }
  }
  if (filter.from) {
    clauses.push("COALESCE(ts, ingested_at) >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    clauses.push("COALESCE(ts, ingested_at) <= ?");
    params.push(filter.to);
  }
  if (scope) clauses.push(RECENT_SCOPE_SQL[scope]);
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  return { where, params };
}

function userMessageSelectSql(filter: UserMessageFilter): { sql: string; params: Array<string | number | null> } {
  const clauses: string[] = [];
  const params: Array<string | number | null> = [];
  if (filter.agentId) {
    clauses.push("agent_id = ?");
    params.push(filter.agentId);
  }
  if (filter.workspaceId) {
    clauses.push("workspace_id = ?");
    params.push(filter.workspaceId);
  }
  if (filter.from) {
    clauses.push("COALESCE(ts, ingested_at) >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    clauses.push("COALESCE(ts, ingested_at) <= ?");
    params.push(filter.to);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  return {
    sql: `SELECT agent_id AS agentId, message_id AS messageId,
      workspace_id AS workspaceId, provider, model, turn_id AS turnId, seq, ts,
      ingested_at AS ingestedAt FROM user_messages${where}`,
    params,
  };
}

function agentSelectSql(filter: AgentQueryFilter): { sql: string; params: Array<string | number | null> } {
  const clauses: string[] = [];
  const params: Array<string | number | null> = [];
  if (filter.workspaceId) {
    clauses.push("workspace_id = ?");
    params.push(filter.workspaceId);
  }
  if (filter.from) {
    clauses.push("created_at >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    clauses.push("created_at <= ?");
    params.push(filter.to);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  return { sql: `SELECT * FROM agents${where}`, params };
}

class SqliteUsageStore implements UsageStore {
  readonly driver = "sqlite" as const;
  private readonly db: InstanceType<SqliteModule["DatabaseSync"]>;
  private readonly insert: ReturnType<InstanceType<SqliteModule["DatabaseSync"]>["prepare"]>;
  private readonly insertAgent: ReturnType<InstanceType<SqliteModule["DatabaseSync"]>["prepare"]>;
  private readonly insertMessage: ReturnType<InstanceType<SqliteModule["DatabaseSync"]>["prepare"]>;
  private writes = 0;

  constructor(filePath: string, sqlite: SqliteModule) {
    // Instances installed side by side with --id share this file: wait for locks instead of failing.
    this.db = new sqlite.DatabaseSync(filePath, { timeout: 5_000 });
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec(SCHEMA_SQL);
    ensureUserMessageModelColumn(this.db);
    ensureAgentProjectColumns(this.db);
    this.insert = this.db.prepare(UPSERT_SQL);
    this.insertAgent = this.db.prepare(UPSERT_AGENT_SQL);
    this.insertMessage = this.db.prepare(UPSERT_MESSAGE_SQL);
  }

  generation(): number {
    return this.writes;
  }

  upsertMany(rows: readonly ToolCallRow[]): number {
    if (rows.length === 0) return 0;
    this.writes += 1;
    this.db.exec("BEGIN");
    try {
      for (const row of rows) {
        this.insert.run(...rowValues(row));
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return rows.length;
  }

  count(): number {
    const record = this.db.prepare("SELECT COUNT(*) AS count FROM tool_calls").get() as
      | Record<string, unknown>
      | undefined;
    return record ? Number(record.count) : 0;
  }

  getRow(agentId: string, callId: string): ToolCallRow | null {
    const record = this.db.prepare(SELECT_ROW_SQL).get(agentId, callId) as
      | Record<string, unknown>
      | undefined;
    return record ? rowFromRecord(record) : null;
  }

  select(filter: QueryFilter = {}): ToolCallRow[] {
    const { where, params } = toolCallWhere(filter);
    const records = this.db.prepare(`SELECT * FROM tool_calls${where}`).all(...params) as Record<string, unknown>[];
    return records.map(rowFromRecord);
  }

  selectRecent(filter: QueryFilter, options: RecentRowOptions): ToolCallRow[] {
    const { where, params } = toolCallWhere(filter, options.scope);
    const records = this.db
      .prepare(
        `SELECT * FROM tool_calls${where}
         ORDER BY COALESCE(ts, ingested_at) DESC, call_id DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, options.limit, options.offset ?? 0) as Record<string, unknown>[];
    return records.map(rowFromRecord);
  }

  countRows(filter: QueryFilter = {}): number {
    const { where, params } = toolCallWhere(filter);
    const record = this.db
      .prepare(`SELECT COUNT(*) AS count FROM tool_calls${where}`)
      .get(...params) as Record<string, unknown> | undefined;
    return record ? Number(record.count) : 0;
  }

  agentActivitySpans(): AgentActivitySpan[] {
    // Bare provider / workspace_id come from the MIN() row only while MIN is the
    // sole aggregate (SQLite rule), so MAX lives in a correlated subquery.
    const records = this.db
      .prepare(
        `SELECT agent_id, provider, workspace_id,
                MIN(COALESCE(ts, ingested_at)) AS first_at,
                (SELECT MAX(COALESCE(t.ts, t.ingested_at)) FROM tool_calls t
                  WHERE t.agent_id = tool_calls.agent_id) AS last_at
         FROM tool_calls GROUP BY agent_id`,
      )
      .all() as Record<string, unknown>[];
    return records.map((record) => ({
      agentId: String(record.agent_id),
      provider: String(record.provider),
      workspaceId: record.workspace_id == null ? null : String(record.workspace_id),
      firstAt: String(record.first_at),
      lastAt: String(record.last_at),
    }));
  }

  terminalCallIds(agentId: string): Set<string> {
    const records = this.db
      .prepare(
        `SELECT call_id FROM tool_calls
         WHERE agent_id = ? AND status IN ('completed', 'failed', 'canceled')`,
      )
      .all(agentId) as Record<string, unknown>[];
    return new Set(records.map((record) => String(record.call_id)));
  }

  upsertAgents(rows: readonly AgentRow[]): number {
    if (rows.length === 0) return 0;
    this.writes += 1;
    this.db.exec("BEGIN");
    try {
      for (const row of rows) {
        this.insertAgent.run(...agentValues(row));
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return rows.length;
  }

  upsertUserMessages(rows: readonly UserMessageRow[]): number {
    if (!rows.length) return 0;
    this.writes += 1;
    this.db.exec("BEGIN");
    try {
      for (const row of rows) {
        this.insertMessage.run(
          row.agentId,
          row.messageId,
          row.workspaceId,
          row.provider,
          row.model,
          row.turnId,
          row.seq,
          row.ts,
          row.ingestedAt,
        );
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return rows.length;
  }

  selectUserMessages(filter: UserMessageFilter = {}): UserMessageRow[] {
    const { sql, params } = userMessageSelectSql(filter);
    const rows = this.db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
    const mapped = rows
      .map((row) => ({
        agentId: String(row.agentId),
        messageId: String(row.messageId),
        workspaceId: row.workspaceId == null ? null : String(row.workspaceId),
        provider: String(row.provider),
        model: normalizeStoredModel(row.model),
        turnId: row.turnId == null ? null : String(row.turnId),
        seq: row.seq == null ? null : Number(row.seq),
        ts: row.ts == null ? null : String(row.ts),
        ingestedAt: String(row.ingestedAt),
      }));
    // Provider is compared normalized, so it cannot be pushed into SQL.
    return filter.provider ? mapped.filter((row) => messageMatchesFilter(row, filter)) : mapped;
  }

  getAgent(agentId: string): AgentRow | null {
    const record = this.db
      .prepare("SELECT * FROM agents WHERE agent_id = ?")
      .get(agentId) as Record<string, unknown> | undefined;
    return record ? agentFromRecord(record) : null;
  }

  selectAgents(filter: AgentQueryFilter = {}): AgentRow[] {
    const { sql, params } = agentSelectSql(filter);
    const records = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    const rows = records.map(agentFromRecord);
    return filter.provider ? rows.filter((row) => agentMatchesFilter(row, filter)) : rows;
  }

  getSyncState(agentId: string): SyncState | null {
    const record = this.db
      .prepare("SELECT agent_id, epoch, last_seq, updated_at FROM sync_state WHERE agent_id = ?")
      .get(agentId) as Record<string, unknown> | undefined;
    if (!record) return null;
    return {
      agentId: String(record.agent_id),
      epoch: String(record.epoch),
      lastSeq: Number(record.last_seq),
      updatedAt: String(record.updated_at),
    };
  }

  setSyncState(agentId: string, epoch: string, lastSeq: number): void {
    this.writes += 1;
    this.db
      .prepare(
        `INSERT INTO sync_state (agent_id, epoch, last_seq, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(agent_id) DO UPDATE SET
           epoch = excluded.epoch,
           last_seq = excluded.last_seq,
           updated_at = excluded.updated_at`,
      )
      .run(agentId, epoch, lastSeq, new Date().toISOString());
  }

  deleteCanonicalUserMessages(agentId: string): number {
    this.writes += 1;
    const result = this.db
      .prepare(`DELETE FROM user_messages WHERE agent_id = ? AND message_id LIKE 'canonical:%'`)
      .run(agentId) as { changes?: number };
    return Number(result.changes ?? 0);
  }

  close(): void {
    this.db.close();
  }
}

class JsonlUsageStore implements UsageStore {
  readonly driver = "jsonl" as const;
  private readonly rows = new Map<string, ToolCallRow>();
  private readonly agents = new Map<string, AgentRow>();
  private readonly sync = new Map<string, SyncState>();
  private readonly filePath: string;
  private readonly agentsPath: string;
  private readonly messagesPath: string;
  private readonly messages = new Map<string, UserMessageRow>();

  constructor(filePath: string) {
    this.filePath = filePath;
    this.messagesPath = join(dirname(filePath), "user_messages.jsonl");
    if (existsSync(this.messagesPath)) {
      for (const line of readFileSync(this.messagesPath, "utf8").split("\n")) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as UserMessageRow | {
            __delete_canonical_messages?: { agentId: string };
          };
          if (parsed && "__delete_canonical_messages" in parsed && parsed.__delete_canonical_messages) {
            const agentId = parsed.__delete_canonical_messages.agentId;
            for (const [key, row] of this.messages) {
              if (row.agentId === agentId && row.messageId.startsWith("canonical:")) {
                this.messages.delete(key);
              }
            }
            continue;
          }
          const row = parsed as UserMessageRow;
          if (row.agentId && row.messageId) {
            this.messages.set(rowKey(row.agentId, row.messageId), {
              ...row,
              model: normalizeStoredModel(row.model),
            });
          }
        } catch { /* Ignore incomplete lines, as with the other JSONL stores. */ }
      }
    }
    this.agentsPath = join(dirname(filePath), "agents.jsonl");
    if (existsSync(filePath)) {
      for (const line of readFileSync(filePath, "utf8").split("\n")) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as ToolCallRow | { __sync: SyncState };
          if ("__sync" in parsed && parsed.__sync) {
            this.sync.set(parsed.__sync.agentId, parsed.__sync);
            continue;
          }
          const row = parsed as ToolCallRow;
          if (!row.agentId || !row.callId) continue;
          this.rows.set(rowKey(row.agentId, row.callId), row);
        } catch {
          continue;
        }
      }
    }
    if (existsSync(this.agentsPath)) {
      for (const line of readFileSync(this.agentsPath, "utf8").split("\n")) {
        if (!line.trim()) continue;
        try {
          const row = JSON.parse(line) as AgentRow;
          if (!row.agentId) continue;
          const previous = this.agents.get(row.agentId);
          this.agents.set(row.agentId, previous ? mergeAgentRow(previous, row) : row);
        } catch {
          continue;
        }
      }
    }
  }

  private writes = 0;

  generation(): number {
    return this.writes;
  }

  upsertMany(rows: readonly ToolCallRow[]): number {
    if (rows.length === 0) return 0;
    this.writes += 1;
    const lines: string[] = [];
    for (const row of rows) {
      const key = rowKey(row.agentId, row.callId);
      const previous = this.rows.get(key);
      const merged = previous ? mergeRow(previous, row) : row;
      this.rows.set(key, merged);
      lines.push(JSON.stringify(merged));
    }
    appendFileSync(this.filePath, `${lines.join("\n")}\n`);
    return rows.length;
  }

  count(): number {
    return this.rows.size;
  }

  getRow(agentId: string, callId: string): ToolCallRow | null {
    return this.rows.get(rowKey(agentId, callId)) ?? null;
  }

  select(filter: QueryFilter = {}): ToolCallRow[] {
    return [...this.rows.values()].filter((row) => rowMatchesFilter(row, filter));
  }

  selectRecent(filter: QueryFilter, options: RecentRowOptions): ToolCallRow[] {
    const offset = options.offset ?? 0;
    return this.select(filter)
      .filter((row) => rowMatchesRecentScope(row, options.scope))
      .sort(compareRecent)
      .slice(offset, offset + options.limit);
  }

  countRows(filter: QueryFilter = {}): number {
    return this.select(filter).length;
  }

  agentActivitySpans(): AgentActivitySpan[] {
    const spans = new Map<string, AgentActivitySpan>();
    for (const row of this.rows.values()) {
      const t = rowEffectiveTime(row);
      const span = spans.get(row.agentId);
      if (!span) {
        spans.set(row.agentId, {
          agentId: row.agentId,
          provider: row.provider,
          workspaceId: row.workspaceId,
          firstAt: t,
          lastAt: t,
        });
        continue;
      }
      if (t < span.firstAt) {
        span.firstAt = t;
        span.provider = row.provider;
        span.workspaceId = row.workspaceId;
      }
      if (t > span.lastAt) span.lastAt = t;
    }
    return [...spans.values()];
  }

  terminalCallIds(agentId: string): Set<string> {
    const ids = new Set<string>();
    for (const row of this.rows.values()) {
      if (row.agentId === agentId && row.status && TERMINAL_STATUSES.has(row.status)) {
        ids.add(row.callId);
      }
    }
    return ids;
  }

  upsertAgents(rows: readonly AgentRow[]): number {
    if (rows.length === 0) return 0;
    this.writes += 1;
    const lines: string[] = [];
    for (const row of rows) {
      const previous = this.agents.get(row.agentId);
      const merged = previous ? mergeAgentRow(previous, row) : row;
      this.agents.set(row.agentId, merged);
      lines.push(JSON.stringify(merged));
    }
    appendFileSync(this.agentsPath, `${lines.join("\n")}\n`);
    return rows.length;
  }

  upsertUserMessages(rows: readonly UserMessageRow[]): number {
    if (!rows.length) return 0;
    this.writes += 1;
    const lines: string[] = [];
    for (const row of rows) {
      const key = rowKey(row.agentId, row.messageId);
      const previous = this.messages.get(key);
      const merged = previous ? mergeMessage(previous, row) : row;
      this.messages.set(key, merged);
      lines.push(JSON.stringify(merged));
    }
    appendFileSync(this.messagesPath, `${lines.join("\n")}\n`);
    return rows.length;
  }

  selectUserMessages(filter: UserMessageFilter = {}): UserMessageRow[] {
    return [...this.messages.values()].filter(row => messageMatchesFilter(row, filter));
  }

  getAgent(agentId: string): AgentRow | null {
    return this.agents.get(agentId) ?? null;
  }

  selectAgents(filter: AgentQueryFilter = {}): AgentRow[] {
    return [...this.agents.values()].filter((row) => agentMatchesFilter(row, filter));
  }

  getSyncState(agentId: string): SyncState | null {
    return this.sync.get(agentId) ?? null;
  }

  setSyncState(agentId: string, epoch: string, lastSeq: number): void {
    const state: SyncState = {
      agentId,
      epoch,
      lastSeq,
      updatedAt: new Date().toISOString(),
    };
    this.writes += 1;
    this.sync.set(agentId, state);
    appendFileSync(this.filePath, `${JSON.stringify({ __sync: state })}\n`);
  }

  deleteCanonicalUserMessages(agentId: string): number {
    let removed = 0;
    for (const [key, row] of this.messages) {
      if (row.agentId === agentId && row.messageId.startsWith("canonical:")) {
        this.messages.delete(key);
        removed += 1;
      }
    }
    if (removed > 0) {
      this.writes += 1;
      appendFileSync(
        this.messagesPath,
        `${JSON.stringify({ __delete_canonical_messages: { agentId, removed } })}\n`,
      );
    }
    return removed;
  }

  close(): void {}
}
