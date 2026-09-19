# paseo-plugins

English | [简体中文](./README.zh-CN.md)

A monorepo for Paseo plugins. Each plugin lives in its own directory with its own `paseo-plugin.json` and follows the repo's spec-driven workflow.

## Plugins

| Plugin | ID | Description |
|---|---|---|
| [Activity](./activity/) | `activity` | Local analytics for tool calls (skills / MCP / shell / file reads & writes), agent creation, user messages, and model usage |

## Activity

Activity ingests every agent's Paseo timeline into a local SQLite database and answers "how am I / each provider actually using Paseo":

| Dimension | What is counted |
|---|---|
| Tools | Skill / MCP / shell / file calls; skills classified into exact / inferred / low confidence tiers |
| Agents | Every created agent (registry with archive metadata) |
| Messages | User-sent messages |
| Models | Model at send time (weighted by messages) |

Where it shows up:

- **Composer pill** — current agent's skill / MCP summary, hidden when there is no data
- **Agent workspace panel** — per-agent detail (KPI / Skills / MCP / SKILL.md reader)
- **Activity sidebar** — global view grouped by provider; heatmap, KPIs, insights, most used
- **Command Center** — open panels, export a markdown usage report

Data lives in `~/.paseo/plugin-data/activity/` (SQLite `usage.db`). The Paseo timeline / `agents.list` are ingestion and backfill sources only; queries read the local database.

## Install

Requires Paseo >= 0.8.0.

```bash
cd activity
paseo plugin install .
paseo plugin reload activity   # reload after source changes
paseo plugin logs activity     # view child process logs
paseo plugin ls                # confirm running
```

## Development

```bash
cd activity
npm install
npm run typecheck
npm test
```

This repo is spec-driven: read [activity/specs/README.md](./activity/specs/README.md) before coding, then the matching numbered directory. New features get a new numbered directory (`specs/00N-...`); update the spec first when implementation diverges.

## Layout

```
activity/
  index.client.tsx        # client entry: surfaces / sidebar / panels / pills / Command Center
  index.server.ts         # server entry: RPC handlers, event subscriptions, background backfill
  client/                 # pill, panel, global surface, queries and presentation
  server/                 # ingestion, SQLite store, classification, background sync
  shared/                 # RPC contracts (zod), classification and formatting
  specs/                  # numbered specs 001–015 (spec / plan / tasks / contracts)
```
