# Inbox

A personal inbox for Paseo: star agents, keep notes per project, and capture scratch text without leaving the composer.

- **Starred agents**: ⌘K → *Add agent to Inbox*. A starred agent stays in the Inbox after it is archived; *Unarchive* restores it, restoring its archived workspace first when needed. Its detail shows the latest user prompt and the latest agent reply.
- **Notes**: ⌘K → *New Inbox note*, or *+ Note* in the Inbox. Autosaved plain text / Markdown.
- **Scratch**: type `/inbox <text>` in an agent composer. It is tagged with the current project. Nothing is sent to the agent. Convert scratch to a note later.
- **Star from the composer**: type `/inbox` with no text to add the current agent to the Inbox.
- **Tags**: every item can carry a project tag and a workspace tag. On a note or scratch, tap the tags in its detail to change them. A workspace must belong to the tagged project: while a workspace is set, other projects are unavailable, and picking a workspace alone sets its project. A starred agent is tagged with its own workspace and project.
- **Workspace Inbox**: the *Inbox* panel in the right-hand Explorer shows items tagged with that workspace, plus items tagged only with its project. It is a filtered view of the one Inbox, so everything in it is also on the Inbox page. A note added in the panel is tagged with that workspace. An Inbox icon in the workspace header opens it, and hides while the panel is open. The note and add-agent buttons sit to the right of search. Workspace and project chips on the Inbox page appear only on the *Agents* tab; tap one to narrow the agents, tap again to clear. The choice is kept when you leave Agents and applied again when you come back.
- **Archived projects and workspaces**: their items stay in the Inbox; their tags and chips are struck through, and the strike goes away when they are restored.
- **Sorting**: the button next to *+ Note* on the Inbox page cycles through updated time (default), starred time, created time, and name. Drag the divider to resize the list. Pinned items stay on top.
- **Projects**: items are grouped by the git remote URL (`origin`, else the first remote), falling back to the repository root, then the directory. Worktrees of one repository share a project.
- **Hosts**: data lives on each daemon in `~/.paseo/plugin-data/inbox/inbox.db`. With several hosts connected, the Inbox host picker switches between them.

Requires Paseo >= 0.9.0 and a daemon Node runtime with `node:sqlite`.

## Install

```bash
paseo plugin add npm:@koinzhang/paseo-plugin-inbox
```

To install from GitHub, use `paseo plugin add koinzhang/paseo-plugins --path inbox`.

## Development

```bash
npm install
npm run typecheck
npm test
paseo plugin install "$PWD"
paseo plugin reload inbox
```

Specs: [`specs/`](./specs/).
