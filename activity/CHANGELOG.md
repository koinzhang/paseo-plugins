# Changelog

All notable changes to `@koinzhang/paseo-plugin-activity` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Explorer Agents rows show a warning badge (ShieldAlert icon plus count when multiple) when the host reports pending permission requests; these agents also rank first with other attention-worthy agents.
- Explorer Agents row bot icon reflects attention with theme status colors: success (green) for finished-but-unread turns, warning for pending permissions (which keep the warning badge), and danger for failed agents; the icon returns to muted once the host clears attention after viewing.
- Explorer agent status (permission badge, attention icon colors) now refreshes on the host's `agent_update` push (300ms debounce, workspace-filtered) instead of waiting for the 15s poll, which stays as a fallback.
- Workspace Activity panel Terminals section: lists the workspace's open terminals through the host SDK (`paseo.terminals.list`), with a tap-to-expand live output preview (`capture`, latest 8 lines, ANSI stripped, 5s polling) and a per-row close button (`kill`, optimistic removal with rollback toast); terminal cwd collapses the home directory to `~` (new `usage.host-info` RPC); hidden when no terminals are open.

## [0.2.0] - 2026-09-19

### Added

- Heatmap month focus: hovering a month label highlights that month's cells and dims the rest.
- Workspace Activity panel in the Explorer sidebar: workspace-scoped KPIs (shell calls / file reads / file writes / messages), per-agent ranking (new `usage.agents` RPC), and top skills / MCP; the Workspace Activity Command Center item opens it.
- Explorer Agents title search: a header search icon expands an animated inline pill; case-insensitive tokenized match on title (falls back to agent id) that stacks with Status / Lifecycle filters, sort, and grouping; the query is session-only.
- Explorer Agents archive / unarchive row actions: Active rows show Archive (host `agents.ref(id).archive()`), Archived rows show Unarchive (new `usage.agent.unarchive` RPC → `paseo agent reload`), with optimistic list updates, error toast, and the local registry `archived_at` cleared on unarchive.
- Agent panel Messages KPI via `usage.summary.messageCount` (same filter as tools).
- Architecture overview for Global / Workspace / Agent scopes (`docs/architecture.md`).
- Explorer Agents list pager (40 per page); controls hidden when there is only one page.
- Host `agents.list` pagination for Explorer status enrichment and background history sync.

### Changed

- Coding vs chat now counts active agents instead of ops: an agent counts as coding when it has a file write/edit/delete or a mutating shell command; created-only agents are excluded from both buckets.
- Insights rows reordered (calendar → preference → structure); Top provider restored (messages-weighted, All view only) and Tools per message removed.
- Command Center items renamed: Open Activity (all providers) → Activity, Activity → Agent Activity.
- Heatmap title renamed from Tool activity to Activity.
- Smaller headings and tighter section spacing across the global surface and heatmap.
- Explorer Activity panel: header removed (branch / workspace name and Today / 7D / 30D / All chips) so KPIs cover the workspace's full history; denser KPIs (shell / file reads / file writes / messages only); Active agent rows open the conversation from anywhere in the row; agent display menu (floating card below the header icon with hover flyout submenus matching the host sidebar menu; sort by updated / created / name / messages / status with attention-worthy agents first; group by None / Provider / Status; multi-select Status Active / Archived and Lifecycle Idle / Running / Error / Closed; Show toggles for provider / calls / messages / updated; `usage.agents` returns `updatedAt` and `archivedAt`); Command Center item Workspace Activity opens the panel in the Explorer; skills / MCP share one ranked list toggled by the header icon; hidden scrollbars avoid layout shift when filters change.
- Explorer Agents display preferences (Sort / Group / Show / Status / Lifecycle) persist across workspaces, plugin reloads, and daemon restarts in host-scoped `explorer-agent-display` settings; defaults are sort Updated, group None, Status Active, all lifecycles, no extra Show fields.
- Workspace Activity panel split into `client/workspace/` modules; Workspace Messages KPI reads `usage.summary.messageCount`.

### Removed

- Command Center Export activity report item; the `usage.export` RPC stays available.

### Fixed

- Heatmap keeps its 52-week layout for Today / 7D / 30D ranges.
- Hardened heatmap color mixing against invalid theme color values.

## [0.1.0] - 2026-09-19

### Added

- Initial release: local SQLite-backed usage analytics for tools, agents, messages, and models.
- Timeline ingestion with silent historical backfill; queries read the local database only.
- Composer pill, agent workspace panel, and Activity sidebar (global view grouped by provider).
- Heatmap, KPIs, insights, most used models, and a provider filter limited to the top 5.
- Command Center entries: open panels and export a markdown usage report.
- Plugin renamed from `tool-usage` to `activity`, migrating the old data directory automatically.

[Unreleased]: https://github.com/koinzhang/paseo-plugins/compare/activity-v0.2.0...HEAD
[0.2.0]: https://github.com/koinzhang/paseo-plugins/releases/tag/activity-v0.2.0
[0.1.0]: https://github.com/koinzhang/paseo-plugins/releases/tag/activity-v0.1.0
