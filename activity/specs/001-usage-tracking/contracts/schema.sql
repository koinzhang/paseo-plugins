-- tool-usage data model (001)
-- 实现时由 store 启动执行；路径：~/.paseo/plugin-data/tool-usage/usage.db

CREATE TABLE IF NOT EXISTS tool_calls (
  agent_id       TEXT NOT NULL,
  call_id        TEXT NOT NULL,
  workspace_id   TEXT,
  provider       TEXT NOT NULL,
  turn_id        TEXT,
  name           TEXT NOT NULL,     -- timeline tool_call.name
  detail_type    TEXT,              -- shell/read/edit/.../unknown
  category       TEXT NOT NULL,     -- skill | mcp | regular
  confidence     TEXT,              -- exact | inferred | low | NULL
  skill_name     TEXT,
  mcp_server     TEXT,
  mcp_tool       TEXT,
  command        TEXT,              -- shell 命令原文
  file_path      TEXT,
  status         TEXT,              -- running/completed/failed/canceled
  error_message  TEXT,
  seq            INTEGER,           -- 回填时精确值
  ts             TEXT,              -- 回填时精确时间；live 为空
  ingested_at    TEXT NOT NULL,
  PRIMARY KEY (agent_id, call_id)
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_ts      ON tool_calls(ts, ingested_at);
CREATE INDEX IF NOT EXISTS idx_tool_calls_skill   ON tool_calls(skill_name);
CREATE INDEX IF NOT EXISTS idx_tool_calls_mcp     ON tool_calls(mcp_server, mcp_tool);
CREATE INDEX IF NOT EXISTS idx_tool_calls_agent   ON tool_calls(agent_id, workspace_id);

CREATE TABLE IF NOT EXISTS sync_state (
  agent_id    TEXT PRIMARY KEY,
  epoch       TEXT NOT NULL,
  last_seq    INTEGER NOT NULL,
  updated_at  TEXT NOT NULL
);

-- 005: agent registry (created agents, independent of tool_calls)
CREATE TABLE IF NOT EXISTS agents (
  agent_id         TEXT PRIMARY KEY,
  workspace_id     TEXT,
  parent_agent_id  TEXT,
  provider         TEXT NOT NULL,
  title            TEXT,
  created_at       TEXT NOT NULL,
  archived_at      TEXT,
  updated_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agents_created  ON agents(created_at);
CREATE INDEX IF NOT EXISTS idx_agents_provider ON agents(provider);
