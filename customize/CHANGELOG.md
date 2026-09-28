# Changelog

All notable changes to `@koinzhang/paseo-plugin-customize` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Every Instructions, Rules, Skills, Commands, Subagents, and Plugins row now shows an estimated token count (`≈1.2k tok`) after the status pill. The estimate uses a script-aware heuristic (`ceil(ascii / 4 + cjk / 1.5 + otherNonAsciiBytes / 3)`) over the entry's own content, and plugin rows recursively sum their bundled component prompts. MCP is not counted, because a server's real context cost is its `tools/list` payload rather than anything on disk. Counts are cached by path + mtime + size and persisted with the scan snapshot.

## [0.2.1] - 2026-09-28

Requires Paseo **>= 0.9.0**.

### Fixed

- The board no longer shifts sideways when the entry list grows past one page: the list scrollbar is hidden, the provider/project controls stay pinned at the top, and only the entry list scrolls.
- The search field shows focus on its outer border only, without the inner outline.

### Changed

- Category tabs, the Skills invocation filter, and search now share one top toolbar.
- The loading-mechanism note became an inline toolbar dropdown; it opens as an overlay and no longer takes a row of its own.

[0.2.1]: https://github.com/koinzhang/paseo-plugins/releases/tag/customize-v0.2.1

## [0.2.0] - 2026-09-28

Requires Paseo **>= 0.9.0**.

### Added

- Skills list can switch between all skills, automatic skills (auto and conditional), and manual-only skills.

### Fixed

- Switching providers keeps the current category when the next provider supports it; otherwise it selects that provider’s first available category. Switching projects also keeps the current category.

## [0.1.0] - 2026-09-25

Requires Paseo **>= 0.9.0**.

### Added

- Customize board (sidebar navigation item + Command Center): instructions, rules, skills, MCP servers, commands, subagents, and plugins for supported providers and projects, split into project and user scope.
- `/customize` command opens the board from an agent composer and selects its provider and workspace project when available.
- Provider picker lists enabled, supported Paseo providers and identifies Built-in and ACP providers; provider and project choices persist on the host.
- Discovery status per entry (auto / conditional / manual only / needs approval / disabled / not loaded) with the frontmatter or config reason.
- Bottom preview pane with open, reveal, and copy path; MCP previews redact secrets.
- Provider-specific loading notes, category visibility, and skill-directory compatibility status, including Cursor and OpenCode switches.
- Agent Plugins manifest version badge, with unverified labeling for future schema versions, and Cursor local test-plugin discovery.
- Private, persistent scan snapshots with a last-scan tooltip, background refresh after 10 minutes, and retry after failures.
- Skill aliases that resolve to the same file appear once, while distinct files with the same name remain separate.

[0.2.0]: https://github.com/koinzhang/paseo-plugins/releases/tag/customize-v0.2.0
[0.1.0]: https://www.npmjs.com/package/@koinzhang/paseo-plugin-customize/v/0.1.0
