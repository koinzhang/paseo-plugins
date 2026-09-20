# Changelog

All notable changes to `@koinzhang/paseo-plugin-activity` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Temporary:** target Paseo **0.8.0** again (`requirements.paseo >=0.8.0`, SDK `0.8.0`, host-slot-safe directory subscribe) so this checkout can run on 0.8 devices. Revert before publishing another 0.9+ release.

### Added

- Global Activity **Agent creations** histogram: a fixed 30-local-day window of daily bars stacked by provider, with per-provider colours and a hover / focus / click card listing every provider's count for that day plus the date.
- `usage.agent-creations` RPC: daily creation counts with per-provider slices, read from the agent registry alone (no tool-call or message joins).
- `usage.agent-lifetime` now includes still-active agents (`createdAt → now`, marked `· active` in the KPI) instead of archived agents only.
- Directory sync lists archived agents (`includeArchived`) so archive metadata (`archivedAt`) is backfilled for agents archived before or between observations; archived entries are registered but never timeline-scanned.

### Changed

- Global KPI reordered to lead with Top / Longest: Agents, Longest agent, Top provider, Top model, Peak weekday, Longest streak; Insights fixed at 8 rows.
- Agent creations histogram ignores the range chips (always the last 30 local days) and no longer depends on `usage.activity-by-day`.
- `mcpServerColor` renamed to `entityColor`; the same accent-derived stable colour now covers MCP servers and providers.
- KPI values and labels shrink to fit their tile instead of wrapping onto a second line (Global / Workspace / Agent share `UsageStats`); line height is fixed so the label baselines stay aligned.
- Top provider / Top model KPI tiles show the name only (no share), matching the provider-filtered shape; shares stay available from `usage.by-provider`.
- Agent creations bars round only the top segment's top corners — stacked joints and bar bottoms are square.
- Agent creations day bars are a single soft provider-colour gradient (tiny middle shares omitted so they cannot notch the bar; remaining colours blend evenly) instead of hard stacked segments; single-provider days stay solid.
- Global KPI tile 3 and Insights row 3 swapped: `Peak weekday` moved to the KPI (penultimate tile, next to `Longest streak`) and `Workspaces` reads with the volume counts in Insights.
- Agent creations / MCP rank colours use a soft fixed chart palette (light + dark, inferred from `surface0` luminance) instead of accent-hue hashing; known Paseo providers map to stable slots.
- Agent creations stacked segments follow window-wide provider rank (largest series at the bottom on every bar), not each day's local count order.
- Agent creations header no longer shows `N agents · last 30 days` (title is `Agents` only).
- Chart palette: light / dark colour sets swapped (bright fills on light UI, deep fills on dark UI).
- Agent creations colours: branded providers keep brand accents; unbranded catalog providers and any future ACP id fall back to the soft chart palette (no theme `accent` for the window leader).
- Agent creations hover card lists only providers with creations that day (no `: 0` rows); empty days still show the date alone.
- Agent creations day bars use the same theme-accent intensity steps as the Activity heatmap; provider brand colours remain only on the hover card chips.

### Fixed

- Longest-agent metric was understated: agents archived before the plugin could observe them had no `archived_at`, so the tile only ever saw live-hook archives.

## [0.5.0] - 2026-09-20

Requires Paseo **>= 0.9.0-beta.2**.

### Changed

- Pin the plugin SDK to `0.9.0-beta.2` and use independent, API-owned directory observations, shared within each entry/surface API.
- Reconcile all pages on bootstrap/reconnect, replay concurrent updates, retain 15s polling, and release observations after the last consumer unmounts.
- Handle timeline subscription restoration/errors and use SDK cleanup with release error handling.

### Fixed

- Restore real-time workspace and attention updates: beta.2 API listeners do not receive the app's directory observation.
- Read lifecycle and archive state from explicit directory fields. Missing host UI snapshots, directory removals, and Closed no longer synthesize an archive or permanently lock lifecycle state.
- Reflect host archive/unarchive immediately in workspace rows, preserving usage metrics even if an older RPC finishes later.
- Remove the host-cache-to-query effect loop that caused React maximum update depth errors; retain stable workspace query keys.

## [0.4.0] - 2026-09-20

Last release that supports Paseo **0.8.0**. Later versions require Paseo **>= 0.9.0**.

### Added

- Composer **Needs attention** pill (same workspace): one shared entry for other agents with finished / permission / error attention; click always opens the same popover list (Explorer-style rows); icon tint follows aggregate priority.
- Explorer Agents rows show the direct subagent count at the bottom-right of the bot icon when the local registry has children (`parentAgentId`); the count follows the Agents Status filter (Active / Archived / both). Host list also resolves the legacy `paseo.parent-agent-id` label. The running spinner keeps priority on that corner.
- Explorer Agents **Show → Prompt**: optional row meta for the latest user message preview (host timeline; same path as the attention pill).

