# Changelog

All notable changes to `@koinzhang/paseo-plugin-customize` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Requires Paseo **>= 0.9.0**.

### Added

- Customize board (sidebar navigation item + Command Center): instructions, rules, skills, and MCP servers per provider (Claude, Codex, Cursor, Copilot, OpenCode, Pi, Oh My Pi) and project, split into project and user scope.
- Discovery status per entry (auto / conditional / manual only / needs approval / disabled / not loaded) with the frontmatter or config reason.
- Bottom preview pane with open, reveal, and copy path; MCP previews redact secrets.
