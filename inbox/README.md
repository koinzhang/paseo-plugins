# Inbox

A personal inbox for Paseo: star agents and keep notes per project without leaving the composer.

- **Starred agents**: ⌘K → *Add agent to Inbox*. A starred agent stays in the Inbox after it is archived; *Unarchive* restores it, restoring its archived workspace first when needed. Its detail shows the latest user prompt as text and the latest agent reply through Paseo's Markdown renderer.
- **Notes**: ⌘K → *New Inbox note*, or *+ Note* in the Inbox. Autosaved plain text / Markdown.
- **Copy or reuse a note**: every note row has Copy and Send icons. Copy puts its exact body on the clipboard. Send inserts the body into the focused agent's composer, preserving the existing prompt, then focuses that input; it does not send a turn. The Send button is unavailable when no agent is focused.
- **Capture a note**: type `/inbox <text>` in an agent composer. It is saved directly as a note tagged with the current project. Nothing is sent to the agent.
- **Star from the composer**: type `/inbox` with no text to add the current agent to the Inbox.
- **Tags**: every item can carry a project tag and a workspace tag. On a note, tap the tags in its detail to change them. A workspace must belong to the tagged project: while a workspace is set, other projects are unavailable, and picking a workspace alone sets its project. A starred agent is tagged with its own workspace and project.
- **Workspace Inbox**: the *Inbox* panel in the right-hand Explorer shows items tagged with that workspace, plus items tagged only with its project. It is a filtered view of the one Inbox, so everything in it is also on the Inbox page. A note added in the panel is tagged with that workspace. An Inbox icon in the workspace header opens it, and hides while the panel is open. Its transparent surface follows the Explorer background; workspace notes show edit times and agents show their provider and latest activity time.
- **Filters**: the global Filter menu beside search contains independently multi-selectable Agents / Notes, Projects, and Workspaces. Project and Workspace filters start unselected and only narrow the list when selected; items without the corresponding tag remain visible regardless of that filter. The first item opens automatically on an empty global selection.
- **Archived projects and workspaces**: their items stay in the Inbox; their tags and chips are struck through, and the strike goes away when they are restored.
- **Sorting**: the button next to *+ Note* on the Inbox page cycles through updated time (default), starred time, created time, and name. Drag the divider to resize the list. Pinned items stay on top.
- **Projects**: items are grouped by the git remote URL (`origin`, else the first remote), falling back to the repository root, then the directory. Worktrees of one repository share a project.
- **Hosts**: data lives on each daemon in `~/.paseo/plugin-data/inbox/inbox.db`. With several hosts connected, the Inbox host picker switches between them.
- **Live refresh**: writes on one client invalidate the Inbox queries on other connected clients of the same host. Only an invalidation signal is sent, never note contents; each client reads the SQLite-backed RPCs again. A new or reconnected subscription refreshes from current data rather than replaying missed events. An open note updates from remote text only when it has no unsaved local edits; this is not collaborative editing or conflict resolution. Agent status still refreshes every 10 seconds.
- **Row actions**: notes have Pin / Copy / Send / Delete; agents have Open / Pin / Remove from Inbox. Archived agents replace Open with the same Unarchive action as their detail page, including workspace recovery and pending state. Open is disabled for missing agents, and removing a starred agent does not archive or delete it. All row actions appear on hover on web / desktop and stay visible on mobile.
- **Workspace subtitles**: in the workspace panel, notes show their full edit time and date without repeating project tags. Agents show their actual provider (for example, codex or claude) and the host's latest update time and date; if it is unavailable, the subtitle explicitly shows the starred time instead.
- **Note update time**: only an actual title or body change advances a note's edit time. Pinning, unpinning, changing tags, and saving identical content leave it unchanged. Notes use the single-document FileText icon; New note uses FilePlus2 and the same bordered icon style as Star and Sort.
- **Copy and composer insertion**: detail pages place Copy / Send between Pin and Delete, using the current editor body even before autosave. Send inserts into the focused agent's composer without replacing its existing draft or submitting a prompt.
- **Quiet details**: all note and agent actions use the list's borderless icons with separators between every adjacent action, including Delete. Detail headings truncate on one line. Note title and body sit in one borderless editor with a single divider between them.
- **Scope icons**: Project uses Folder and Workspace uses PanelsTopLeft, avoiding the misleading Git branch symbol.
- **List spacing**: the search toolbar flows directly into the list without a full-width divider; inset separators between items remain.
- **List toolbar**: lightweight, borderless icons keep search, filters, and actions compact. Click Search to expand and focus the input; close it with X to clear the query. Both global and workspace lists use the same interaction.
- **Detail metadata**: Project and Workspace chips share one row with the actions; chips shrink and truncate rather than wrap, while the actions stay aligned to the right.
- **List layout**: desktop actions do not consume title width until hover; the measured action width then truncates the title without overlap. The list / detail divider supports horizontal resizing.

Requires Paseo >= 0.17.4 and a daemon Node runtime with `node:sqlite`. The plugin SDK, daemon client, and protocol development dependency are pinned to 0.17.4.

## Install

```bash
paseo plugin add npm:@koinzhang/paseo-plugin-inbox
```

To install from GitHub, use `paseo plugin add github:koinzhang/paseo-plugins:inbox`.

## Development

```bash
npm install
npm run typecheck
npm test
paseo plugin install "$PWD"
paseo plugin reload inbox
```

Specs: [`specs/`](./specs/).
