# Changelog

All notable changes to `@koinzhang/paseo-plugin-activity` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Heatmap month focus: hovering a month label highlights that month's cells and dims the rest.
- Activity panel in the Explorer sidebar: workspace-scoped KPIs, per-agent ranking (new `usage.agents` RPC), and top skills / MCP.

### Changed

- Coding vs chat now counts active agents instead of ops: an agent counts as coding when it has a file write/edit/delete or a mutating shell command; created-only agents are excluded from both buckets.
- Insights rows reordered (calendar → preference → structure); Top provider restored (messages-weighted, All view only) and Tools per message removed.
- Command Center items renamed: Open Activity (all providers) → All Activity, Activity → Current Activity.
- Heatmap title renamed from Tool activity to Activity.
- Smaller headings and tighter section spacing across the global surface and heatmap.
- Explorer Activity panel: title, workspace name, and range chips share one row; denser KPIs; Active / Archived agent filter (`usage.agents` now returns `archivedAt`).

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

[Unreleased]: https://github.com/koinzhang/paseo-plugins/compare/activity-v0.1.0...HEAD
[0.1.0]: https://github.com/koinzhang/paseo-plugins/releases/tag/activity-v0.1.0
