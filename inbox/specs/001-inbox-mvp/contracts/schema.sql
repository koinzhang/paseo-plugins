CREATE TABLE IF NOT EXISTS items (
  id             TEXT PRIMARY KEY,
  kind           TEXT NOT NULL CHECK (kind IN ('agent', 'note', 'scratch')),
  title          TEXT,
  body           TEXT NOT NULL DEFAULT '',
  project_key    TEXT,
  project_label  TEXT,
  agent_id       TEXT,
  agent_snapshot TEXT,             -- JSON
  pinned         INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS items_agent_id ON items(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS items_project ON items(project_key);
CREATE INDEX IF NOT EXISTS items_updated ON items(updated_at DESC);
