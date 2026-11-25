# Changelog

All notable changes to `@koinzhang/paseo-plugin-inbox` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Requires Paseo **>= 0.17.4**.

### Added

- Add note-row Pin / Copy / Send / Delete and agent-row Open / Pin / Remove actions, revealed on hover on web / desktop and fixed on mobile. Copy uses the host clipboard; Send inserts the current editor body into the focused agent's composer without replacing the existing prompt or starting a turn.
- Replace archived agent rows' Open action with the detail page's Unarchive flow, sharing restore status, success feedback, and state refresh.
- Add an Agents / Notes multi-select filter, defaulting to both; detail actions share the list's borderless icon-and-divider treatment.
- Show full edit times for workspace notes and host update times for workspace agents, with a starred-time fallback; detail headings truncate to one line and agent replies use the SDK Markdown renderer.

### Changed

- Remove scratch as a separate type: `/inbox <text>` saves a note directly, the Scratch filter and Convert action are gone, and stored scratch entries migrate to notes without losing their content or tags.
- Remove detail action borders and agent message boxes; notes remain borderless with a title/body separator.
- Advance note update time only for actual title or body edits, not pin, tag, or identical-content saves; remove the New note button's green primary styling.
- Keep desktop row action disabled states independent of hover so moving onto the icons does not recreate their pointer targets.
- Move global Project / Workspace scope chips into the search-bar Filter menu alongside Agents / Notes. All scopes support multi-selection, default to all available tags, and leave untagged items visible; selections, counts, archived labels, and persistence remain.
- Open the first item when entering the global Inbox without a selection. Desktop row actions reserve title width only while visible; restore horizontal list / detail resizing and use the Explorer surface background for workspace panels.
- Use single-document FileText icons for notes and FilePlus2 for note creation instead of notebook-style icons.
- Use a PanelsTopLeft icon for Workspace tags instead of the Git branch symbol; Project keeps its Folder icon.
- Remove the full-width divider between the search toolbar and the note / agent list; keep the inset separators between items.
- Pin the plugin SDK, daemon client, and protocol development dependency to 0.17.4; workspace recovery now uses that client's terminal-response waiting behavior.
- Refresh connected clients after Inbox writes through the SDK's subscription API. Events contain only an invalidation signal; clients re-read current data after subscribing or reconnecting. Slow clients coalesce notifications without blocking writes, and cleanup releases subscriptions and retries.
- Remove the deprecated workspace panel context registration and use host-scoped workspace references for cached panel lookup. Keep archived/missing handling, project keys, saved tabs, and the SQLite table unchanged.

## [0.2.0] - 2026-11-05

Requires Paseo **>= 0.15.0**.

### Changed

- Align with Paseo 0.15: the Inbox page is a screen with a sidebar header row (replacing the deprecated `addSurface` / `addSidebarItem`), the Command Center items open it through `openScreen`, the daemon connection uses `@getpaseo/client@0.15.1`, and UI components import from `@getpaseo/plugin/client/ui`.

## [0.1.0] - 2026-09-30

Requires Paseo **>= 0.9.0**.

### Added

- Each workspace header has an Inbox icon that opens that workspace's Inbox in the Explorer, and hides while the panel is open.
- A starred agent's detail shows its latest user prompt and agent reply from the host timeline.
- Inbox sidebar surface with Agents / Notes / Scratch groups, project filter, and search.
- Star the current agent from the Command Center; starred agents survive archiving and can be unarchived from the Inbox (restoring an archived workspace first).
- `/inbox <text>` slash command and Quick note command for scratch capture.
- `/inbox` with no text adds the current agent to the Inbox.
- Starred agents show their live status (Running, Finished, Needs permission, Error, Idle); archived agents no longer offer Open, and the agent actions read `Open` / `Remove`.
- Notes and scratch can be tagged with a project and a workspace; a workspace must belong to the tagged project.
- The Explorer's workspace Inbox shows the items tagged with that workspace or only with its project, and everything in it is on the Inbox page.
- Tags of archived projects and workspaces are struck through; their items are no longer hidden.
- Empty notes are never kept: a new note is saved only once it has a title or text, and a note left empty is removed.
- Items grouped by project: git remote URL, falling back to the repository root path.

[Unreleased]: https://github.com/koinzhang/paseo-plugins/compare/inbox-v0.2.0...HEAD
[0.2.0]: https://github.com/koinzhang/paseo-plugins/releases/tag/inbox-v0.2.0
[0.1.0]: https://github.com/koinzhang/paseo-plugins/releases/tag/inbox-v0.1.0
