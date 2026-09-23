# paseo-plugins

[![CI](https://github.com/koinzhang/paseo-plugins/actions/workflows/ci.yml/badge.svg)](https://github.com/koinzhang/paseo-plugins/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

English | [简体中文](./README.zh-CN.md)

A monorepo for Paseo plugins. Each plugin lives in its own directory with its own `paseo-plugin.json` and follows the repo's spec-driven workflow.

## Plugins

| Plugin | ID | Description |
|---|---|---|
| [Activity](./activity/) | `activity` | Local usage analytics **and** workspace agent ops (Explorer fleet list, live attention, terminals) |

## Activity

Three scopes — not stats-only:

| Scope | Role |
|---|---|
| **Global** (sidebar) | Habits across workspaces: heatmap, providers, insights, most-used skills / MCP / models |
| **Workspace** (Explorer Activity) | Vertical agent ops for the current workspace: list / search / sort / filter / archive, live attention, open Terminals + KPIs; refresh hint on agent idle |
| **Agent** (panel + pill) | Current session tool detail and skill / MCP summary; refreshes on timeline turn end |

Counted dimensions (local SQLite): tools (skill / MCP / shell / file), agent creations, user messages, models (messages-weighted). Details: [activity/README.md](./activity/README.md) · [architecture](./activity/docs/architecture.md).

Data lives in `~/.paseo/plugin-data/activity/` (`usage.db`). Timeline / `agents.list` are ingestion and live-status sources; queries read the local database.

## Install

Requires Paseo >= 0.8.0. Activity **0.4.0** is the last release that supports Paseo 0.8.0; later versions will require Paseo >= 0.9.0.

```bash
paseo plugin add koinzhang/paseo-plugins --path activity
paseo plugin ls                # confirm running
```

From npm (Paseo 0.9+): `paseo plugin install npm:@koinzhang/paseo-plugin-activity`. On Paseo 0.8, pin `@0.4.0`.

For a local checkout (development), install the directory instead. It uses the same plugin ID, `activity`, so don't pass `--id`:

```bash
cd activity
paseo plugin install "$PWD"    # absolute path; remove an npm install of activity first
paseo plugin reload activity   # reload after source changes
paseo plugin logs activity     # view child process logs
```

## Development

```bash
cd activity
npm install
npm run typecheck
npm test
```

This repo is spec-driven: read [activity/specs/README.md](./activity/specs/README.md) before coding, then the matching numbered directory. New features get a new numbered directory (`specs/00N-...`); update the spec first when implementation diverges.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full contribution workflow (including [npm publishing](./CONTRIBUTING.md#publishing-to-npm)), and [SECURITY.md](./SECURITY.md) for private vulnerability reporting.

## Layout

```
activity/
  index.client.tsx        # client: surfaces / sidebar / Explorer + agent panels / pills / Command Center
  index.server.ts         # server: RPC, lifecycle hooks, background backfill
  client/                 # global surface, agent panel, pill, workspace/ (Explorer)
  server/                 # ingest, SQLite store, classification, background sync
  shared/                 # RPC contracts (zod), aggregation helpers
  docs/architecture.md    # Global / Workspace / Agent scope map
  specs/                  # numbered specs (spec / plan / tasks / contracts)
```

## License

[MIT](./LICENSE) © koinzhang
