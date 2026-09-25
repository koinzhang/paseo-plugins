# Skill aliases and third-party compatibility

## Goal

Customize should show each physical skill file once even when several provider search roots are symlinks to it. The provider header should indicate whether it reads skill directories shared with other agents. Cursor and OpenCode explanations must reflect their effective compatibility switches.

## Requirements

- Group skill records by the resolved physical `SKILL.md` path. Keep distinct physical files even when their frontmatter names match. Never group non-skill entries.
- Pick one display path deterministically: a provider-native root, then `.agents/skills`, then other roots. For a tie, prefer an enabled discovery route, then project scope, then lexical path. An enabled alias must keep a merged record enabled even if the preferred display route is disabled.
- Expose compatibility support and effective on/off/unknown state in scan results. Show a leading icon beside Provider only when the scan result contains compatibility support; hide it when compatibility is null. Distinguish off and unknown states in the icon's accessible label and visual style.
- Read Cursor's macOS `cursor/thirdPartyExtensibilityEnabled` from its local state database. The default is on when the key is absent. If the database cannot be read, report unknown rather than claim on. Third-party skill records are disabled when the switch is off; native `.cursor` and common `.agents` roots stay visible.
- OpenCode scans external `.claude` and `.agents` skills by default. Respect `OPENCODE_DISABLE_EXTERNAL_SKILLS`, including its legacy Claude disable cascade, and show those records disabled when the external scan is off. Native `.opencode` skills stay available.
- In the installed OpenCode 1.18.x line, discovered and permitted skills are automatically advertised to the model; it has no per-skill manual-only discovery switch. Ignore `disable-model-invocation` when computing OpenCode status. Loading the skill body through the `skill` tool remains on demand. Explicit `permission.skill: deny` and disabled external roots remain separate access/discovery gates.
- “How it loads” describes the current Cursor/OpenCode state and lists active locations without claiming off roots load. This applies to skills and other categories where the switch affects discovery.
- Preserve the existing scan cache behavior, preview access, and localized English/Chinese UI.

## Boundaries

The Cursor IDE database is an IDE preference. The Cursor CLI may receive an independent value from its host; Customize cannot prove the live agent's in-memory state. OpenCode environment variables are read from the Paseo plugin process and may differ from a separately launched agent process.
