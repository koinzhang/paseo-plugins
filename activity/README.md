# Activity

Local usage analytics for Paseo: tool calls, agents, messages, and model usage.

Activity ingests every agent's Paseo timeline into a local SQLite database and answers "how am I / each provider actually using Paseo". Queries read the local database; the Paseo timeline and `agents.list` are ingestion and backfill sources only.

| Dimension | What is counted |
|---|---|
| Tools | Skill / MCP / shell / file calls; skills classified into exact / inferred / low confidence tiers |
| Agents | Every created agent (registry with archive metadata) |
| Messages | User-sent messages |
| Models | Model at send time (weighted by messages) |

## Where it shows up

- **Composer pill** — current agent's skill / MCP summary, hidden when there is no data
- **Agent workspace panel** — per-agent detail (KPI / Skills / MCP / SKILL.md reader)
- **Activity sidebar** — global view grouped by provider; heatmap, KPIs, insights, most used
- **Command Center** — open panels, export a markdown usage report

## Data

Everything lives on the daemon machine in `~/.paseo/plugin-data/activity/` (SQLite `usage.db`). Nothing is sent anywhere.

## Install

Requires Paseo >= 0.8.0.

From Git (Paseo 0.8 and later):

```bash
paseo plugin install https://github.com/koinzhang/paseo-plugins.git:activity
```

From npm (Paseo 0.9 and later; this is the source paseo.cafe hands to Paseo 0.9+):

```bash
paseo plugin install npm:@koinzhang/paseo-plugin-activity
```

After source changes, reload and check status:

```bash
paseo plugin reload activity
paseo plugin logs activity
paseo plugin ls
```

## Limitations

- Analytics are local to each daemon: every machine keeps its own database, and there is no cross-host aggregation.
- Numbers are reconstructed from the Paseo timeline; items that do not report a model or skill cannot be attributed for that dimension.
- Skill classification is heuristic (exact / inferred / low confidence); check the tier before trusting a count.

## Development

```bash
npm install
npm run typecheck
npm test
```

This plugin is spec-driven: read [specs/README.md](./specs/README.md) before coding, then the matching numbered directory.

## Publish

npm releases go through a GitHub Release tag `activity-vX.Y.Z` (not push-to-`main` alone). Steps: [CONTRIBUTING.md § Publishing to npm](../CONTRIBUTING.md#publishing-to-npm).

## License

[MIT](../LICENSE) © koinzhang
