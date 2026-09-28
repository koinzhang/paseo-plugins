# Customize

One board that scans local agent configuration for a project: **instructions** (AGENTS.md, CLAUDE.md …), **rules**, **skills**, **MCP servers**, **commands**, **subagents**, and **plugins** at project and user level.

Requires Paseo >= 0.9.0.

## What you get

- A **Customize** item in the sidebar's top navigation (next to New workspace, History, Search, Schedules) and in the Command Center opens the board.
- Submit `/customize` in an agent composer to open the board. It selects the agent's Provider and workspace Project when available, updating each independently and keeping the current selection for any unavailable value.
- Top-right **Provider** and **Project** pickers. The Provider menu lists enabled Paseo providers that Customize can scan, including Cursor, Cline, CodeBuddy Code, Gemini CLI, Goose, Grok Build, Kilo Code, Kiro CLI, Kimi Code, Qwen Code, and TraeCode CLI. It groups Built-in providers above ACP ones, each group sorted by name and separated by a divider, and marks each option as Built-in or ACP. Choices persist on the Paseo host; before a project is chosen, it defaults to the workspace you were last on. The Project menu lists every Paseo project.
- Tabs for Instructions / Rules / Skills / MCP / Commands / Subagents / Plugins. Each tab starts with a "how it loads" note for that provider and then **Project** and **User** sections grouped by source directory.
- On Skills, a switch beside search shows all skills, automatic skills (Auto and Conditional), or manual-only skills. Disabled and not-loaded skills stay under All. The choice stays on the page and is not saved with Provider or Project.
- Entries can be shown as a list or as a responsive card grid. The toggle to the right of the search field switches views (grid icon = card view, list icon = list view). Cards carry the same name, status, description, path/reason, token estimate, and Agent Plugins badge, reflow from one to three columns with the panel width, and open the same preview pane. The choice is saved on the Paseo host together with Provider and Project.
- A link icon to the left of Provider marks agents that search shared skill directories; providers without compatibility support show no icon. Cursor's icon follows its local `thirdPartyExtensibilityEnabled` IDE setting; OpenCode's follows its external-skill environment flags. The icon and skill explanation update on the next scan when those settings change.
- Every provider with a detected version shows it with a `v` prefix to the left of Provider, between the compatibility icon (when present) and the picker. Versions come from the host diagnostic first, then a local CLI fallback; missing versions and probe/parse failures hide the version area entirely. Version metadata refreshes with each scan and persists in the saved snapshot. Compact layouts keep the compatibility icon, version, and Provider together while the remaining controls can wrap.
- A skill reachable through several symlinked roots appears once. Customize prefers the provider's native path, then `.agents/skills`, then another path. Same-name skills backed by different files remain separate.
- OpenCode v2 skills with `metadata.opencode/autoinvoke: false` (boolean or string `"false"`) show as Manual only: hidden from the model's available list, but still explicitly loadable by ID. Customize detects the version from the host's provider diagnostic first, then falls back to `opencode --version` on the daemon's PATH. The mechanism note explains the matching v1/v2 behavior; an unknown version leaves flagged skills awaiting confirmation. v1 ignores this field. OpenCode ignores other agents' `disable-model-invocation`; skill deny permissions still hide and block loading (v1 `permission.skill`, v2 `permissions[]`).
- Each row shows name, description, directory, and a status:

| Status | Meaning |
|---|---|
| Auto | Loaded / offered to the model without you doing anything |
| Conditional | Loaded when a glob, nested directory, or the agent's judgement matches |
| Manual only | Only when you invoke it (`/name`, `@rule`, `disable-model-invocation`, `allow_implicit_invocation: false` …) |
| Needs approval | Found, but the provider asks before using it (e.g. unapproved `.mcp.json` servers) |
| Disabled | Explicitly turned off in config (`enabled = false`, `skillOverrides: off`, `disabledMcpServers` …) |
| Not loaded | Present but ignored (shadowed by a higher-priority file, untrusted project, off by default) |

The reason (the exact frontmatter key or config setting) is shown next to the status.

- Each row shows an estimated token count after the status pill for Instructions, Rules, Skills, Commands, Subagents, and Plugins. The estimate is a script-aware heuristic — `ceil(ascii / 4 + cjk * 1.05 + otherNonAsciiBytes / 3)` — calibrated against GPT's `o200k_base` on local Chinese `AGENTS.md` files and a 2168-file corpus (about 10% mean error; Claude-family tokenizers run another 10–20% denser on CJK). Instructions and Rules show one number (`≈1.2k tok`) because they are always on. Skills, Commands, and Subagents show two: the advertised `name` + `description` that is always in context (`≈114 tok`) plus the body that arrives when the entry is invoked (`+1.2k on invoke`); manual-only entries show the invoke segment alone, and disabled or not-loaded entries show none. Plugin rows recursively sum the prompt files (`.md` / `.markdown` / `.mdc` / `.rules` / `.txt`) under the package's `skills`, `commands`, `agents`, `rules`, and `instructions` directories with the same split; manifests, code, and `node_modules` are not counted. **MCP is not counted**, because a server's real cost is its `tools/list` payload, which cannot be read from a config file. Counts are cached by path + mtime + size and persisted with the scan snapshot.

- Click a row for a preview pane at the bottom (first 64 KiB / 400 lines) with **Open**, **Reveal**, and **Copy path**. MCP previews mask `env` / `headers` values and secret-looking arguments.

Scanning is read-only. Preview and open only accept paths returned by a scan.
The list is disk evidence, not a live CLI inventory. Trust, plugin enablement, command-line flags, and newer CLI versions may change what a running agent uses. An empty category marked "No scanned location" means no verified file location is configured in Customize; it does not mean the provider lacks that capability.

Provider/Project scans are saved as private JSON snapshots in the Paseo host's `plugin-data/customize/` directory (`$PASEO_HOME`, or `~/.paseo` by default). The board shows the saved list after an app or plugin restart; hover over Rescan to see the last scan time. It scans in the background when the snapshot is at least 10 minutes old, a compatibility switch changes, no snapshot exists, or you press Rescan. A failed refresh keeps the last list visible with a retry action. Damaged or incompatible snapshots are ignored. Previews and Open recheck paths from saved snapshots against a current scan.

Plugin rows read the declared specification version from the root `plugin.json` `$schema`. A valid supported manifest shows **Agent Plugins 1.0.0**; a future canonical version shows its declared version with an **unverified** qualifier until Customize supports that schema. The badge does not validate bundled skills or MCP servers, or confirm runtime activation.
For Cursor, the Plugins tab also scans local test packages under `~/.cursor/plugins/local/<plugin-name>`.

Per-provider mechanisms and their sources are recorded in [`specs/001-customize-board/research.md`](./specs/001-customize-board/research.md) and [`specs/003-acp-configurations/research.md`](./specs/003-acp-configurations/research.md).

## Install

```bash
paseo plugin add koinzhang/paseo-plugins --path customize
```

## Development

```bash
cd customize
npm install
npm run typecheck
npm test
paseo plugin install "$PWD"
paseo plugin reload customize
```

Provider scanners live in `server/providers/`; shared helpers (nested directory index, skill discovery, redaction) in `server/scan-kit.ts` and `server/mcp.ts`. The "how it loads" notes are data in `shared/mechanisms.ts`. UI follows the Activity design tokens (`client/design-tokens.ts`); `npm test` rejects raw font / radius / icon literals.
