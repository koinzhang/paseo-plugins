# Activity

Activity for Paseo: local usage analytics **and** workspace agent management.

It still answers “how am I using Paseo” (tools, messages, models, habits). With the Explorer **Workspace Activity** panel it also becomes a **vertical ops surface** for the agents in the current workspace — sort, filter, search, open, archive — with live attention cues, open terminals, KPIs, and top skills / MCP.

| Scope | Role |
|---|---|
| **Global** | Cross-workspace habits: heatmap, provider filter, insights, most-used skills / MCP / models |
| **Workspace** | Per-workspace agent fleet: ranked list + display prefs + archive; live status (permission / finished / error / running); open Terminals; shell / file / messages KPIs; times via shared `FormattedTime` |
| **Agent** | Current session: dense tool KPIs, Skills / MCP header toggle, SKILL.md reader, composer Activity pill; **Needs attention** pill jumps to other same-workspace finished/permission/error sessions |

Architecture notes: [docs/architecture.md](./docs/architecture.md).

## What is counted

Ingests every agent's Paseo timeline into a local SQLite database. Queries read that database; the timeline and `agents.list` are ingestion / backfill / live-status sources only.

| Dimension | What is counted |
|---|---|
| Tools | Skill / MCP / shell / file calls; skills classified into exact / inferred / low confidence tiers |
| Agents | Every created agent (registry with archive metadata) |
| Messages | User-sent messages |
| Models | Model at send time (weighted by messages; global view) |

## Where it shows up

- **Sidebar Activity** — global view by provider (heatmap, KPIs, insights, most used)
- **Explorer → Activity** — workspace agents as a management list (search / sort / group / status / lifecycle / archive), live attention (permission badge, status colors, running spinner; directory push + 15s poll), open Terminals (list / preview / close), plus workspace KPIs and top skills / MCP (toggle hidden when only one kind has data); usage queries get a best-effort refresh hint when agents leave running
- **Agent workspace panel** — per-agent tool detail (dense KPI including messages / Skills / MCP toggle / SKILL.md); refreshes on timeline turn terminal events
- **Composer pills** — Activity: current agent's skill / MCP summary (hidden when empty); **Needs attention**: other same-workspace agents with finished / permission / error (hidden when none; click opens shared list)
- **Command Center** — Activity · Workspace Activity · Agent Activity

## Data

Everything lives on the daemon machine in `~/.paseo/plugin-data/activity/` (SQLite `usage.db`). Nothing is sent anywhere.

## Install

Requires Paseo >= 0.8.0.

From Git (Paseo 0.8 and later):

```bash
paseo plugin add koinzhang/paseo-plugins --path activity
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

- Analytics and the agent registry are local to each daemon: every machine keeps its own database, and there is no cross-host aggregation.
- Numbers are reconstructed from the Paseo timeline; items that do not report a model or skill cannot be attributed for that dimension.
- Skill classification is heuristic (exact / inferred / low confidence); check the tier before trusting a count.
- Workspace Activity focuses on agent operations for the current workspace; heatmap / provider / model breakdowns stay on the global sidebar.

## Development

```bash
npm install
npm run typecheck
npm test
```

This plugin is spec-driven: read [specs/README.md](./specs/README.md) before coding, then the matching numbered directory.

## Publish

Release history: [CHANGELOG.md](./CHANGELOG.md) (current **0.3.0**). npm releases go through a GitHub Release tag `activity-vX.Y.Z` (not push-to-`main` alone). Steps: [CONTRIBUTING.md § Publishing to npm](../CONTRIBUTING.md#publishing-to-npm).

## License

[MIT](../LICENSE) © koinzhang
