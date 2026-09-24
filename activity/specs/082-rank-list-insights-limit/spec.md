# 082 — Most used lists match Insights height

## Goal

Keep the Global bottom columns balanced: the right column (Most used skills / MCP / models) is no taller than the Insights column on its left, without dropping items.

## Requirements

- Most used skills, Most used MCP and Most used models list **all** items.
- The list viewport shows at most `insights.length` rows (currently 8); beyond that it scrolls vertically inside the column.
- The scrollbar is hidden by default (`showsVerticalScrollIndicator={false}`).
- Switching the list kind (header cycle button) resets the scroll to the top.
- This supersedes 069's "models list every model, skills / MCP truncated to 8": nothing is truncated any more; all three share the same scrollable height cap.
- Sorting and empty states are unchanged.

## Acceptance

- With more than 8 items, the column is as tall as 8 rows and scrolls to reveal the rest, with no visible scrollbar.
- With 8 or fewer items, the list renders at its natural height with no scrolling.
- `npm run typecheck` and `npm test` pass; the local Activity plugin reloads successfully.
