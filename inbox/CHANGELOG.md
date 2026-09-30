# Changelog

All notable changes to `@koinzhang/paseo-plugin-inbox` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Each workspace header has an Inbox icon that opens that workspace's Inbox in the Explorer, and hides while the panel is open.
- A starred agent's detail shows its latest user prompt and agent reply from the host timeline.
- Inbox sidebar surface with Agents / Notes / Scratch groups, project filter, and search.
- Star the current agent from the Command Center; starred agents survive archiving and can be unarchived from the Inbox (restoring an archived workspace first).
- `/inbox <text>` slash command and Quick note command for scratch capture.
- `/inbox` with no text adds the current agent to the Inbox.
- Starred agents show their live status (Running, Finished, Needs permission, Error, Idle); archived agents no longer offer Open, and the agent actions read `Open` / `Remove`.
- `/inbox -w` / `--workspace` stars the agent or saves scratch into the current workspace's Inbox.
- Empty notes are never kept: a new note is saved only once it has a title or text, and a note left empty is removed.
- Items grouped by project: git remote URL, falling back to the repository root path.
