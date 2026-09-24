# 082 — Most used lists match Insights length

## Goal

Keep the Global bottom columns visually balanced: the right column (Most used skills / MCP / models) shows at most as many rows as the Insights column on its left.

## Requirements

- Most used skills, Most used MCP and Most used models all cap at `insights.length` rows (currently 8).
- This supersedes 069's "Most used models lists every model"; models are now truncated like skills and MCP.
- Sorting, empty states and the header cycle button are unchanged.

## Acceptance

- With more than 8 models, only the top 8 appear; skills and MCP remain capped at 8.
- `npm run typecheck` and `npm test` pass; the local Activity plugin reloads successfully.
