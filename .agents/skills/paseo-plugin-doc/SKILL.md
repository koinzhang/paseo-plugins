---
name: paseo-plugin-doc
description: >-
  Official Paseo plugin documentation (quickstart, reference, publishing,
  providers). Use when creating, editing, installing, reloading, publishing, or
  troubleshooting a Paseo plugin; adding surfaces, sidebar items, workspace
  panels, Command Center items, slash commands, composer pills, timeline items,
  themes, attachment sources, RPCs, lifecycle/before hooks, or a provider
  plugin; or when plugin API / CLI / source contracts are needed.
---

# Paseo plugin docs

Trusted local copy of the official Paseo plugin docs. **Read the matching
reference before changing plugin code.** Prefer these files over memory or
stale web fetches when they cover the topic.

Complete the user's plugin request directly. Do not send them away to read the
docs instead of doing the work.

## How to use this skill

1. Identify the contribution or lifecycle task from the request.
2. Open the linked file below (progressive disclosure — do not load every
   reference up front).
3. Follow the contracts and examples in that file.
4. After edits: `npm run typecheck`, then `paseo plugin reload <id>` (or
   install if new).

## Doc map

| Need | Read |
| --- | --- |
| Scaffold, install, reload, first panel | [references/quickstart.md](references/quickstart.md) |
| Manifest, client/server boundaries, entries | [references/reference-project.md](references/reference-project.md) |
| Lifecycle / before hooks | [references/reference-lifecycle.md](references/reference-lifecycle.md) |
| Surfaces, sidebar, Host UI (modal, toast, scroll) | [references/reference-ui.md](references/reference-ui.md) |
| Timeline transform / render / daemon append | [references/reference-timeline.md](references/reference-timeline.md) |
| Theme tokens, contribute theme, settings UI | [references/reference-theme.md](references/reference-theme.md) |
| Workspace / agent panels | [references/reference-panels.md](references/reference-panels.md) |
| Command Center, slash, header button, composer pill | [references/reference-commands.md](references/reference-commands.md) |
| `paseo` SDK, `defineRpc`, logs, attachment source | [references/reference-sdk-rpc.md](references/reference-sdk-rpc.md) |
| Plugin sources, CLI, load failures | [references/reference-ops.md](references/reference-ops.md) |
| Full reference TOC | [references/reference.md](references/reference.md) |
| Direct / ACP provider plugin | [references/providers.md](references/providers.md) |
| Publish npm / Git / private registry | [references/publishing.md](references/publishing.md) |

## Contribution cheat sheet

| Contribution | Registration | Detail |
| --- | --- | --- |
| Sidebar surface | `addSurface` + `addSidebarItem` | reference-ui.md |
| Workspace panel | `addWorkspacePanel` | reference-panels.md |
| Command Center | `addCommandCenterItem` | reference-commands.md |
| Slash command | `addSlashCommand` | reference-commands.md |
| Composer pill | `addComposerPill` | reference-commands.md |
| Timeline | `addTimelineTransformer` / `addTimelineRenderer` / `timeline.append` | reference-timeline.md |
| Theme | `addTheme` | reference-theme.md |
| Attachment source | `addAttachmentSource` + `server.handle` | reference-sdk-rpc.md |
| Plugin RPC | `defineRpc` + `server.handle` + `useRpc` | reference-sdk-rpc.md |
| Lifecycle / before | `server.on` / `server.before` | reference-lifecycle.md |
| Provider | `server.registerProvider` / `runAcpProvider` | providers.md + reference-project.md § Providers |

## Hard rules (from the docs)

- Plugin code is **trusted and unsandboxed**. Confirm before enabling plugins or installing untrusted sources.
- Directory layout is the compile boundary: `client/` → app, `server/` → daemon, `shared/` → both. No other root code modules; no cross-imports; no `node:` from client.
- Client UI: React Native primitives only; color from `theme.colors`; spacing from `layout.compact`. Browser APIs only in `client/web.ts` behind `Platform.OS`.
- Icons are Lucide **name strings**, not `lucide-react-native` imports.
- Each runtime entry default-exports one `contribute(...)` and returns cleanup.
- Source changes apply only after `paseo plugin reload <id>` (or reinstall).
- Keep `paseo-plugin.json` `requirements.paseo` accurate (`>=0.8.0` style). Omitted means `<0.8.0` and is rejected on modern hosts.

## Common commands

```bash
paseo plugin init /absolute/path/to/my-plugin
cd /absolute/path/to/my-plugin && npm install
npm run typecheck
paseo plugin install /absolute/path/to/my-plugin
paseo plugin ls
paseo plugin reload <plugin-id>
paseo plugin logs <plugin-id>
paseo plugin update <plugin-id>   # or --all / --check / --yes
```

Install sources also accept `npm:<pkg>`, `github:owner/repo`, `git:<url>`, and
`owner/repo:subdir` — see reference-ops.md.

## When docs disagree

These bundled files are the skill source of truth for plugin contracts. If the
user points at a newer deployed doc or a checkout of `public-docs/`, prefer that
newer source for the disputed section, then keep working from this skill for
everything else.
