# Changelog

All notable changes to `@koinzhang/paseo-plugin-customize` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://www.npmjs.com/package/@koinzhang/paseo-plugin-customize/v/0.1.0
