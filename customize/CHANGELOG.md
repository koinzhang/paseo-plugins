# Changelog

All notable changes to `@koinzhang/paseo-plugin-customize` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-09-28

Requires Paseo **>= 0.9.0**.

### Added

- Entries can switch between the list and a responsive card grid with the button to the right of the search field. Cards show the same name, status, description, path/reason, token estimate, and Agent Plugins badge, reflow from one to three columns with the panel width, and open the same preview. The view choice is saved with Provider and Project.
- Every provider with a detected version shows it with a `v` prefix between the compatibility icon and the Provider picker, on every category. The version comes from the host provider diagnostic first, then a fallback probe of the provider's local CLI — standard semver, product-prefixed and parenthesized output, and Cursor's date build are understood; missing versions and probe failures hide the area. It refreshes with each scan and persists in the saved snapshot.
- OpenCode v2 skills with `metadata.opencode/autoinvoke: false` (boolean or string `"false"`) show as Manual only: hidden from the model's available list, but still explicitly loadable by ID. The version is detected from the host diagnostic first, then `opencode --version` on the daemon's PATH; an unknown version leaves flagged skills awaiting confirmation, and v1 ignores the field. The mechanism note explains the matching v1/v2 behavior.
- The Provider picker groups Built-in providers above ACP ones, sorted by name within each group and separated by a divider.
- Every Instructions, Rules, Skills, Commands, Subagents, and Plugins row now shows an estimated token count after the status pill. The estimate uses a script-aware heuristic (`ceil(ascii / 4 + cjk * 1.05 + otherNonAsciiBytes / 3)`), calibrated against GPT's `o200k_base` on local Chinese `AGENTS.md` files and a 2168-file corpus (about 10% mean error). Instructions and Rules show one always-on number; Skills, Commands, and Subagents show the advertised metadata (`≈114 tok`) plus the body that arrives on invoke (`+1.2k on invoke`); plugin rows recursively sum their bundled component prompts with the same split. MCP is not counted, because a server's real context cost is its `tools/list` payload rather than anything on disk. Counts are cached by path + mtime + size and persisted with the scan snapshot.

### Fixed

- The Command Center item is titled **Customize** again; the `/customize` slash command keeps its "Open Customize" description.
- The Provider picker keeps the Built-in / ACP badge flush right by rendering the selected check before it, matching the host menu order.
- The category toolbar splits into two rows before either section wraps internally; tabs then wrap within their own row and the search field can shrink to its 180 px minimum.
- The preview copy icon matches the Open and Reveal icons in the same row (the 24×24 hit area and tooltip are unchanged).
- Scrolled entries keep a gap below the fixed toolbar instead of touching it.

### Changed

- The Rescan icon in the toolbar now matches the search, chevron, and mechanism icons at 14 px.
- Entry icons in list rows and cards are 14 px and centered with the title; the view toggle no longer shows a hover tooltip.

[0.3.0]: https://github.com/koinzhang/paseo-plugins/releases/tag/customize-v0.3.0

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
