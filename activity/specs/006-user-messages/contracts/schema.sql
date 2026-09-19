-- 006: user_messages（用户发送对话；不存正文）
-- 合并进 store SCHEMA_SQL；路径：~/.paseo/plugin-data/tool-usage/usage.db

CREATE TABLE IF NOT EXISTS user_messages (
  agent_id       TEXT NOT NULL,
  message_id     TEXT NOT NULL,
  workspace_id   TEXT,
  provider       TEXT NOT NULL,
  turn_id        TEXT,
  seq            INTEGER,
  ts             TEXT,              -- 回填精确时间；live 可空
  ingested_at    TEXT NOT NULL,
  PRIMARY KEY (agent_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_user_messages_ts    ON user_messages(ts, ingested_at);
CREATE INDEX IF NOT EXISTS idx_user_messages_agent ON user_messages(agent_id, workspace_id);
