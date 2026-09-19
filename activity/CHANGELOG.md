# Changelog

All notable changes to `@koinzhang/paseo-plugin-activity` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Coding vs chat agent classification based on file-mutating operations (file writes/edits and shell commands that write to disk).

### Changed

- Restored Top provider and reordered insights rows.
- Heatmap cells outside the focused month are dimmed via opacity.
- Tightened heading sizes and section spacing.

### Fixed

- Heatmap keeps its 52-week layout for Today / 7D / 30D ranges.
- Heatmap title renamed from Tool activity to Activity.
- Hardened heatmap color mixing and month focus styling.

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
