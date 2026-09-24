# 078 — Global ranking collapse

## Goal

Keep the Global Providers and Projects rankings compact while allowing all results to be viewed.

## Requirements

- Each ranking initially shows at most five rows for its selected metric.
- If more than five rows have a nonzero value, show a right-aligned button below the rows to reveal all remaining rows; a second press collapses back to five. Match the metric switcher's label color (`foregroundMuted`) for the button label and icon.
- Providers and Projects expand independently. Changing the metric keeps the selected metric's sorting and zero-value filtering.
- Provide English and Chinese button labels, including the number of hidden rows when collapsed.
- Preserve the existing provider filter, highlighting, counts, colors, and bar scaling.

## Acceptance

- Five or fewer nonzero rows: all rows are shown and no toggle appears.
- More than five nonzero rows: five rows appear initially; expansion and collapse reveal and hide the rest.
- `npm run typecheck` passes and the local Activity plugin reloads successfully.