### Changed

- Attention pill no longer direct-jumps when only one peer needs attention — always popover for finished / permission / error.
- Attention popover row meta shows the latest user message preview (host timeline tail; not stored in usage.db) instead of finished / needs-attention labels.
- Attention pill icon switches with attention kind: `Bell` for permission, `CircleAlert` for error, `CircleCheck` for finished (priority permission > error > finished when mixed).

### Fixed

- Explorer Agents lifecycle **Closed** updates near-real-time via host `useAgent` snapshots (no `list({ subscribe })`); directory `remove` keeps the row as Closed instead of dropping status; missing `workspaceId` on pushes still merges when the agent is already tracked.
- Attention pill icon/list now follow the same `agents.subscribe` in-memory store as visibility (no separate 15s react-query path), so tint updates with pushes; partial directory pushes keep prior permission/attention fields; background polls no longer disable the pill.
- Attention pill row open uses the existing `navigation.openAgent` bridge (registered by Agent / Workspace / Global panels); no `openPanel("usage")` fallback. Preview fetch tries projected then canonical timeline tail.
- Attention pill visibility is synced from the contribute layer (directory + subscribe + 15s poll). Starting at `visible: false` previously unmounted the icon, so the show effect never ran and the pill stayed hidden even when peers needed attention.

## [0.3.0] - 2026-09-19

### Added

- Workspace Activity panel **Terminals** section: lists open terminals via the host SDK (`paseo.terminals.list`), tap-to-expand live output preview (`capture`, latest 8 lines, ANSI stripped, 5s polling), and a per-row close button (`kill`, optimistic removal with rollback toast); terminal cwd collapses the home directory to `~` (new `usage.host-info` RPC); the section is hidden when no terminals are open.
- Explorer Agents rows show a warning badge (ShieldAlert icon, plus a count when there are multiple) when the host reports pending permission requests; those agents also rank first with other attention-worthy agents.
- Explorer Agents row bot icon uses theme status colors for attention: success for finished-but-unread turns, warning for pending permissions (badge kept), danger for failed agents; the icon returns to muted once the host clears attention after viewing.
- Explorer Agents rows show a host-style spinning ring at the bottom-right of the bot icon while `status = "running"`; it disappears when the turn ends.
- Explorer agent status (permission badge, attention colors, running spinner) accelerates from directory `agent_update` pushes (incremental status cache); the 15s poll remains the completeness guarantee and does not call `agents.list({ subscribe })` (avoids stealing the host's single observation slot on Paseo 0.8).
- Agent panel / composer pill usage queries refresh on real timeline turn terminal events (`turn_completed` / `turn_failed` / `turn_canceled` / `replacement`, 300ms debounce + 2s ingest settle); Workspace panel gets a best-effort directory hint when an agent leaves `running` / `initializing`, with the 15s query poll owning completeness. Pill empty-state poll slowed from 1.5s to 5s. Global surface and Terminals keep their existing poll intervals.
- Shared activity time formatting: `FormattedTime` / `formatActivityTime` (app language + locale, 24-hour clock; same-day time only, same-year month/day + time, else include year) used by Agent panel, Workspace rank / Updated meta, and the composer popover.

### Changed

- Agent Activity panel and composer popover: Skills / MCP detail uses the same header toggle icon pattern as Workspace rank (no tab strip).
- Agent Activity panel KPIs use dense `UsageStats` (aligned with Workspace).
- Workspace skills / MCP rank toggle is hidden when only one kind has data.

### Fixed

- Workspace agent status enrichment filters by placement `projectId` (daemon shape), not `projects.list` remote keys — stops the 15s poll from wiping live permission / attention state.
- In-flight status polls are cancelled before applying a newer directory push, so stale responses cannot overwrite live agent state.
- Skill path resolution refreshes empty handles and falls back to home roots when project cwd lookup fails.

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

[Unreleased]: https://github.com/koinzhang/paseo-plugins/compare/activity-v0.5.0...HEAD
[0.5.0]: https://github.com/koinzhang/paseo-plugins/releases/tag/activity-v0.5.0
[0.4.0]: https://github.com/koinzhang/paseo-plugins/releases/tag/activity-v0.4.0
[0.3.0]: https://github.com/koinzhang/paseo-plugins/releases/tag/activity-v0.3.0
[0.2.0]: https://github.com/koinzhang/paseo-plugins/releases/tag/activity-v0.2.0
[0.1.0]: https://github.com/koinzhang/paseo-plugins/releases/tag/activity-v0.1.0
