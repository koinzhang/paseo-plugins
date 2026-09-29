# Inbox

A personal inbox for Paseo: star agents, keep notes per project, and capture scratch text without leaving the composer.

- **Starred agents**: ⌘K → *Add agent to Inbox*. A starred agent stays in the Inbox after it is archived; *Unarchive* restores it, restoring its archived workspace first when needed. Its detail shows the latest user prompt and the latest agent reply.
- **Notes**: ⌘K → *New Inbox note*, or *+ Note* in the Inbox. Autosaved plain text / Markdown.
- **Scratch**: type `/inbox <text>` in an agent composer. Nothing is sent to the agent. Convert scratch to a note later.
- **Star from the composer**: type `/inbox` with no text to add the current agent to the Inbox.
- **Current workspace**: add `-w` (or `--workspace`) to save into this workspace's Inbox instead: `/inbox -w` stars the agent there, `/inbox -w <text>` saves scratch there. Use `--` before text that starts with `-w`.
- **Workspace Inbox**: the *Inbox* panel in the right-hand Explorer keeps agents and notes for that workspace only (*+ Note*, *+ Agent*). The Inbox page shows everything by default; on the *Agents* tab, tap a workspace chip to see only that workspace's agents, tap again to clear. Items of archived workspaces are hidden from the Inbox page, not deleted, and come back when the workspace is restored.
- **Sorting**: the button next to *+ Note* on the Inbox page cycles through updated time (default), starred time, created time, and name. Drag the divider to resize the list. Pinned items stay on top.
- **Projects**: items are grouped by the git remote URL (`origin`, else the first remote), falling back to the repository root, then the directory. Worktrees of one repository share a project.
- **Hosts**: data lives on each daemon in `~/.paseo/plugin-data/inbox/inbox.db`. With several hosts connected, the Inbox host picker switches between them.

Requires Paseo >= 0.9.0 and a daemon Node runtime with `node:sqlite`.

## Development

```bash
npm install
npm run typecheck
npm test
paseo plugin install "$PWD"
paseo plugin reload inbox
```

Specs: [`specs/`](./specs/).
